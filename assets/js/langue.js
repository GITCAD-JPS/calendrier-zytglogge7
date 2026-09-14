// Français et allemand, au choix de chaque appareil.
//
// L'équipe est bernoise et reçoit la planification en allemand, mais tout le
// monde ne lit pas les deux langues avec le même confort. La langue est donc
// un réglage local : elle ne voyage pas avec le partage, et chacun lit le même
// calendrier dans sa langue.
//
// Les termes du club ne se traduisent pas. BCM, CM, Rink et les statuts x, e,
// 0 sont l'usage des deux côtés, et les traduire ferait perdre le lien avec le
// tableau que Sébastien envoie.

export const LANGUES = ['fr', 'de'];

const REGIONS = { fr: 'fr-CH', de: 'de-CH' };

const TEXTES = {
  fr: {
    'app.nom': 'Zytglogge 7',
    'app.titre': 'Calendrier Zytglogge 7',
    'app.saison': 'Saison {saison}',
    'app.chargement': 'Chargement du calendrier…',
    'app.erreurTitre': 'Chargement impossible',
    'app.erreurTexte': "Le calendrier n'a pas pu être lu. Ouvrez l'application depuis "
      + 'un serveur web plutôt que directement depuis le fichier.',
    'app.erreurGenerale': 'Une erreur est survenue',

    'nav.calendrier': 'Calendrier',
    'nav.tableau': 'Tableau',
    'nav.saison': 'Ma saison',
    'nav.equipe': 'Équipe',
    'nav.reglages': 'Réglages',

    'statut.joue': 'Joue',
    'statut.remplacant': 'Remplaçant',
    'statut.absent': 'Ne peut pas',
    'statut.joue.moi': 'Je joue',
    'statut.remplacant.moi': 'Remplaçant',
    'statut.absent.moi': 'Je ne peux pas',

    'match.titre': 'Match du {date}',
    'match.contre': 'contre {adversaire}',
    'match.rink': 'Piste {rink}',
    'match.rinkInconnu': 'Piste à confirmer',
    'match.effectif': '{n}/4',
    'match.complet': 'Équipe complète',
    'match.manque': 'Il manque {n} joueur',
    'match.manquePluriel': 'Il manque {n} joueurs',
    'match.surnombre': '{n} joueur de trop',
    'match.surnombrePluriel': '{n} joueurs de trop',
    'match.titulaires': 'Sur la glace',
    'match.remplacants': 'Remplaçants',
    'match.absents': 'Ne peuvent pas',
    'match.aucunRemplacant': 'Aucun remplaçant disponible, il faut appeler quelqu’un',
    'match.remplacantsDisponibles': 'À appeler en priorité',
    'match.modifiePar': 'par {nom}, {date}',
    'match.jamaisModifie': 'du plan de Sébastien',
    'match.agenda': 'Ajouter à mon agenda',
    'match.scb': 'Le SCB joue à Berne ce soir-là',
    'match.passe': 'Match joué',
    'match.aujourdhui': "Aujourd'hui",
    'match.demain': 'Demain',
    'match.dansJours': 'Dans {n} jours',

    'calendrier.aVenir': 'À venir',
    'calendrier.passes': 'Déjà joués',
    'calendrier.saisonFinie': 'La saison est terminée. Rendez-vous l’an prochain.',
    'calendrier.masquerPasses': 'Voir les {n} matchs déjà joués',
    'calendrier.replierPasses': 'Masquer les matchs joués',
    'calendrier.incomplets': '{n} match à compléter',
    'calendrier.incompletsPluriel': '{n} matchs à compléter',

    'tableau.titre': 'Toute la saison',
    'tableau.date': 'Date',
    'tableau.heure': 'Heure',
    'tableau.adversaire': 'Adversaire',
    'tableau.total': 'Total',
    'tableau.legende': 'x joue · e remplaçant · 0 ne peut pas',
    'tableau.aide': 'Touchez une case pour changer un statut.',

    'saison.titre': 'Ma saison',
    'saison.qui': 'Qui êtes-vous ?',
    'saison.quiAide': 'Choisissez votre nom pour annoncer vos disponibilités d’un geste.',
    'saison.choisir': 'Choisir mon nom',
    'saison.joue': 'Matchs joués',
    'saison.remplacant': 'Comme remplaçant',
    'saison.absent': 'Indisponible',
    'saison.prochain': 'Mon prochain match',
    'saison.aucunProchain': 'Plus aucun match à venir pour vous.',
    'saison.repartition': 'Dix matchs BCM et huit CM cette saison',

    'equipe.titre': 'L’équipe',
    'equipe.matchs': '{n} matchs',
    'equipe.remplacements': '{n} fois remplaçant',
    'equipe.moi': 'C’est moi',
    'equipe.appeler': 'Appeler',
    'equipe.ecrire': 'Écrire',

    'reglages.titre': 'Réglages',
    'reglages.identite': 'Mon nom',
    'reglages.identiteAide': 'Sert aux boutons de disponibilité et à la vue « Ma saison ».',
    'reglages.personne': 'Pas encore choisi',
    'reglages.affichage': 'Affichage',
    'reglages.langue': 'Langue',
    'reglages.langueAide': 'Propre à cet appareil, les autres gardent la leur.',
    'reglages.theme': 'Thème',
    'reglages.themeClair': 'Clair',
    'reglages.themeSombre': 'Sombre',
    'reglages.themeAuto': 'Système',
    'reglages.partage': 'Partage entre les joueurs',
    'reglages.codeAide': 'Le code donne accès au calendrier. Recopiez-le sur les autres '
      + 'téléphones, et ne le publiez nulle part.',
    'reglages.creer': 'Créer le calendrier partagé',
    'reglages.rejoindre': 'Rejoindre avec un code',
    'reglages.quitter': 'Se détacher du partage',
    'reglages.copier': 'Copier le code',
    'reglages.copie': 'Code copié',
    'reglages.codeLibelle': 'Code du calendrier',
    'reglages.donnees': 'Données',
    'reglages.sauvegarder': 'Sauvegarde complète',
    'reglages.restaurer': 'Restaurer une sauvegarde',
    'reglages.agenda': 'Exporter la saison (.ics)',
    'reglages.reinitialiser': 'Repartir du plan de Sébastien',
    'reglages.reinitialiserTitre': 'Repartir du plan d’origine ?',
    'reglages.reinitialiserTexte': 'Toutes les disponibilités annoncées depuis seront '
      + 'perdues et le calendrier reviendra au tableau du mail.',
    'reglages.apropos': 'À propos',
    'reglages.version': 'Version {version}',
    'reglages.source': 'Planification de Sébastien Cettou du 12 septembre 2026',

    'synchro.titre': 'État du partage',
    'synchro.recherche': 'Vérification en cours…',
    'synchro.connecte': 'Partagé, tout le monde voit la même chose',
    'synchro.attente': 'En attente de réseau, vos changements partiront tout seuls',
    'synchro.sansCode': 'Pas encore partagé',
    'synchro.local': 'Partage indisponible sur cette version',
    'synchro.sansCodeTitre': 'Ce calendrier n’est pas encore partagé. ',
    'synchro.sansCodeTexte': 'Ce que vous annoncez reste dans ce navigateur. Créez le '
      + 'calendrier partagé, ou rejoignez-le avec son code, depuis les réglages.',
    'synchro.localTitre': 'Aucun partage possible sur cette version. ',
    'synchro.localTexte': 'Ce que vous annoncez reste dans ce navigateur et ne rejoindra '
      + 'aucun autre appareil.',
    'synchro.ouvrirReglages': 'Ouvrir les réglages',
    'synchro.stockageTitre': 'Vos changements ne seront pas conservés. ',
    'synchro.stockageTexte': 'Ce navigateur refuse le stockage à cette page. Exportez une '
      + 'sauvegarde depuis les réglages avant de fermer.',

    'commun.annuler': 'Annuler',
    'commun.confirmer': 'Confirmer',
    'commun.fermer': 'Fermer',
    'commun.enregistrer': 'Enregistrer',
    'commun.retour': 'Retour',
    'commun.sauvegardeFaite': 'Sauvegarde enregistrée',
    'commun.sauvegardeRefusee': 'La sauvegarde n’a pas pu être remise',
    'commun.restaurationFaite': 'Sauvegarde restaurée',
    'commun.fichierIllisible': 'Fichier illisible',
  },

  de: {
    'app.nom': 'Zytglogge 7',
    'app.titre': 'Spielplan Zytglogge 7',
    'app.saison': 'Saison {saison}',
    'app.chargement': 'Spielplan wird geladen…',
    'app.erreurTitre': 'Laden nicht möglich',
    'app.erreurTexte': 'Der Spielplan konnte nicht gelesen werden. Öffnen Sie die App '
      + 'über einen Webserver und nicht direkt aus der Datei.',
    'app.erreurGenerale': 'Ein Fehler ist aufgetreten',

    'nav.calendrier': 'Spielplan',
    'nav.tableau': 'Tabelle',
    'nav.saison': 'Meine Saison',
    'nav.equipe': 'Team',
    'nav.reglages': 'Einstellungen',

    'statut.joue': 'Spielt',
    'statut.remplacant': 'Ersatz',
    'statut.absent': 'Kann nicht',
    'statut.joue.moi': 'Ich spiele',
    'statut.remplacant.moi': 'Ersatz',
    'statut.absent.moi': 'Ich kann nicht',

    'match.titre': 'Spiel vom {date}',
    'match.contre': 'gegen {adversaire}',
    'match.rink': 'Rink {rink}',
    'match.rinkInconnu': 'Rink noch offen',
    'match.effectif': '{n}/4',
    'match.complet': 'Team komplett',
    'match.manque': 'Es fehlt {n} Spieler',
    'match.manquePluriel': 'Es fehlen {n} Spieler',
    'match.surnombre': '{n} Spieler zu viel',
    'match.surnombrePluriel': '{n} Spieler zu viel',
    'match.titulaires': 'Auf dem Eis',
    'match.remplacants': 'Ersatz',
    'match.absents': 'Können nicht',
    'match.aucunRemplacant': 'Kein Ersatz verfügbar, jemand muss angerufen werden',
    'match.remplacantsDisponibles': 'Zuerst anrufen',
    'match.modifiePar': 'von {nom}, {date}',
    'match.jamaisModifie': 'aus Sébastiens Planung',
    'match.agenda': 'Zum Kalender hinzufügen',
    'match.scb': 'Der SCB spielt an diesem Abend in Bern',
    'match.passe': 'Gespielt',
    'match.aujourdhui': 'Heute',
    'match.demain': 'Morgen',
    'match.dansJours': 'In {n} Tagen',

    'calendrier.aVenir': 'Kommende Spiele',
    'calendrier.passes': 'Bereits gespielt',
    'calendrier.saisonFinie': 'Die Saison ist zu Ende. Bis nächstes Jahr.',
    'calendrier.masquerPasses': 'Die {n} gespielten Spiele anzeigen',
    'calendrier.replierPasses': 'Gespielte Spiele ausblenden',
    'calendrier.incomplets': '{n} Spiel unvollständig',
    'calendrier.incompletsPluriel': '{n} Spiele unvollständig',

    'tableau.titre': 'Ganze Saison',
    'tableau.date': 'Datum',
    'tableau.heure': 'Zeit',
    'tableau.adversaire': 'Gegner',
    'tableau.total': 'Total',
    'tableau.legende': 'x spielt · e Ersatz · 0 kann nicht spielen',
    'tableau.aide': 'Auf ein Feld tippen, um den Status zu ändern.',

    'saison.titre': 'Meine Saison',
    'saison.qui': 'Wer sind Sie?',
    'saison.quiAide': 'Wählen Sie Ihren Namen, um Ihre Verfügbarkeit mit einem Tipp zu melden.',
    'saison.choisir': 'Meinen Namen wählen',
    'saison.joue': 'Gespielte Spiele',
    'saison.remplacant': 'Als Ersatz',
    'saison.absent': 'Nicht verfügbar',
    'saison.prochain': 'Mein nächstes Spiel',
    'saison.aucunProchain': 'Für Sie stehen keine Spiele mehr an.',
    'saison.repartition': 'Zehn BCM- und acht CM-Spiele in dieser Saison',

    'equipe.titre': 'Das Team',
    'equipe.matchs': '{n} Spiele',
    'equipe.remplacements': '{n}× Ersatz',
    'equipe.moi': 'Das bin ich',
    'equipe.appeler': 'Anrufen',
    'equipe.ecrire': 'Mail',

    'reglages.titre': 'Einstellungen',
    'reglages.identite': 'Mein Name',
    'reglages.identiteAide': 'Für die Verfügbarkeits-Knöpfe und «Meine Saison».',
    'reglages.personne': 'Noch nicht gewählt',
    'reglages.affichage': 'Darstellung',
    'reglages.langue': 'Sprache',
    'reglages.langueAide': 'Gilt nur für dieses Gerät, die anderen behalten ihre Sprache.',
    'reglages.theme': 'Darstellung',
    'reglages.themeClair': 'Hell',
    'reglages.themeSombre': 'Dunkel',
    'reglages.themeAuto': 'System',
    'reglages.partage': 'Teilen mit den Mitspielern',
    'reglages.codeAide': 'Der Code öffnet den Spielplan. Auf den anderen Handys eintragen '
      + 'und nirgends veröffentlichen.',
    'reglages.creer': 'Geteilten Spielplan erstellen',
    'reglages.rejoindre': 'Mit Code beitreten',
    'reglages.quitter': 'Vom Teilen lösen',
    'reglages.copier': 'Code kopieren',
    'reglages.copie': 'Code kopiert',
    'reglages.codeLibelle': 'Code des Spielplans',
    'reglages.donnees': 'Daten',
    'reglages.sauvegarder': 'Vollständige Sicherung',
    'reglages.restaurer': 'Sicherung wiederherstellen',
    'reglages.agenda': 'Saison exportieren (.ics)',
    'reglages.reinitialiser': 'Zurück zu Sébastiens Planung',
    'reglages.reinitialiserTitre': 'Zurück zur ursprünglichen Planung?',
    'reglages.reinitialiserTexte': 'Alle seither gemeldeten Verfügbarkeiten gehen '
      + 'verloren und der Spielplan entspricht wieder der Tabelle aus dem Mail.',
    'reglages.apropos': 'Über die App',
    'reglages.version': 'Version {version}',
    'reglages.source': 'Planung von Sébastien Cettou vom 12. September 2026',

    'synchro.titre': 'Stand des Teilens',
    'synchro.recherche': 'Wird geprüft…',
    'synchro.connecte': 'Geteilt, alle sehen dasselbe',
    'synchro.attente': 'Wartet auf Netz, Ihre Änderungen gehen von selbst raus',
    'synchro.sansCode': 'Noch nicht geteilt',
    'synchro.local': 'Teilen in dieser Version nicht möglich',
    'synchro.sansCodeTitre': 'Dieser Spielplan wird noch nicht geteilt. ',
    'synchro.sansCodeTexte': 'Was Sie melden, bleibt in diesem Browser. Erstellen Sie den '
      + 'geteilten Spielplan oder treten Sie ihm mit dem Code bei, in den Einstellungen.',
    'synchro.localTitre': 'Teilen ist in dieser Version nicht möglich. ',
    'synchro.localTexte': 'Was Sie melden, bleibt in diesem Browser und erreicht kein '
      + 'anderes Gerät.',
    'synchro.ouvrirReglages': 'Einstellungen öffnen',
    'synchro.stockageTitre': 'Ihre Änderungen werden nicht behalten. ',
    'synchro.stockageTexte': 'Dieser Browser verweigert der Seite den Speicher. Sichern '
      + 'Sie über die Einstellungen, bevor Sie schliessen.',

    'commun.annuler': 'Abbrechen',
    'commun.confirmer': 'Bestätigen',
    'commun.fermer': 'Schliessen',
    'commun.enregistrer': 'Speichern',
    'commun.retour': 'Zurück',
    'commun.sauvegardeFaite': 'Sicherung gespeichert',
    'commun.sauvegardeRefusee': 'Die Sicherung konnte nicht übergeben werden',
    'commun.restaurationFaite': 'Sicherung wiederhergestellt',
    'commun.fichierIllisible': 'Datei nicht lesbar',
  },
};

let courante = 'fr';

export const langue = () => courante;

export function definirLangue(code) {
  courante = LANGUES.includes(code) ? code : 'fr';
  document.documentElement.lang = courante;
  return courante;
}

/** La langue du navigateur, tant que personne n'a choisi : allemand à Berne. */
export function langueInitiale() {
  const preferees = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const etiquette of preferees) {
    const code = String(etiquette || '').slice(0, 2).toLowerCase();
    if (LANGUES.includes(code)) return code;
  }
  return 'fr';
}

/**
 * Le texte d'une clé, avec ses trous comblés.
 *
 * Une clé absente se rend telle quelle plutôt que vide : un libellé étrange
 * saute aux yeux et se corrige, un libellé vide laisse un bouton muet.
 */
export function t(cle, valeurs = {}) {
  const modele = TEXTES[courante][cle] ?? TEXTES.fr[cle] ?? cle;
  return modele.replace(/\{(\w+)\}/g, (entier, nom) => (
    Object.hasOwn(valeurs, nom) ? String(valeurs[nom]) : entier
  ));
}

/** Choisit entre le singulier et le pluriel, pour les clés qui ont les deux. */
export const tn = (cle, n, valeurs = {}) => t(n > 1 ? `${cle}Pluriel` : cle, { n, ...valeurs });

// --- dates ------------------------------------------------------------------

const formats = new Map();

function formateur(options) {
  const cle = `${courante}:${JSON.stringify(options)}`;
  if (!formats.has(cle)) formats.set(cle, new Intl.DateTimeFormat(REGIONS[courante], options));
  return formats.get(cle);
}

/** « 7 octobre 2026 » ou « 7. Oktober 2026 », sans table à tenir. */
export const formaterDate = (iso, options = { day: 'numeric', month: 'long', year: 'numeric' }) => (
  formateur(options).format(new Date(`${iso}T12:00:00`))
);

export const formaterJourEtDate = (iso) => formaterDate(iso, {
  weekday: 'long', day: 'numeric', month: 'long',
});

export const formaterDateCourte = (iso) => formaterDate(iso, {
  day: '2-digit', month: '2-digit', year: '2-digit',
});

export const formaterJourAbrege = (iso) => formaterDate(iso, { weekday: 'short' });

/** « le 3 mars à 14:12 », pour dire quand un statut a été touché. */
export function formaterInstant(iso) {
  if (!iso) return '';
  const quand = new Date(iso);
  if (Number.isNaN(quand.getTime())) return '';
  return formateur({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(quand);
}
