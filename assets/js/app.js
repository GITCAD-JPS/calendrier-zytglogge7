// Point d'entrée : routage par ancre, barre de navigation, montage des vues.

import { $, ajouter, el, icone, message, vider } from './dom.js';
import { definirLangue, t } from './langue.js';
import * as store from './store.js';
import { appliquerTheme, suivreSysteme } from './theme.js';

import * as vueCalendrier from './vues/calendrier.js';
import * as vueMatch from './vues/match.js';
import * as vueTableau from './vues/tableau.js';
import * as vueSaison from './vues/saison.js';
import * as vueEquipe from './vues/equipe.js';
import * as vueReglages from './vues/reglages.js';

const ONGLETS = [
  { chemin: '/calendrier', cle: 'nav.calendrier', icone: 'calendrier' },
  { chemin: '/tableau', cle: 'nav.tableau', icone: 'tableau' },
  { chemin: '/saison', cle: 'nav.saison', icone: 'joueur' },
  { chemin: '/equipe', cle: 'nav.equipe', icone: 'equipe' },
  { chemin: '/reglages', cle: 'nav.reglages', icone: 'reglages' },
];

const ROUTES = [
  { motif: /^\/calendrier$/, vue: vueCalendrier, cle: 'nav.calendrier' },
  { motif: /^\/match\/([^/]+)$/, vue: vueMatch, cle: 'nav.calendrier', params: ['id'] },
  { motif: /^\/tableau$/, vue: vueTableau, cle: 'nav.tableau' },
  { motif: /^\/saison$/, vue: vueSaison, cle: 'nav.saison' },
  { motif: /^\/equipe$/, vue: vueEquipe, cle: 'nav.equipe' },
  { motif: /^\/reglages$/, vue: vueReglages, cle: 'nav.reglages' },
];

/** L'onglet Calendrier reste actif pendant qu'on regarde la fiche d'un match. */
const RATTACHE_AU_CALENDRIER = ['/match/'];

const principal = $('#principal');
let routeCourante = null;

function cheminCourant() {
  const ancre = location.hash.replace(/^#/, '');
  return ancre.startsWith('/') ? ancre : '/calendrier';
}

function resoudre(chemin) {
  for (const route of ROUTES) {
    const trouve = chemin.match(route.motif);
    if (!trouve) continue;
    const params = {};
    (route.params || []).forEach((nom, rang) => {
      params[nom] = decodeURIComponent(trouve[rang + 1]);
    });
    return { ...route, params };
  }
  return null;
}

/**
 * Navigue vers un chemin. `naviguer(null)` redessine la vue courante, ce dont
 * les vues se servent après une modification des données.
 */
function naviguer(chemin) {
  if (chemin === null || cheminCourant() === chemin) {
    rendre();
    return;
  }
  location.hash = chemin;
}

function rendre() {
  const chemin = cheminCourant();
  const route = resoudre(chemin);

  if (!route) {
    location.replace('#/calendrier');
    return;
  }
  const changementDeVue = routeCourante?.vue !== route.vue;
  routeCourante = route;
  document.title = `${t(route.cle)} — ${t('app.titre')}`;

  // Une vue est redessinée entièrement à chaque changement, y compris après
  // un simple clic sur un statut. Le clavier perdrait alors le bouton qu'il
  // venait d'actionner : les éléments qui portent un `data-focus` stable le
  // retrouvent.
  const focalise = document.activeElement?.dataset?.focus || '';

  if (changementDeVue) vider(principal);
  route.vue.rendre(principal, { naviguer, params: route.params });
  majOnglets(chemin);
  if (changementDeVue) principal.scrollTo({ top: 0 });
  else if (focalise) $(`[data-focus="${CSS.escape(focalise)}"]`)?.focus();
}

function majOnglets(chemin) {
  for (const lien of document.querySelectorAll('.onglet')) {
    const actif = chemin === lien.dataset.chemin
      || (lien.dataset.chemin === '/calendrier'
        && RATTACHE_AU_CALENDRIER.some((prefixe) => chemin.startsWith(prefixe)));
    lien.classList.toggle('actif', actif);
    if (actif) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }
}

function construireNavigation() {
  const barre = vider($('#navigation'));
  barre.setAttribute('aria-label', t('app.titre'));
  for (const onglet of ONGLETS) {
    barre.append(el('a', {
      class: 'onglet',
      href: `#${onglet.chemin}`,
      dataset: { chemin: onglet.chemin },
    }, [icone(onglet.icone), el('span', { text: t(onglet.cle) })]));
  }
}

/** Le titre de la page, qui porte le nom de l'équipe et la saison. */
function majEntete() {
  $('#titre-application').textContent = t('app.nom');
  $('#saison-application').textContent = store.saison();
}

async function demarrer() {
  window.addEventListener('hashchange', rendre);

  try {
    await store.charger();
  } catch (erreur) {
    console.error(erreur);
    vider(principal).append(el('div', { class: 'etat-vide' }, [
      el('h3', { text: t('app.erreurTitre') }),
      el('p', { text: t('app.erreurTexte') }),
      el('p', { class: 'discret', text: String(erreur.message || erreur) }),
    ]));
    return;
  }

  appliquerLangueEtTheme();
  suivreSysteme(() => store.preferences().theme);

  // Toute modification redessine la vue courante : une disponibilité annoncée
  // ici, une autre reçue d'un coéquipier, un changement de langue. Les vues
  // n'ont ainsi rien à faire pour rester justes, et une annonce venue d'un
  // autre téléphone apparaît toute seule.
  store.abonner(() => {
    appliquerLangueEtTheme();
    rendre();
  });

  document.body.classList.remove('chargement');
  avertirSiStockageRefuse();
  surveillerLePartage();
  rendre();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((erreur) => {
      console.info('Mode hors ligne indisponible', erreur);
    });
  }
}

let derniereLangue = '';

/**
 * Suit la langue et le thème choisis.
 *
 * Le thème se pose à chaque passage, il ne coûte qu'un attribut. La barre de
 * navigation, elle, n'est reconstruite que lorsque la langue change
 * réellement, parce que ses libellés sont les seuls textes qui vivent hors
 * des vues.
 */
function appliquerLangueEtTheme() {
  const { langue, theme } = store.preferences();
  appliquerTheme(theme);
  if (langue === derniereLangue) return;
  derniereLangue = langue;

  definirLangue(langue);
  majEntete();
  construireNavigation();
  retraduireBandeaux();
}

/**
 * Les bandeaux d'avertissement, posés une fois en haut de la page.
 *
 * Ils vivent hors des vues et survivent donc à leurs redessins. Ils gardent
 * pour cela la clé de leur texte plutôt que le texte lui-même : sans elle, un
 * bandeau né en français le resterait après un passage à l'allemand, seul
 * élément de l'écran à ne pas suivre.
 */
const bandeaux = [];

function ecrireBandeau(bandeau) {
  ajouter(vider(bandeau.noeud), [
    el('strong', { text: t(`${bandeau.cle}Titre`) }),
    el('span', { text: t(`${bandeau.cle}Texte`) }),
    bandeau.versReglages
      && el('a', { class: 'bandeau-lien', href: '#/reglages', text: t('synchro.ouvrirReglages') }),
  ]);
}

function poserBandeau(cle, { versReglages = false } = {}) {
  const bandeau = {
    noeud: el('div', { class: 'bandeau-alerte', role: 'status' }), cle, versReglages,
  };
  ecrireBandeau(bandeau);
  bandeaux.push(bandeau);
  document.body.prepend(bandeau.noeud);
}

const retraduireBandeaux = () => bandeaux.forEach(ecrireBandeau);

/**
 * Certains navigateurs refusent de garder quoi que ce soit à une page
 * affichée dans le cadre d'un autre site, ou en navigation privée. Mieux vaut
 * le dire franchement que de laisser croire à une disponibilité annoncée.
 */
function avertirSiStockageRefuse() {
  if (store.stockageDurable()) return;
  poserBandeau('synchro.stockage');
}

/**
 * Prévient quand ce calendrier ne rejoint aucun autre appareil.
 *
 * L'avertissement attend que le partage ait tranché : au démarrage il cherche
 * encore, et conclure trop tôt serait faux. Il mène aux réglages, car savoir
 * sans savoir quoi faire ne sert à rien.
 */
function surveillerLePartage() {
  const CAS = { sansCode: 'synchro.sansCode', local: 'synchro.local' };
  let annonce = false;

  const verifier = () => {
    const cas = CAS[store.etatPartage()];
    if (annonce || !cas) return;
    annonce = true;
    poserBandeau(cas, { versReglages: true });
  };
  store.abonner(verifier);
  verifier();
}

window.addEventListener('error', (evenement) => {
  console.error(evenement.error || evenement.message);
  message(t('app.erreurGenerale'), 'erreur');
});

demarrer();
