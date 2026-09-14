// Le calendrier : les matchs à venir, le prochain en tête.

import { carteMatch, entete, etatVide, inviteIdentite } from '../composants.js';
import { bouton, el, vider } from '../dom.js';
import { t, tn } from '../langue.js';
import { matchsIncomplets, separerParDate } from '../model.js';
import * as store from '../store.js';

let passesDeplies = false;

export function rendre(racine, { naviguer }) {
  const { aVenir, passes } = separerParDate(store.matchs());
  const incomplets = matchsIncomplets(store.index(), store.matchs(), store.joueurs());

  const vue = el('section', { class: 'vue vue-calendrier' }, [
    entete(t('nav.calendrier'), t('app.saison', { saison: store.saison() })),
  ]);

  // Une alerte n'a de sens que si elle mène quelque part : celle-ci amène
  // droit au premier match qu'il faut compléter.
  if (incomplets.length) {
    vue.append(el('a', {
      class: 'alerte-incomplets',
      href: `#/match/${incomplets[0].id}`,
      text: tn('calendrier.incomplets', incomplets.length),
    }));
  }

  if (!store.moi()) vue.append(inviteIdentite());

  if (!aVenir.length) {
    vue.append(etatVide(t('calendrier.saisonFinie')));
  } else {
    vue.append(el('div', { class: 'liste-matchs' },
      aVenir.map((match) => carteMatch(match, { naviguer }))));
  }

  if (passes.length) {
    vue.append(bouton(
      passesDeplies ? t('calendrier.replierPasses')
        : t('calendrier.masquerPasses', { n: passes.length }),
      {
        classe: 'bouton bouton-discret bouton-pleine-largeur',
        onclick: () => { passesDeplies = !passesDeplies; rendre(racine, { naviguer }); },
      },
    ));
    if (passesDeplies) {
      vue.append(el('h3', { class: 'sous-titre-section', text: t('calendrier.passes') }));
      vue.append(el('div', { class: 'liste-matchs liste-passes' },
        passes.map((match) => carteMatch(match, { naviguer, avecBoutons: false }))));
    }
  }

  vider(racine).append(vue);
}
