// Ce que veulent dire les données : statuts, effectifs, totaux.
//
// Rien ici ne touche au stockage ni au DOM. Ce module répond à des questions
// sur un calendrier qu'on lui donne, ce qui le rend lisible et vérifiable
// seul.

/** Les trois statuts du tableau de Sébastien, dans l'ordre où ils tournent. */
export const STATUTS = ['joue', 'remplacant', 'absent'];

/** Le signe que porte chaque statut dans le tableau, identique dans les deux langues. */
export const SIGNES = { joue: 'x', remplacant: 'e', absent: '0' };

/** Une équipe de curling compte quatre joueurs sur la glace. */
export const TITULAIRES_ATTENDUS = 4;

export const CHAMPIONNATS = ['BCM', 'CM'];

export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export const maintenant = () => new Date().toISOString();

export const identifiantPresence = (matchId, joueurId) => `${matchId}__${joueurId}`;

// --- normalisation ----------------------------------------------------------

export const normaliserJoueur = (brut) => ({
  id: String(brut.id || ''),
  abrege: String(brut.abrege || brut.nom || ''),
  nom: String(brut.nom || brut.abrege || ''),
  telephone: String(brut.telephone || ''),
  courriel: String(brut.courriel || ''),
  ordre: Number(brut.ordre) || 0,
});

export const normaliserMatch = (brut) => ({
  id: String(brut.id || ''),
  ordre: Number(brut.ordre) || 0,
  date: String(brut.date || ''),
  heure: String(brut.heure || ''),
  rink: String(brut.rink || ''),
  championnat: CHAMPIONNATS.includes(brut.championnat) ? brut.championnat : 'BCM',
  adversaire: String(brut.adversaire || ''),
  scb: Boolean(brut.scb),
  modifieLe: String(brut.modifieLe || ''),
});

export const normaliserPresence = (brut) => ({
  id: String(brut.id || identifiantPresence(brut.matchId, brut.joueurId)),
  matchId: String(brut.matchId || ''),
  joueurId: String(brut.joueurId || ''),
  statut: STATUTS.includes(brut.statut) ? brut.statut : 'absent',
  modifieLe: String(brut.modifieLe || ''),
  modifiePar: String(brut.modifiePar || ''),
});

// --- lecture d'un calendrier ------------------------------------------------

/**
 * Range les présences par match puis par joueur, pour que les vues n'aient
 * plus à parcourir cent quarante-quatre fiches à chaque affichage.
 */
export function indexerPresences(presences) {
  const index = new Map();
  for (const presence of presences) {
    if (!index.has(presence.matchId)) index.set(presence.matchId, new Map());
    index.get(presence.matchId).set(presence.joueurId, presence);
  }
  return index;
}

export const statutDe = (index, matchId, joueurId) => (
  index.get(matchId)?.get(joueurId)?.statut || 'absent'
);

/**
 * L'effectif d'un match : qui est sur la glace, qui remplace, qui manque.
 *
 * C'est le calcul central de l'application. Le plan de Sébastien aligne
 * exactement quatre joueurs à chaque match, et une annulation casse cet
 * équilibre : `manquants` dit alors combien il faut rappeler, et
 * `remplacants` qui appeler en premier.
 */
export function effectif(index, match, joueurs) {
  const groupes = { joue: [], remplacant: [], absent: [] };
  for (const joueur of joueurs) {
    groupes[statutDe(index, match.id, joueur.id)].push(joueur);
  }
  const titulaires = groupes.joue.length;
  return {
    ...groupes,
    titulaires,
    manquants: Math.max(0, TITULAIRES_ATTENDUS - titulaires),
    surnombre: Math.max(0, titulaires - TITULAIRES_ATTENDUS),
    complet: titulaires === TITULAIRES_ATTENDUS,
  };
}

/** Les totaux du bas du tableau : matchs joués par championnat, et en tout. */
export function totauxJoueur(index, matchs, joueurId) {
  const totaux = { BCM: 0, CM: 0, total: 0, remplacant: 0, absent: 0 };
  for (const match of matchs) {
    const statut = statutDe(index, match.id, joueurId);
    if (statut === 'joue') {
      totaux[match.championnat] += 1;
      totaux.total += 1;
    } else if (statut === 'remplacant') totaux.remplacant += 1;
    else totaux.absent += 1;
  }
  return totaux;
}

export const totauxChampionnat = (matchs) => ({
  BCM: matchs.filter((m) => m.championnat === 'BCM').length,
  CM: matchs.filter((m) => m.championnat === 'CM').length,
  total: matchs.length,
});

// --- le temps qui passe -----------------------------------------------------

export const estPasse = (match, jour = aujourdhui()) => match.date < jour;

export const trierParDate = (matchs) => [...matchs].sort((a, b) => (
  a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)
));

export function separerParDate(matchs, jour = aujourdhui()) {
  const tries = trierParDate(matchs);
  return {
    aVenir: tries.filter((match) => !estPasse(match, jour)),
    passes: tries.filter((match) => estPasse(match, jour)).reverse(),
  };
}

/** Nombre de jours d'ici au match, zéro le jour même. */
export function joursAvant(match, jour = aujourdhui()) {
  const ecart = Date.parse(`${match.date}T12:00:00`) - Date.parse(`${jour}T12:00:00`);
  return Math.round(ecart / 86400000);
}

/**
 * Les matchs à venir dont l'effectif n'est pas complet.
 *
 * C'est ce qui justifie l'application : un match passé à trois joueurs doit
 * se voir sans avoir à ouvrir chaque fiche.
 */
export const matchsIncomplets = (index, matchs, joueurs, jour = aujourdhui()) => (
  trierParDate(matchs)
    .filter((match) => !estPasse(match, jour))
    .filter((match) => !effectif(index, match, joueurs).complet)
);

/** Le début et la fin d'un match, pour l'agenda. Une partie dure deux heures. */
export function horaire(match) {
  const [heures, minutes] = (match.heure || '00:00').split(':').map(Number);
  const debut = new Date(`${match.date}T00:00:00`);
  debut.setHours(heures || 0, minutes || 0, 0, 0);
  const fin = new Date(debut.getTime() + 2 * 3600 * 1000);
  return { debut, fin };
}
