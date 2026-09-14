// Sauvegarde du calendrier et export vers l'agenda du téléphone.

import { horaire } from './model.js';
import * as store from './store.js';

// Traduction des refus de l'hébergeur, pour dire ce qui s'est passé plutôt
// que d'afficher un code en anglais.
const RAISONS = {
  too_large: 'le fichier est trop volumineux',
  rate_limited: 'une demande est déjà en cours, réessayez dans un instant',
  rejected_extension: 'ce format de fichier n’est pas accepté ici',
  extension_not_enabled: 'ce format de fichier n’est pas accepté ici',
  unavailable: 'l’enregistrement de fichiers est indisponible ici',
  not_granted: 'l’enregistrement de fichiers n’a pas été autorisé',
};

/**
 * Remet un fichier à la personne qui l'a demandé.
 *
 * Une page d'artefact ne peut pas déclencher un téléchargement elle-même : le
 * lien reste inerte, sans la moindre erreur, et l'application croirait avoir
 * réussi. L'hébergeur offre pour cela une remise qui demande confirmation.
 * Ailleurs, un lien ordinaire fait très bien l'affaire.
 *
 * Rend 'enregistre', ou 'refuse' si la personne décline. Lève dans tous les
 * autres cas, pour qu'aucun appelant n'annonce une sauvegarde qui n'a pas eu
 * lieu.
 */
export async function telecharger(nomFichier, contenu, type) {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
  const use = globalThis.claude?.use;

  if (typeof use === 'function') {
    const remise = await use('downloads').catch(() => null);
    if (!remise) throw new Error(RAISONS.unavailable);
    try {
      await remise.save({ filename: nomFichier, data: blob });
      return 'enregistre';
    } catch (erreur) {
      if (erreur?.code === 'declined') return 'refuse';
      throw new Error(RAISONS[erreur?.code] || erreur?.message || 'raison inconnue');
    }
  }

  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'enregistre';
}

const horodatage = () => new Date().toISOString().slice(0, 10);

export function sauvegardeComplete() {
  return telecharger(`zytglogge7-${horodatage()}.json`,
    JSON.stringify(store.exporterJson(), null, 1), 'application/json');
}

export function lireFichierJson(fichier) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        resoudre(JSON.parse(lecteur.result));
      } catch {
        rejeter(new Error("Ce fichier n'est pas un JSON valide"));
      }
    };
    lecteur.onerror = () => rejeter(new Error('Fichier illisible'));
    lecteur.readAsText(fichier);
  });
}

// --- agenda -----------------------------------------------------------------

const PLIAGE = 73;

/**
 * Découpe une ligne trop longue comme le veut la norme iCalendar.
 *
 * Les agendas refusent poliment un fichier dont une ligne dépasse septante-cinq
 * octets : la suite se met sur la ligne suivante, précédée d'une espace. Le
 * découpage compte donc les octets et non les caractères, sans quoi un « ü »
 * ou un « é » suffirait à faire dérailler la mesure.
 */
function plier(ligne) {
  const octets = new TextEncoder().encode(ligne);
  if (octets.length <= PLIAGE) return ligne;

  const morceaux = [];
  let courant = '';
  let taille = 0;
  for (const caractere of ligne) {
    const poids = new TextEncoder().encode(caractere).length;
    if (taille + poids > (morceaux.length ? PLIAGE - 1 : PLIAGE)) {
      morceaux.push(courant);
      courant = '';
      taille = 0;
    }
    courant += caractere;
    taille += poids;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

const echapper = (valeur) => String(valeur ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/** Un instant local au format iCalendar, sans fuseau : « 20261007T183000 ». */
const instantLocal = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
  'T',
  String(date.getHours()).padStart(2, '0'),
  String(date.getMinutes()).padStart(2, '0'),
  '00',
].join('');

const instantUtc = (date) => `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

/** Un évènement par match, d'après ce que la vue en a dit. */
function evenement(match, { titre, description }) {
  const { debut, fin } = horaire(match);
  return [
    'BEGIN:VEVENT',
    `UID:${match.id}-zytglogge7@git-cad.ch`,
    `DTSTAMP:${instantUtc(new Date())}`,
    `DTSTART:${instantLocal(debut)}`,
    `DTEND:${instantLocal(fin)}`,
    `SUMMARY:${echapper(titre)}`,
    `LOCATION:${echapper(match.rink ? `Curling Bern, Rink ${match.rink}` : 'Curling Bern')}`,
    `DESCRIPTION:${echapper(description)}`,
    'END:VEVENT',
  ].map(plier).join('\r\n');
}

/**
 * Le calendrier complet au format iCalendar.
 *
 * `decrire(match)` rend le titre et la description de l'évènement, et vient
 * de la vue : elle seule connaît la langue de l'appareil, et l'agenda ne doit
 * pas annoncer « remplaçant » à qui lit l'application en allemand.
 */
export function versIcs(matchs, decrire) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GIT-CAD//Calendrier Zytglogge 7//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapper(`${store.donnees().equipe} ${store.saison()}`)}`,
    ...matchs.map((match) => evenement(match, decrire(match))),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function exporterAgenda(matchs, decrire) {
  const saison = store.saison().replace('/', '-') || horodatage();
  return telecharger(`zytglogge7-${saison}.ics`,
    versIcs(matchs, decrire), 'text/calendar;charset=utf-8');
}
