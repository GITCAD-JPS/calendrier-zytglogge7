// État de l'application : chargement, persistance et annonces de disponibilité.
// Les données vivent dans localStorage, le point de départ vient de
// data/seed.json, c'est-à-dire du tableau envoyé par Sébastien.

import { langueInitiale } from './langue.js';
import {
  identifiantPresence, indexerPresences, maintenant,
  normaliserJoueur, normaliserMatch, normaliserPresence, STATUTS,
} from './model.js';
import * as partage from './nuage.js';

const CLE_DONNEES = 'zytglogge7.donnees.v1';
const CLE_PREFERENCES = 'zytglogge7.preferences.v1';
const CHEMIN_SEED = 'data/seed.json';

export const VERSION_DONNEES = 1;
// Affichée dans les réglages : sans elle, impossible de savoir à distance si
// un téléphone tourne encore sur une version gardée en cache. À faire suivre
// avec VERSION dans sw.js.
export const VERSION_APP = '2';

const etat = {
  saison: '',
  groupe: '',
  equipe: '',
  joueurs: [],
  matchs: [],
  presences: [],
  preferences: { theme: 'auto', langue: '', moi: '' },
  index: new Map(),
  majLe: '',
};

const abonnes = new Set();

export function abonner(rappel) {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

function notifier() {
  etat.index = indexerPresences(etat.presences);
  for (const rappel of abonnes) rappel(etat);
}

export const donnees = () => etat;
export const joueurs = () => etat.joueurs;
export const matchs = () => etat.matchs;
export const presences = () => etat.presences;
export const index = () => etat.index;
export const preferences = () => etat.preferences;
export const saison = () => etat.saison;
export const groupe = () => etat.groupe;

export const trouverMatch = (id) => etat.matchs.find((m) => m.id === id) || null;
export const trouverJoueur = (id) => etat.joueurs.find((j) => j.id === id) || null;
/** Le joueur que cet appareil représente, vide tant que personne ne s'est nommé. */
export const moi = () => trouverJoueur(etat.preferences.moi);

// --- partage ----------------------------------------------------------------

export const etatPartage = () => partage.etat();
/** Le partage est-il réellement branché, quel que soit son état du moment ? */
export const partageBranche = () => partage.partageActif();
/** Cette version sait-elle joindre un calendrier partagé ? */
export const partageConfigure = () => partage.configure();
/** Le code enregistré sur cet appareil, vide s'il n'y en a pas. */
export const codePartage = () => partage.codeConfigure();
export const inventerCode = () => partage.inventerCode();

/**
 * Change le calendrier partagé auquel cet appareil se rattache.
 *
 * Le rechargement n'est pas une facilité : tout l'état du partage, de la file
 * d'attente au document témoin, se rapporte à un calendrier précis. Repartir
 * de zéro est plus sûr que de démêler l'ancien du nouveau.
 */
export function definirCodePartage(valeur) {
  partage.enregistrerCode(valeur);
  location.reload();
}

// --- persistance ------------------------------------------------------------

function lireLocal(cle) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

let stockageRefuse = false;

/** Le navigateur refuse-t-il de garder le calendrier d'une visite à l'autre ? */
export const stockageDurable = () => !stockageRefuse;

function ecrireLocal(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch (erreur) {
    // Navigation privée, cadre d'un autre site, quota atteint : l'application
    // continue de fonctionner mais ne survivra pas à la fermeture.
    console.error('Écriture impossible dans le stockage local', erreur);
    stockageRefuse = true;
    return false;
  }
}

function enregistrer() {
  etat.majLe = maintenant();
  const ok = ecrireLocal(CLE_DONNEES, {
    version: VERSION_DONNEES,
    majLe: etat.majLe,
    saison: etat.saison,
    groupe: etat.groupe,
    equipe: etat.equipe,
    joueurs: etat.joueurs,
    matchs: etat.matchs,
    presences: etat.presences,
  });
  notifier();
  return ok;
}

export function enregistrerPreferences(modifications) {
  etat.preferences = { ...etat.preferences, ...modifications };
  ecrireLocal(CLE_PREFERENCES, etat.preferences);
  notifier();
}

function adopter(paquet) {
  etat.saison = paquet.saison || etat.saison;
  etat.groupe = paquet.groupe || etat.groupe;
  etat.equipe = paquet.equipe || etat.equipe;
  etat.joueurs = (paquet.joueurs || []).map(normaliserJoueur)
    .sort((a, b) => a.ordre - b.ordre);
  etat.matchs = (paquet.matchs || []).map(normaliserMatch);
  etat.presences = (paquet.presences || []).map(normaliserPresence);
  etat.majLe = paquet.majLe || '';
}

export async function charger() {
  const enregistrees = lireLocal(CLE_PREFERENCES) || {};
  etat.preferences = { ...etat.preferences, ...enregistrees };
  if (!etat.preferences.langue) etat.preferences.langue = langueInitiale();

  const local = lireLocal(CLE_DONNEES);
  if (local?.joueurs?.length) adopter(local);
  else adopter(await lireSeed());

  notifier();

  await partage.initialiser({
    donneesLocales: () => ({
      joueurs: etat.joueurs, matchs: etat.matchs, presences: etat.presences,
    }),
    onDonnees: recevoirDuPartage,
    onEtat: notifier,
  });
}

async function lireSeed() {
  const reponse = await fetch(CHEMIN_SEED, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(`Jeu de départ illisible (${reponse.status})`);
  return reponse.json();
}

/**
 * Adopte ce que le partage rend.
 *
 * Le partage fait autorité : il a déjà fusionné ce que cet appareil avait à
 * apporter. Une collection vide est ignorée, car elle signalerait une lecture
 * partielle plutôt qu'une équipe sans joueurs, et effacerait le calendrier
 * local pour rien.
 */
function recevoirDuPartage(collection, fiches) {
  if (!fiches.length) return;
  const normaliser = {
    joueurs: normaliserJoueur, matchs: normaliserMatch, presences: normaliserPresence,
  }[collection];
  if (!normaliser) return;

  etat[collection] = fiches.map(normaliser);
  if (collection === 'joueurs') etat.joueurs.sort((a, b) => a.ordre - b.ordre);
  ecrireLocal(CLE_DONNEES, {
    version: VERSION_DONNEES,
    majLe: etat.majLe,
    saison: etat.saison,
    groupe: etat.groupe,
    equipe: etat.equipe,
    joueurs: etat.joueurs,
    matchs: etat.matchs,
    presences: etat.presences,
  });
  notifier();
}

// --- annonces de disponibilité ----------------------------------------------

/**
 * Annonce le statut d'un joueur pour un match.
 *
 * Chaque case est une fiche à elle seule : deux joueurs qui annoncent leur
 * disponibilité pour le même match en même temps ne peuvent pas s'écraser,
 * puisqu'ils ne touchent jamais la même fiche.
 *
 * L'auteur est retenu parce que le cas réel est un coup de téléphone à 18 h :
 * celui qui reçoit l'appel annonce pour l'autre, et la fiche du match doit
 * pouvoir dire qui a annoncé quoi.
 */
export function definirStatut(matchId, joueurId, statut) {
  if (!STATUTS.includes(statut)) return null;
  const identite = identifiantPresence(matchId, joueurId);
  const auteur = moi();
  const presence = {
    id: identite,
    matchId,
    joueurId,
    statut,
    modifieLe: maintenant(),
    modifiePar: auteur?.id || '',
  };

  const rang = etat.presences.findIndex((p) => p.id === identite);
  if (rang === -1) etat.presences.push(presence);
  else etat.presences[rang] = presence;

  enregistrer();
  partage.ecrirePresence(presence);
  return presence;
}

/** Fait tourner un statut : joue → remplaçant → ne peut pas → joue. */
export function tournerStatut(matchId, joueurId) {
  const actuel = etat.index.get(matchId)?.get(joueurId)?.statut || 'absent';
  const suivant = STATUTS[(STATUTS.indexOf(actuel) + 1) % STATUTS.length];
  return definirStatut(matchId, joueurId, suivant);
}

export function modifierMatch(id, champs) {
  const rang = etat.matchs.findIndex((m) => m.id === id);
  if (rang === -1) return null;
  const match = normaliserMatch({ ...etat.matchs[rang], ...champs, modifieLe: maintenant() });
  etat.matchs[rang] = match;
  enregistrer();
  partage.ecrireMatch(match);
  return match;
}

// --- sauvegarde et remise à zéro --------------------------------------------

export const exporterJson = () => ({
  application: 'calendrier-zytglogge7',
  version: VERSION_DONNEES,
  exporteLe: maintenant(),
  saison: etat.saison,
  groupe: etat.groupe,
  equipe: etat.equipe,
  joueurs: etat.joueurs,
  matchs: etat.matchs,
  presences: etat.presences,
});

export async function importerJson(paquet) {
  if (!paquet?.joueurs?.length || !paquet?.matchs?.length) {
    throw new Error('Sauvegarde incomplète');
  }
  adopter(paquet);
  enregistrer();
  await partage.remplacerTout({
    joueurs: etat.joueurs, matchs: etat.matchs, presences: etat.presences,
  });
}

/** Revient au tableau d'origine, celui du mail. */
export async function reinitialiser() {
  adopter(await lireSeed());
  enregistrer();
  await partage.remplacerTout({
    joueurs: etat.joueurs, matchs: etat.matchs, presences: etat.presences,
  });
}
