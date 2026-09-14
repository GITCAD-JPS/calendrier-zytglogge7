// Partage du calendrier entre les téléphones de l'équipe.
//
// Ce module parle directement à Firestore en HTTP, sans bibliothèque : une
// page statique suffit alors à partager le calendrier entre huit appareils,
// sans serveur à tenir, sans compte à créer et sans connexion à demander à
// qui que ce soit.
//
// L'accès repose sur un code long et imprévisible qui fait partie du chemin
// des données. Qui ne l'a pas ne trouve rien, exactement comme un lien privé.
// C'est ce qui convient à une équipe de huit personnes, et il faut le savoir :
// quiconque obtient le code voit le calendrier.

import { CONFIGURATION } from './nuage-configuration.js';

const COLLECTIONS = { matchs: 'matchs', presences: 'presences', joueurs: 'joueurs' };
const CLE_CODE = 'zytglogge7.code.v1';

// Firestore n'offre pas d'écoute temps réel en HTTP simple. Plutôt que de
// relire tout le calendrier sans arrêt, on interroge un minuscule document
// témoin, mis à jour à chaque écriture. Le calendrier n'est relu que lorsqu'il
// change, ce qui laisse le trafic à quelques centaines d'octets tant que
// personne ne touche à rien.
const TEMOIN = 'etat';
const PERIODE = 8000;

let code = null;
let rappels = {};
let etatCourant = 'recherche';
let minuteur = null;
let dernierTemoin = null;
const enAttente = [];

export const etat = () => etatCourant;
export const partageActif = () => Boolean(code);
export const codeConfigure = () => lireCode();
export const configure = () => Boolean(CONFIGURATION.projet && CONFIGURATION.cle);

function changerEtat(valeur) {
  if (etatCourant === valeur) return;
  etatCourant = valeur;
  rappels.onEtat?.(valeur);
}

// --- code d'accès -----------------------------------------------------------

function lireCode() {
  try {
    return localStorage.getItem(CLE_CODE) || '';
  } catch {
    return '';
  }
}

/** Le code vit dans le navigateur : on le saisit une fois par appareil. */
export function enregistrerCode(valeur) {
  const propre = String(valeur || '').trim();
  try {
    if (propre) localStorage.setItem(CLE_CODE, propre);
    else localStorage.removeItem(CLE_CODE);
  } catch { /* la session tiendra quand même */ }
  code = propre || null;
  return code;
}

/** Un code neuf, assez long pour n'être ni deviné ni trouvé par balayage. */
export function inventerCode() {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return [...octets].map((o) => o.toString(36).padStart(2, '0')).join('').slice(0, 24);
}

// --- dialogue avec Firestore ------------------------------------------------

const chemin = (...morceaux) => [
  CONFIGURATION.racine, 'projects', CONFIGURATION.projet, 'databases/(default)/documents',
  'equipes', code, ...morceaux,
].join('/');

const avecCle = (url) => `${url}${url.includes('?') ? '&' : '?'}key=${CONFIGURATION.cle}`;

/**
 * Une fiche voyage comme une seule chaîne JSON.
 *
 * Firestore veut un type déclaré par champ, et traduire une fiche entière
 * serait du code fragile à écrire et à relire. Une chaîne unique évite tout
 * cela : ce qui part est exactement ce qui revient.
 */
const versDocument = (fiche) => ({
  fields: {
    donnees: { stringValue: JSON.stringify(fiche) },
    modifieLe: { stringValue: String(fiche.modifieLe || '') },
  },
});

function depuisDocument(document_) {
  try {
    return JSON.parse(document_?.fields?.donnees?.stringValue || 'null');
  } catch {
    return null;
  }
}

async function appeler(url, options = {}) {
  const reponse = await fetch(avecCle(url), options);
  if (!reponse.ok) throw new Error(`${reponse.status} ${reponse.statusText}`);
  return reponse.status === 204 ? null : reponse.json();
}

/**
 * Lit une collection entière, page après page.
 *
 * Les présences sont cent quarante-quatre fiches aujourd'hui, mais une saison
 * plus longue ou une équipe plus grande dépasserait la page unique que
 * Firestore rend par défaut, et le calendrier reviendrait tronqué sans que
 * rien ne le signale.
 */
async function lireCollection(collection) {
  const fiches = [];
  let suite = '';
  do {
    const url = `${chemin(collection)}?pageSize=300${suite ? `&pageToken=${suite}` : ''}`;
    const paquet = await appeler(url);
    fiches.push(...(paquet?.documents || []).map(depuisDocument).filter(Boolean));
    suite = paquet?.nextPageToken || '';
  } while (suite);
  return fiches;
}

const ecrireFiche = (collection, fiche) => appeler(
  chemin(collection, fiche.id),
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versDocument(fiche)),
  },
);

const effacerFiche = (collection, id) => appeler(chemin(collection, id), { method: 'DELETE' });

/** Marque le calendrier comme modifié, pour que les autres appareils le sachent. */
const marquerTemoin = () => appeler(
  chemin('meta', TEMOIN),
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { majLe: { stringValue: new Date().toISOString() } } }),
  },
).catch(() => {});

async function lireTemoin() {
  try {
    const paquet = await appeler(chemin('meta', TEMOIN));
    return paquet?.fields?.majLe?.stringValue || '';
  } catch (erreur) {
    // Un témoin absent est normal sur un calendrier qui vient de naître.
    if (String(erreur.message).startsWith('404')) return '';
    throw erreur;
  }
}

// --- mise en route ----------------------------------------------------------

/**
 * Se branche au calendrier partagé si un code est enregistré sur cet appareil.
 *
 * La fusion d'arrivée n'envoie que les fiches que le partage ignore ou qu'il
 * connaît moins à jour. Un huitième téléphone part du même plan, avec les
 * mêmes identifiants, et n'a donc rien à apporter tant qu'il n'a rien
 * annoncé : il reçoit, sans écraser ce que les autres ont déjà dit.
 */
export async function initialiser({ donneesLocales, onDonnees, onEtat }) {
  rappels = { onDonnees, onEtat };
  if (!configure()) {
    changerEtat('local');
    return false;
  }

  code = lireCode();
  if (!code) {
    changerEtat('sansCode');
    return false;
  }

  try {
    await fusionner(donneesLocales());
    await rapatrier();
    changerEtat('connecte');
  } catch (erreur) {
    console.info('Calendrier partagé injoignable', erreur);
    changerEtat('attente');
  }

  surveiller();
  addEventListener('online', () => rejouer());
  return true;
}

const COLLECTIONS_PARTAGEES = ['joueurs', 'matchs', 'presences'];

async function fusionner(locales) {
  const distantes = await toutLire();
  const vide = COLLECTIONS_PARTAGEES.every((nom) => !distantes[nom].length);

  const envois = COLLECTIONS_PARTAGEES.flatMap((nom) => (
    aEnvoyer(locales[nom], distantes[nom], vide)
      .map((fiche) => ecrireFiche(COLLECTIONS[nom], fiche))
  ));
  if (!envois.length) return;
  await Promise.all(envois);
  await marquerTemoin();
}

/** Fiches que le partage ignore, ou qu'il connaît moins à jour. */
function aEnvoyer(locales, distantes, vide) {
  if (vide) return locales;
  const connues = new Map(distantes.map((f) => [f.id, f.modifieLe || '']));
  return locales.filter((fiche) => (
    !connues.has(fiche.id) || (fiche.modifieLe || '') > connues.get(fiche.id)
  ));
}

const toutLire = async () => Object.fromEntries(await Promise.all(
  COLLECTIONS_PARTAGEES.map(async (nom) => [nom, await lireCollection(COLLECTIONS[nom])]),
));

/** Relit le calendrier entier et le donne à l'application. */
async function rapatrier() {
  const distantes = await toutLire();
  for (const nom of COLLECTIONS_PARTAGEES) rappels.onDonnees?.(nom, distantes[nom]);
  dernierTemoin = await lireTemoin();
}

/**
 * Guette les annonces venues des autres téléphones.
 *
 * Seul le document témoin est interrogé, quelques centaines d'octets. Le
 * calendrier n'est relu que lorsqu'il a changé, donc jamais tant que personne
 * ne touche à rien.
 */
function surveiller() {
  clearInterval(minuteur);
  minuteur = setInterval(async () => {
    try {
      const temoin = await lireTemoin();
      changerEtat('connecte');
      rejouer();
      if (temoin === dernierTemoin) return;
      dernierTemoin = temoin;
      await rapatrier();
    } catch (erreur) {
      console.info('Calendrier partagé silencieux', erreur);
      changerEtat('attente');
    }
  }, PERIODE);
}

export function arreter() {
  clearInterval(minuteur);
  minuteur = null;
}

// --- écritures --------------------------------------------------------------

/** Pousse une annonce, ou la met de côté si le calendrier ne répond pas. */
function pousser(collection, fiche, suppression = false) {
  if (!code) return;
  const operation = { collection, fiche, suppression };
  const promesse = suppression
    ? effacerFiche(collection, fiche.id)
    : ecrireFiche(collection, fiche);

  promesse
    .then(() => marquerTemoin())
    .then(() => { dernierTemoin = null; changerEtat('connecte'); })
    .catch((erreur) => {
      console.info('Annonce mise de côté', erreur);
      const index = enAttente.findIndex(
        (o) => o.collection === collection && o.fiche.id === fiche.id,
      );
      if (index === -1) enAttente.push(operation);
      else enAttente[index] = operation;
      changerEtat('attente');
    });
}

/** Rejoue ce qui attend. Ce qui échoue encore retourne dans la file. */
function rejouer() {
  if (!code || !enAttente.length) return;
  for (const { collection, fiche, suppression } of enAttente.splice(0)) {
    pousser(collection, fiche, suppression);
  }
}

export const ecrirePresence = (presence) => pousser(COLLECTIONS.presences, presence);
export const ecrireMatch = (match) => pousser(COLLECTIONS.matchs, match);
export const ecrireJoueur = (joueur) => pousser(COLLECTIONS.joueurs, joueur);

/** Remplace tout le contenu partagé, après une restauration ou une remise à zéro. */
export async function remplacerTout(locales) {
  if (!code) return;
  const distantes = await toutLire();

  const travaux = COLLECTIONS_PARTAGEES.flatMap((nom) => {
    const gardes = new Set(locales[nom].map((fiche) => fiche.id));
    return [
      ...distantes[nom].filter((fiche) => !gardes.has(fiche.id))
        .map((fiche) => effacerFiche(COLLECTIONS[nom], fiche.id).catch(() => {})),
      ...locales[nom].map((fiche) => ecrireFiche(COLLECTIONS[nom], fiche).catch(() => {})),
    ];
  });

  await Promise.all(travaux);
  await marquerTemoin();
}
