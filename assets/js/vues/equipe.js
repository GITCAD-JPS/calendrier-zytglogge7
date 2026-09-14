// L'équipe : la liste téléphonique du mail, rendue utile.
//
// Le mail se terminait par huit numéros à recopier à la main. Ici un bouton
// appelle, un autre écrit, et chaque joueur porte le compte de ses matchs.

import { entete } from '../composants.js';
import { el, icone, vider } from '../dom.js';
import { t } from '../langue.js';
import { totauxJoueur } from '../model.js';
import * as store from '../store.js';

function fiche(joueur, estMoi) {
  const totaux = totauxJoueur(store.index(), store.matchs(), joueur.id);
  const telephone = joueur.telephone.replace(/\s/g, '');

  return el('li', { class: `fiche-joueur${estMoi ? ' est-moi' : ''}` }, [
    el('div', { class: 'fiche-identite' }, [
      el('span', { class: 'fiche-abrege', text: joueur.abrege }),
      el('div', {}, [
        el('span', { class: 'fiche-nom' }, [
          joueur.nom,
          estMoi ? el('span', { class: 'marque-moi', text: t('equipe.moi') }) : null,
        ]),
        el('span', { class: 'fiche-comptes' }, [
          el('span', { text: t('equipe.matchs', { n: totaux.total }) }),
          totaux.remplacant
            ? el('span', {
              class: 'discret',
              text: t('equipe.remplacements', { n: totaux.remplacant }),
            })
            : null,
        ]),
      ]),
    ]),
    el('div', { class: 'fiche-actions' }, [
      telephone
        ? el('a', {
          class: 'bouton bouton-icone-texte',
          href: `tel:${telephone}`,
          'aria-label': `${t('equipe.appeler')} ${joueur.nom}`,
        }, [icone('telephone'), el('span', { text: joueur.telephone })])
        : null,
      joueur.courriel
        ? el('a', {
          class: 'bouton bouton-icone',
          href: `mailto:${joueur.courriel}`,
          'aria-label': `${t('equipe.ecrire')} ${joueur.nom}`,
        }, [icone('courriel')])
        : null,
    ]),
  ]);
}

export function rendre(racine) {
  const moi = store.moi();
  vider(racine).append(el('section', { class: 'vue vue-equipe' }, [
    entete(t('equipe.titre'), `${store.donnees().equipe} · ${store.groupe()}`),
    el('ul', { class: 'liste-equipe' },
      store.joueurs().map((joueur) => fiche(joueur, moi?.id === joueur.id))),
  ]));
}
