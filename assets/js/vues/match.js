// La fiche d'un match : qui joue, qui remplace, qui appeler.

import {
  boutonsStatut, etatEffectif, libelleStatut, origine, pastille, quand,
} from '../composants.js';
import { bouton, el, icone, message, vider } from '../dom.js';
import { exporterAgenda } from '../export.js';
import { formaterJourEtDate, t } from '../langue.js';
import { effectif, estPasse, statutDe } from '../model.js';
import * as store from '../store.js';

/** La ligne d'un joueur : son statut, qui l'a annoncé, et de quoi le changer. */
function ligneJoueur(match, joueur, { modifiable }) {
  const presence = store.index().get(match.id)?.get(joueur.id);
  const statut = presence?.statut || 'absent';
  const moi = store.moi();
  const estMoi = moi?.id === joueur.id;

  return el('li', { class: `ligne-joueur${estMoi ? ' est-moi' : ''}` }, [
    el('div', { class: 'ligne-identite' }, [
      pastille(statut),
      el('div', {}, [
        el('span', { class: 'ligne-nom', text: joueur.nom }),
        el('span', { class: 'ligne-origine', text: origine(presence) }),
      ]),
    ]),
    modifiable
      ? boutonsStatut(match.id, joueur.id, statut, { pourMoi: estMoi })
      : el('span', { class: 'ligne-statut', text: libelleStatut(statut) }),
  ]);
}

/** Les remplaçants à appeler quand l'équipe est incomplète, numéro en main. */
function appelsARemplacants(compte) {
  const bloc = el('section', { class: 'bloc-appels' }, [
    el('h3', { text: t('match.remplacantsDisponibles') }),
  ]);

  if (!compte.remplacant.length) {
    bloc.append(el('p', { class: 'discret', text: t('match.aucunRemplacant') }));
    return bloc;
  }

  bloc.append(el('ul', { class: 'liste-appels' }, compte.remplacant.map((joueur) => (
    el('li', {}, [
      el('span', { class: 'appel-nom', text: joueur.nom }),
      joueur.telephone
        ? el('a', {
          class: 'bouton bouton-primaire bouton-appel',
          href: `tel:${joueur.telephone.replace(/\s/g, '')}`,
        }, [icone('telephone'), el('span', { text: joueur.telephone })])
        : null,
    ])
  ))));
  return bloc;
}

export function rendre(racine, { naviguer, params }) {
  const match = store.trouverMatch(params.id);
  if (!match) {
    naviguer('/calendrier');
    return;
  }

  const compte = effectif(store.index(), match, store.joueurs());
  const etat = etatEffectif(compte);
  const passe = estPasse(match);
  const echeance = quand(match);

  const vue = el('section', { class: `vue vue-match ton-${etat.ton}` }, [
    el('div', { class: 'fil-ariane' }, [
      bouton(t('commun.retour'), {
        classe: 'bouton bouton-discret', icone: 'retour',
        onclick: () => naviguer('/calendrier'),
      }),
    ]),

    el('header', { class: 'match-entete' }, [
      el('p', { class: 'match-quand' }, [
        formaterJourEtDate(match.date),
        el('strong', { text: ` ${match.heure}` }),
        echeance ? el('span', { class: 'carte-echeance', text: echeance }) : null,
      ]),
      el('h2', { text: match.adversaire }),
      el('p', { class: 'match-details' }, [
        el('span', { class: `etiquette etiquette-${match.championnat}`, text: match.championnat }),
        el('span', {
          text: match.rink ? t('match.rink', { rink: match.rink }) : t('match.rinkInconnu'),
        }),
      ]),
      match.scb ? el('p', { class: 'carte-scb', text: t('match.scb') }) : null,
      el('p', { class: 'match-effectif' }, [
        el('strong', { text: t('match.effectif', { n: compte.titulaires }) }),
        el('span', { text: etat.texte }),
      ]),
      passe ? el('p', { class: 'discret', text: t('match.passe') }) : null,
    ]),
  ]);

  // Appeler un remplaçant ne vaut que pour un match à venir et incomplet.
  if (!passe && compte.manquants) vue.append(appelsARemplacants(compte));

  vue.append(el('ul', { class: 'liste-joueurs' },
    store.joueurs().map((joueur) => ligneJoueur(match, joueur, { modifiable: !passe }))));

  vue.append(bouton(t('match.agenda'), {
    classe: 'bouton bouton-pleine-largeur', icone: 'agenda',
    onclick: () => versAgenda([match]),
  }));

  vider(racine).append(vue);
}

/**
 * Remet les matchs à l'agenda du téléphone.
 *
 * Le titre porte mon statut quand je ne suis pas titulaire : voir
 * « Zytglogge 7 – Bern 6 (remplaçant) » dans son agenda vaut mieux qu'un
 * rendez-vous auquel on n'est peut-être pas attendu.
 */
export async function versAgenda(matchs) {
  const moi = store.moi();

  const decrire = (match) => {
    const compte = effectif(store.index(), match, store.joueurs());
    const monStatut = moi ? statutDe(store.index(), match.id, moi.id) : '';
    const suffixe = monStatut && monStatut !== 'joue' ? ` (${libelleStatut(monStatut)})` : '';
    return {
      titre: `${store.donnees().equipe} – ${match.adversaire}${suffixe}`,
      description: [
        `${match.championnat} ${t('match.contre', { adversaire: match.adversaire })}`,
        `${t('match.titulaires')} : ${compte.joue.map((j) => j.nom).join(', ') || '—'}`,
        compte.remplacant.length
          ? `${t('match.remplacants')} : ${compte.remplacant.map((j) => j.abrege).join(', ')}`
          : '',
      ].filter(Boolean).join('\n'),
    };
  };

  try {
    const issue = await exporterAgenda(matchs, decrire);
    if (issue === 'enregistre') message(t('commun.sauvegardeFaite'));
  } catch (erreur) {
    message(`${t('commun.sauvegardeRefusee')} : ${erreur.message}`, 'erreur');
  }
}
