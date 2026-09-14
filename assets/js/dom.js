// Aides minimales pour construire le DOM sans bibliothèque.

import { t } from './langue.js';

/**
 * Crée un élément. Les clés de `attributs` deviennent des attributs, sauf
 * `class`, `text`, `html`, `dataset` et les gestionnaires `on*`.
 */
export function el(balise, attributs = {}, enfants = []) {
  const noeud = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle === 'class') noeud.className = valeur;
    else if (cle === 'text') noeud.textContent = valeur;
    else if (cle === 'dataset') Object.assign(noeud.dataset, valeur);
    else if (cle.startsWith('on')) noeud.addEventListener(cle.slice(2).toLowerCase(), valeur);
    else if (valeur === true) noeud.setAttribute(cle, '');
    else noeud.setAttribute(cle, valeur);
  }
  ajouter(noeud, enfants);
  return noeud;
}

export function ajouter(parent, enfants) {
  const liste = Array.isArray(enfants) ? enfants : [enfants];
  for (const enfant of liste) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    parent.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
  }
  return parent;
}

export function vider(noeud) {
  noeud.replaceChildren();
  return noeud;
}

export const $ = (selecteur, racine = document) => racine.querySelector(selecteur);
export const $$ = (selecteur, racine = document) => [...racine.querySelectorAll(selecteur)];

/** Icône SVG du jeu défini dans index.html. */
export function icone(nom, classe = 'icone') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icone-${nom}`);
  svg.append(use);
  return svg;
}

export function bouton(libelle, { icone: nomIcone, classe = 'bouton', ...reste } = {}) {
  const noeud = el('button', { type: 'button', class: classe, ...reste });
  if (nomIcone) noeud.append(icone(nomIcone));
  if (libelle) noeud.append(el('span', { text: libelle }));
  return noeud;
}

export function champ(etiquette, controle, aide) {
  return el('label', { class: 'champ' }, [
    el('span', { class: 'champ-etiquette', text: etiquette }),
    controle,
    aide ? el('span', { class: 'champ-aide', text: aide }) : null,
  ]);
}

export function selection(options, valeur, attributs = {}) {
  const noeud = el('select', attributs);
  for (const option of options) {
    const { valeur: v, libelle } = typeof option === 'string'
      ? { valeur: option, libelle: option }
      : option;
    noeud.append(el('option', { value: v, text: libelle, selected: v === valeur }));
  }
  noeud.value = valeur ?? '';
  return noeud;
}

/** Affiche un message éphémère en bas de l'écran. */
let minuteurMessage = null;
export function message(texte, variante = '') {
  let zone = $('#message');
  if (!zone) {
    zone = el('div', { id: 'message', class: 'message', role: 'status', 'aria-live': 'polite' });
    document.body.append(zone);
  }
  zone.className = `message ${variante}`.trim();
  zone.textContent = texte;
  zone.classList.add('visible');
  clearTimeout(minuteurMessage);
  minuteurMessage = setTimeout(() => zone.classList.remove('visible'), 3200);
}

/** Boîte de dialogue modale. `contenu` reçoit une fonction pour la fermer. */
export function dialogue(titre, contenu, { largeur = '' } = {}) {
  const modale = el('dialog', { class: 'dialogue', style: largeur ? `--largeur:${largeur}` : null });
  const fermer = () => modale.close();
  const fermeture = bouton('', {
    classe: 'bouton-icone', icone: 'fermer', onclick: fermer, 'aria-label': t('commun.fermer'),
  });
  modale.append(
    el('header', { class: 'dialogue-entete' }, [el('h2', { text: titre }), fermeture]),
    el('div', { class: 'dialogue-corps' }, contenu(fermer)),
  );
  modale.addEventListener('close', () => modale.remove());
  modale.addEventListener('click', (evenement) => {
    if (evenement.target === modale) fermer();
  });
  document.body.append(modale);
  modale.showModal();
  const premier = modale.querySelector('input, select, textarea, button:not(.bouton-icone)');
  if (premier) premier.focus();
  return modale;
}

export function confirmer(titre, texte, { libelleAction = '', danger = false } = {}) {
  return new Promise((resoudre) => {
    let reponse = false;
    const modale = dialogue(titre, (fermer) => [
      el('p', { class: 'dialogue-texte', text: texte }),
      el('div', { class: 'dialogue-actions' }, [
        bouton(t('commun.annuler'), { onclick: fermer }),
        bouton(libelleAction || t('commun.confirmer'), {
          classe: `bouton ${danger ? 'bouton-danger' : 'bouton-primaire'}`,
          onclick: () => { reponse = true; fermer(); },
        }),
      ]),
    ], { largeur: '26rem' });
    modale.addEventListener('close', () => resoudre(reponse));
  });
}
