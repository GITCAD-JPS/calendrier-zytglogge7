// Fragments d'interface que plusieurs vues se partagent.

import { bouton, el, icone } from './dom.js';
import {
  formaterInstant, formaterJourEtDate, t, tn,
} from './langue.js';
import { effectif, joursAvant, SIGNES, STATUTS } from './model.js';
import * as store from './store.js';

/** Le libellé d'un statut, à la troisième personne ou à la première. */
export const libelleStatut = (statut, pourMoi = false) => (
  t(pourMoi ? `statut.${statut}.moi` : `statut.${statut}`)
);

/** Le signe du tableau, dans une pastille colorée. */
export const pastille = (statut, { grande = false } = {}) => el('span', {
  class: `pastille pastille-${statut}${grande ? ' pastille-grande' : ''}`,
  title: libelleStatut(statut),
}, SIGNES[statut]);

/**
 * Ce qu'il faut dire de l'effectif d'un match.
 *
 * Un match complet ne mérite qu'une confirmation discrète. Un match incomplet
 * est le seul moment où l'application a quelque chose d'urgent à dire, et il
 * doit se voir sans lire.
 */
export function etatEffectif(compte) {
  if (compte.complet) return { ton: 'complet', texte: t('match.complet') };
  if (compte.surnombre) {
    return { ton: 'surnombre', texte: tn('match.surnombre', compte.surnombre) };
  }
  return { ton: 'manque', texte: tn('match.manque', compte.manquants) };
}

/** « Aujourd'hui », « Demain », « Dans 5 jours », ou la date pour le lointain. */
export function quand(match) {
  const jours = joursAvant(match);
  if (jours === 0) return t('match.aujourdhui');
  if (jours === 1) return t('match.demain');
  if (jours > 1 && jours <= 14) return t('match.dansJours', { n: jours });
  return '';
}

/**
 * Les trois boutons qui annoncent une disponibilité.
 *
 * C'est le geste central de l'application : trois cibles larges, le statut
 * courant enfoncé, et rien à ouvrir. `joueurId` permet d'annoncer pour un
 * autre, parce que le cas réel est un coup de téléphone à 18 h.
 */
export function boutonsStatut(matchId, joueurId, statutActuel, { pourMoi = true } = {}) {
  const groupe = el('div', {
    class: 'statuts', role: 'group', 'aria-label': t('match.titulaires'),
  });
  for (const statut of STATUTS) {
    const actif = statut === statutActuel;
    groupe.append(bouton(libelleStatut(statut, pourMoi), {
      classe: `statut-choix statut-${statut}${actif ? ' actif' : ''}`,
      'aria-pressed': actif ? 'true' : 'false',
      dataset: { focus: `statut:${matchId}:${joueurId}:${statut}` },
      onclick: () => store.definirStatut(matchId, joueurId, statut),
    }));
  }
  return groupe;
}

/** Qui a annoncé ce statut, et quand. Le plan d'origine n'a pas d'auteur. */
export function origine(presence) {
  if (!presence?.modifieLe) return t('match.jamaisModifie');
  const auteur = store.trouverJoueur(presence.modifiePar);
  return t('match.modifiePar', {
    nom: auteur ? auteur.abrege : '?',
    date: formaterInstant(presence.modifieLe),
  });
}

/**
 * La carte d'un match, telle qu'elle apparaît dans le calendrier.
 *
 * Elle porte tout ce qu'on veut savoir sans ouvrir : quand, contre qui, sur
 * quelle piste, si l'équipe est au complet, et où j'en suis moi.
 */
export function carteMatch(match, { naviguer, avecBoutons = true }) {
  const compte = effectif(store.index(), match, store.joueurs());
  const etat = etatEffectif(compte);
  const moi = store.moi();
  const monStatut = moi ? store.index().get(match.id)?.get(moi.id)?.statut : null;
  const echeance = quand(match);

  const carte = el('article', {
    class: `carte-match ton-${etat.ton}${monStatut ? ` je-${monStatut}` : ''}`,
  });

  const entete = el('a', {
    class: 'carte-lien',
    href: `#/match/${match.id}`,
    onclick: (evenement) => {
      evenement.preventDefault();
      naviguer(`/match/${match.id}`);
    },
  }, [
    el('div', { class: 'carte-date' }, [
      el('span', { class: 'carte-jour', text: formaterJourEtDate(match.date) }),
      el('span', { class: 'carte-heure', text: match.heure }),
      echeance ? el('span', { class: 'carte-echeance', text: echeance }) : null,
    ]),
    el('div', { class: 'carte-corps' }, [
      el('h3', { class: 'carte-adversaire', text: match.adversaire }),
      el('p', { class: 'carte-details' }, [
        el('span', { class: `etiquette etiquette-${match.championnat}`, text: match.championnat }),
        el('span', {
          class: 'carte-rink',
          text: match.rink ? t('match.rink', { rink: match.rink }) : t('match.rinkInconnu'),
        }),
      ]),
      match.scb ? el('p', { class: 'carte-scb', text: t('match.scb') }) : null,
    ]),
    el('div', { class: 'carte-effectif' }, [
      el('span', { class: 'effectif-compte', text: t('match.effectif', { n: compte.titulaires }) }),
      el('span', { class: 'effectif-texte', text: etat.texte }),
    ]),
  ]);
  carte.append(entete);

  if (avecBoutons && moi) carte.append(boutonsStatut(match.id, moi.id, monStatut));
  return carte;
}

/**
 * L'invitation à se nommer, une seule fois en haut de la liste.
 *
 * Sans nom choisi, aucune carte ne peut porter de boutons : les répéter dix-huit
 * fois pour le dire ferait du bruit, une bande suffit.
 */
export const inviteIdentite = () => el('a', { class: 'carte-invite', href: '#/reglages' }, [
  icone('joueur'), el('span', { text: t('saison.choisir') }),
]);

/** Bandeau de titre d'une vue, avec la saison en sous-titre. */
export const entete = (titre, sousTitre) => el('header', { class: 'vue-entete' }, [
  el('h2', { text: titre }),
  sousTitre ? el('p', { class: 'vue-sous-titre', text: sousTitre }) : null,
]);

export const etatVide = (texte) => el('div', { class: 'etat-vide' }, [
  el('p', { text: texte }),
]);
