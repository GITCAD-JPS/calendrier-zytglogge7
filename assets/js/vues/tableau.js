// Le tableau de Sébastien, à l'identique, mais vivant.
//
// C'est la vue que toute l'équipe reconnaîtra, parce qu'elle a la forme du
// mail : une ligne par match, une colonne par joueur, les signes x, e et 0, et
// les trois lignes de totaux en bas. La différence tient en un geste : toucher
// une case fait tourner le statut.

import { entete, libelleStatut } from '../composants.js';
import { el, vider } from '../dom.js';
import { formaterDateCourte, formaterJourAbrege, t } from '../langue.js';
import {
  CHAMPIONNATS, SIGNES, statutDe, totauxChampionnat, totauxJoueur, trierParDate,
} from '../model.js';
import * as store from '../store.js';

/** Une case du tableau : le signe du statut, et de quoi le faire tourner. */
function case_(match, joueur, { modifiable }) {
  const statut = statutDe(store.index(), match.id, joueur.id);
  const contenu = SIGNES[statut];

  if (!modifiable) {
    return el('td', { class: `case case-${statut}` }, [
      el('span', { class: 'case-signe', text: contenu }),
    ]);
  }

  return el('td', { class: `case case-${statut}` }, [
    el('button', {
      type: 'button',
      class: 'case-bouton',
      title: `${joueur.nom} — ${libelleStatut(statut)}`,
      'aria-label': `${joueur.abrege}, ${formaterDateCourte(match.date)}, ${libelleStatut(statut)}`,
      text: contenu,
      dataset: { focus: `case:${match.id}:${joueur.id}` },
      onclick: () => store.tournerStatut(match.id, joueur.id),
    }),
  ]);
}

/**
 * La cellule de gauche, qui ne défile pas.
 *
 * Sur téléphone, l'écran ne tient pas les cinq colonnes du mail avant les
 * joueurs : il faudrait faire défiler longtemps avant de voir la moindre
 * croix, ce qui vide la vue de son intérêt. L'adversaire est donc replié ici,
 * sous la date, et les colonnes de détail s'effacent — elles reviennent dès
 * que l'écran est assez large.
 */
const celluleDate = (match) => el('th', { scope: 'row', class: 'colonne-date' }, [
  el('a', { class: 'lien-date', href: `#/match/${match.id}` }, [
    el('span', { class: 'date-jour' }, [
      el('span', { text: formaterJourAbrege(match.date) }),
      el('span', { class: 'date-chiffres', text: formaterDateCourte(match.date) }),
    ]),
    el('span', { class: 'date-adversaire', text: match.adversaire }),
  ]),
]);

function ligneMatch(match, joueurs) {
  const passe = match.date < new Date().toISOString().slice(0, 10);
  return el('tr', { class: passe ? 'ligne-passee' : '' }, [
    celluleDate(match),
    el('td', { class: 'colonne-heure', text: match.heure }),
    el('td', { class: 'colonne-rink', text: match.rink || '—' }),
    el('td', { class: 'colonne-championnat' }, [
      el('span', { class: `etiquette etiquette-${match.championnat}`, text: match.championnat }),
    ]),
    el('td', { class: 'colonne-adversaire', text: match.adversaire }),
    ...joueurs.map((joueur) => case_(match, joueur, { modifiable: !passe })),
  ]);
}

/**
 * Les trois lignes de totaux du bas : BCM, CM, puis le total général.
 *
 * Le nombre de matchs voyage avec l'étiquette, dans la colonne figée, pour
 * qu'il reste lisible même quand les colonnes de détail s'effacent.
 */
function lignesTotaux(matchs, joueurs) {
  const parChampionnat = totauxChampionnat(matchs);
  const totaux = joueurs.map((joueur) => totauxJoueur(store.index(), matchs, joueur.id));

  const ligne = (etiquette, nombreDeMatchs, valeurs, classe) => el('tr', { class: classe }, [
    el('th', { scope: 'row', class: 'colonne-date' }, [
      el('span', { class: 'total-etiquette', text: etiquette }),
      el('span', { class: 'total-matchs', text: nombreDeMatchs }),
    ]),
    el('td', { class: 'colonne-heure' }),
    el('td', { class: 'colonne-rink' }),
    el('td', { class: 'colonne-championnat' }),
    el('td', { class: 'colonne-adversaire' }),
    ...valeurs.map((valeur) => el('td', { class: 'case case-total', text: valeur })),
  ]);

  return [
    ...CHAMPIONNATS.map((nom) => ligne(
      nom, parChampionnat[nom], totaux.map((total) => total[nom]), 'ligne-total',
    )),
    ligne(t('tableau.total'), parChampionnat.total,
      totaux.map((total) => total.total), 'ligne-total ligne-total-general'),
  ];
}

export function rendre(racine) {
  const joueurs = store.joueurs();
  const matchs = trierParDate(store.matchs());

  const tableau = el('table', { class: 'tableau-saison' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { scope: 'col', class: 'colonne-date', text: t('tableau.date') }),
        el('th', { scope: 'col', class: 'colonne-heure', text: t('tableau.heure') }),
        el('th', { scope: 'col', class: 'colonne-rink', text: 'Rink' }),
        el('th', { scope: 'col', class: 'colonne-championnat' }),
        el('th', { scope: 'col', class: 'colonne-adversaire', text: t('tableau.adversaire') }),
        ...joueurs.map((joueur) => el('th', {
          scope: 'col', class: 'colonne-joueur', title: joueur.nom, text: joueur.abrege,
        })),
      ]),
    ]),
    el('tbody', {}, matchs.map((match) => ligneMatch(match, joueurs))),
    el('tfoot', {}, lignesTotaux(matchs, joueurs)),
  ]);

  vider(racine).append(el('section', { class: 'vue vue-tableau' }, [
    entete(t('tableau.titre'), `${store.donnees().equipe} · ${store.groupe()}`),
    el('p', { class: 'tableau-legende' }, [
      el('span', { text: t('tableau.legende') }),
      el('span', { class: 'discret', text: t('tableau.aide') }),
    ]),
    el('div', { class: 'tableau-defilement', tabindex: '0' }, [tableau]),
  ]));
}
