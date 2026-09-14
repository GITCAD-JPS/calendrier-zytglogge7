// Réglages : qui je suis, ma langue, le partage, mes données.

import { entete } from '../composants.js';
import {
  bouton, champ, confirmer, dialogue, el, message, selection, vider,
} from '../dom.js';
import { lireFichierJson, sauvegardeComplete } from '../export.js';
import { t } from '../langue.js';
import { trierParDate } from '../model.js';
import * as store from '../store.js';
import { versAgenda } from './match.js';

const section = (titre, enfants) => el('section', { class: 'bloc-reglages' }, [
  el('h3', { text: titre }),
  ...enfants,
]);

// --- identité, langue, thème ------------------------------------------------

function blocIdentite() {
  // Le titre de la section dit déjà « Mon nom » : le répéter en étiquette ne
  // servirait à personne, mais la liste a quand même besoin d'un nom pour qui
  // ne voit pas l'écran.
  const liste = selection(
    [{ valeur: '', libelle: t('reglages.personne') },
      ...store.joueurs().map((j) => ({ valeur: j.id, libelle: j.nom }))],
    store.preferences().moi,
    {
      class: 'champ-selection',
      'aria-label': t('reglages.identite'),
      onchange: (e) => store.enregistrerPreferences({ moi: e.target.value }),
    },
  );
  return section(t('reglages.identite'), [
    liste,
    el('p', { class: 'champ-aide', text: t('reglages.identiteAide') }),
  ]);
}

function blocAffichage() {
  const langues = selection(
    [{ valeur: 'fr', libelle: 'Français' }, { valeur: 'de', libelle: 'Deutsch' }],
    store.preferences().langue,
    {
      class: 'champ-selection',
      onchange: (e) => store.enregistrerPreferences({ langue: e.target.value }),
    },
  );
  const themes = selection(
    [{ valeur: 'auto', libelle: t('reglages.themeAuto') },
      { valeur: 'clair', libelle: t('reglages.themeClair') },
      { valeur: 'sombre', libelle: t('reglages.themeSombre') }],
    store.preferences().theme,
    {
      class: 'champ-selection',
      onchange: (e) => store.enregistrerPreferences({ theme: e.target.value }),
    },
  );
  return section(t('reglages.affichage'), [
    champ(t('reglages.langue'), langues, t('reglages.langueAide')),
    champ(t('reglages.theme'), themes),
  ]);
}

// --- partage ----------------------------------------------------------------

function demanderCode() {
  dialogue(t('reglages.rejoindre'), (fermer) => {
    const saisie = el('input', {
      type: 'text', class: 'champ-saisie', autocapitalize: 'off',
      autocomplete: 'off', spellcheck: 'false',
    });
    return [
      champ(t('reglages.codeLibelle'), saisie, t('reglages.codeAide')),
      el('div', { class: 'dialogue-actions' }, [
        bouton(t('commun.annuler'), { onclick: fermer }),
        bouton(t('commun.enregistrer'), {
          classe: 'bouton bouton-primaire',
          onclick: () => {
            const valeur = saisie.value.trim();
            if (!valeur) return;
            fermer();
            store.definirCodePartage(valeur);
          },
        }),
      ]),
    ];
  }, { largeur: '28rem' });
}

async function copier(code) {
  try {
    await navigator.clipboard.writeText(code);
    message(t('reglages.copie'));
  } catch {
    // Un presse-papiers refusé n'est pas une panne : le code reste lisible et
    // recopiable à la main, il ne faut donc pas annoncer une copie qui n'a
    // pas eu lieu.
    message(t('reglages.codeLibelle'), 'erreur');
  }
}

function blocPartage() {
  const code = store.codePartage();
  const contenu = [
    el('p', { class: `etat-synchro etat-${store.etatPartage()}` }, [
      el('span', { class: 'point-etat' }),
      el('span', { text: t(`synchro.${store.etatPartage()}`) }),
    ]),
  ];

  if (!store.partageConfigure()) {
    contenu.push(el('p', { class: 'discret', text: t('synchro.localTexte') }));
    return section(t('reglages.partage'), contenu);
  }

  if (code) {
    contenu.push(
      el('p', { class: 'code-partage', text: code }),
      el('p', { class: 'discret', text: t('reglages.codeAide') }),
      el('div', { class: 'boutons-ligne' }, [
        bouton(t('reglages.copier'), { onclick: () => copier(code) }),
        bouton(t('reglages.quitter'), {
          classe: 'bouton bouton-danger',
          onclick: () => store.definirCodePartage(''),
        }),
      ]),
    );
  } else {
    contenu.push(
      el('p', { class: 'discret', text: t('synchro.sansCodeTexte') }),
      el('div', { class: 'boutons-ligne' }, [
        bouton(t('reglages.creer'), {
          classe: 'bouton bouton-primaire',
          onclick: () => store.definirCodePartage(store.inventerCode()),
        }),
        bouton(t('reglages.rejoindre'), { onclick: demanderCode }),
      ]),
    );
  }
  return section(t('reglages.partage'), contenu);
}

// --- données ----------------------------------------------------------------

async function sauvegarder() {
  try {
    const issue = await sauvegardeComplete();
    if (issue === 'enregistre') message(t('commun.sauvegardeFaite'));
  } catch (erreur) {
    message(`${t('commun.sauvegardeRefusee')} : ${erreur.message}`, 'erreur');
  }
}

function restaurer(rendreDeNouveau) {
  const saisie = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  saisie.addEventListener('change', async () => {
    const fichier = saisie.files?.[0];
    if (!fichier) return;
    try {
      await store.importerJson(await lireFichierJson(fichier));
      message(t('commun.restaurationFaite'));
      rendreDeNouveau();
    } catch (erreur) {
      message(`${t('commun.fichierIllisible')} : ${erreur.message}`, 'erreur');
    } finally {
      saisie.remove();
    }
  });
  document.body.append(saisie);
  saisie.click();
}

async function remettreAZero(rendreDeNouveau) {
  const accepte = await confirmer(
    t('reglages.reinitialiserTitre'),
    t('reglages.reinitialiserTexte'),
    { libelleAction: t('reglages.reinitialiser'), danger: true },
  );
  if (!accepte) return;
  await store.reinitialiser();
  rendreDeNouveau();
}

function blocDonnees(rendreDeNouveau) {
  return section(t('reglages.donnees'), [
    el('div', { class: 'boutons-colonne' }, [
      bouton(t('reglages.sauvegarder'), { onclick: sauvegarder }),
      bouton(t('reglages.restaurer'), { onclick: () => restaurer(rendreDeNouveau) }),
      bouton(t('reglages.agenda'), { onclick: () => versAgenda(trierParDate(store.matchs())) }),
      bouton(t('reglages.reinitialiser'), {
        classe: 'bouton bouton-danger',
        onclick: () => remettreAZero(rendreDeNouveau),
      }),
    ]),
  ]);
}

export function rendre(racine, { naviguer }) {
  const rendreDeNouveau = () => naviguer(null);

  vider(racine).append(el('section', { class: 'vue vue-reglages' }, [
    entete(t('reglages.titre'), t('app.saison', { saison: store.saison() })),
    blocIdentite(),
    blocAffichage(),
    blocPartage(),
    blocDonnees(rendreDeNouveau),
    section(t('reglages.apropos'), [
      el('p', { class: 'discret', text: t('reglages.version', { version: store.VERSION_APP }) }),
      el('p', { class: 'discret', text: t('reglages.source') }),
    ]),
  ]));
}
