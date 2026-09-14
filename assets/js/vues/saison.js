// Ma saison : mes matchs à moi, et rien d'autre.

import { carteMatch, entete, etatVide } from '../composants.js';
import { bouton, el, selection, vider } from '../dom.js';
import { t } from '../langue.js';
import { separerParDate, statutDe } from '../model.js';
import * as store from '../store.js';

/** Tant que personne ne s'est nommé, la vue ne peut rien montrer de personnel. */
function choixDuJoueur(racine) {
  const liste = selection(
    [{ valeur: '', libelle: t('reglages.personne') },
      ...store.joueurs().map((j) => ({ valeur: j.id, libelle: j.nom }))],
    '',
    { class: 'champ-selection' },
  );

  vider(racine).append(el('section', { class: 'vue vue-saison' }, [
    entete(t('saison.titre')),
    el('div', { class: 'invite-identite' }, [
      el('h3', { text: t('saison.qui') }),
      el('p', { class: 'discret', text: t('saison.quiAide') }),
      liste,
      bouton(t('commun.enregistrer'), {
        classe: 'bouton bouton-primaire',
        onclick: () => {
          if (liste.value) store.enregistrerPreferences({ moi: liste.value });
        },
      }),
    ]),
  ]));
}

const compteur = (valeur, libelle, variante) => el('div', {
  class: `compteur compteur-${variante}`,
}, [
  el('strong', { text: valeur }),
  el('span', { text: libelle }),
]);

export function rendre(racine, { naviguer }) {
  const moi = store.moi();
  if (!moi) {
    choixDuJoueur(racine);
    return;
  }

  const matchs = store.matchs();
  const mien = (match) => statutDe(store.index(), match.id, moi.id);
  const { aVenir } = separerParDate(matchs);

  // Ce qui me concerne vraiment : les matchs où je joue ou je remplace. Les
  // matchs où j'ai dit non n'ont pas à encombrer ma liste, ils restent dans
  // le calendrier complet.
  const miens = aVenir.filter((match) => mien(match) !== 'absent');

  const totaux = {
    joue: matchs.filter((m) => mien(m) === 'joue').length,
    remplacant: matchs.filter((m) => mien(m) === 'remplacant').length,
    absent: matchs.filter((m) => mien(m) === 'absent').length,
  };

  const vue = el('section', { class: 'vue vue-saison' }, [
    entete(t('saison.titre'), moi.nom),
    el('div', { class: 'compteurs' }, [
      compteur(totaux.joue, t('saison.joue'), 'joue'),
      compteur(totaux.remplacant, t('saison.remplacant'), 'remplacant'),
      compteur(totaux.absent, t('saison.absent'), 'absent'),
    ]),
  ]);

  if (!miens.length) {
    vue.append(etatVide(t('saison.aucunProchain')));
  } else {
    vue.append(el('h3', { class: 'sous-titre-section', text: t('saison.prochain') }));
    vue.append(el('div', { class: 'liste-matchs' },
      miens.map((match) => carteMatch(match, { naviguer }))));
  }

  vider(racine).append(vue);
}
