# Calendrier Zytglogge 7

Application web pour le calendrier de présence du **CC Zytglogge 7**, saison
2026/27, groupe BCM C1. Elle reprend le tableau que Sébastien Cettou envoie
chaque année et le rend vivant : chacun annonce ses disponibilités depuis son
téléphone, et tout le monde voit le même état à la seconde.

Un mail ne se met pas à jour. Dès que quelqu'un tombe malade ou qu'un
remplaçant prend sa place, la version que chacun a sous les yeux devient
fausse, et il faut téléphoner pour savoir qui joue vraiment. C'est ce
téléphone-là que l'application supprime.

## Ce qu'elle fait

**Le calendrier**
- Les dix-huit matchs de la saison, le prochain en tête, avec l'heure, la piste et l'adversaire
- Trois boutons pour annoncer sa disponibilité sans rien ouvrir
- L'effectif du jour sur chaque carte, `4/4` quand l'équipe est au complet
- Un bandeau en tête de liste dès qu'un match à venir n'est plus complet

**La fiche d'un match**
- Les huit joueurs, leur statut, et qui l'a annoncé quand
- Quand il manque quelqu'un, les remplaçants disponibles remontent avec leur numéro, prêts à être appelés d'un geste
- Le match s'ajoute à l'agenda du téléphone

**Le tableau**
- La grille du mail à l'identique, dix-huit lignes, huit colonnes, les signes `x`, `e` et `0`
- Les trois lignes de totaux du bas, BCM, CM et général, recalculées en direct
- Une case se change d'une touche
- La colonne des dates reste visible pendant qu'on fait défiler les joueurs

**Ma saison**
- Mes matchs, mes totaux, et les prochains où je suis attendu

**L'équipe**
- La liste téléphonique du mail, avec appel et courriel d'un geste
- Le compte des matchs de chacun

**Le reste**
- Français ou allemand, au choix de chaque appareil
- Fonctionne hors ligne, installable sur l'écran d'accueil
- Thème clair, sombre ou celui du système
- Sauvegarde complète en JSON, export de la saison en `.ics`

## Une équipe de curling compte quatre joueurs

C'est la règle qui commande toute l'application. Chacun des dix-huit matchs du
plan de Sébastien aligne exactement quatre `x`. Une case qui passe à `0` fait
tomber le match à trois, et c'est précisément l'instant où il faut appeler un
remplaçant.

L'application compte donc en permanence. Elle affiche `4/4` ou `3/4`, signale
les matchs incomplets en tête du calendrier, et met en avant les `e`
disponibles avec leur numéro. Le reste du temps elle ne dit rien, parce qu'il
n'y a rien à dire.

## Utiliser l'application

Le site est publié sur GitHub Pages par `.github/workflows/pages.yml`, à chaque
poussée. Sur le téléphone, ouvrir l'adresse puis « Ajouter à l'écran
d'accueil » installe l'application comme une application native, avec son
icône. Une fois ouverte, elle reste consultable sans réseau.

### Activer la publication, une fois pour toutes

Créer un site GitHub Pages exige les droits d'administration du dépôt, que
GitHub ne donne jamais au jeton automatique des workflows. Cette étape ne peut
donc pas être automatisée : dans **Settings → Pages → Source**, choisir
**GitHub Actions**. Le workflow prend ensuite le relais et republie seul.

### En local

Le site est entièrement statique, sans installation ni compilation, mais il
faut le servir par un serveur web : le navigateur refuse de charger des
modules JavaScript depuis un fichier ouvert directement.

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans un navigateur.

## Activer le partage

Tant que la base n'est pas configurée, l'application fonctionne normalement
mais pour elle seule, et le dit par un bandeau plutôt que de laisser croire à
un partage qui n'existe pas. Quatre étapes l'allument, et elles demandent un
compte Google.

**1. Créer le projet.** Sur https://console.firebase.google.com, créer un
projet. Google Analytics n'est pas nécessaire.

**2. Activer la base.** Dans **Build → Firestore Database**, créer une base en
mode natif, région `eur3` ou `europe-west6`.

**3. Poser la règle de sécurité.** Dans l'onglet **Rules**, remplacer le
contenu par ceci, puis publier.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Le code fait partie du chemin : qui ne l'a pas ne trouve rien.
    // La longueur minimale interdit de balayer les codes courts.
    match /equipes/{code}/{document=**} {
      allow read, write: if code.size() >= 16;
    }
  }
}
```

**4. Reporter les coordonnées.** Dans **Paramètres du projet → Général**,
ajouter une application Web et relever `projectId` et `apiKey`, puis les
écrire dans `assets/js/nuage-configuration.js`.

```js
export const CONFIGURATION = {
  projet: 'votre-projet',
  cle: 'AIza…',
  racine: 'https://firestore.googleapis.com/v1',
};
```

Ces deux valeurs sont publiques par nature : elles voyagent dans chaque page
servie. Ce n'est pas elles qui protègent le calendrier.

### Le code d'accès

La protection tient à un **code long et imprévisible** qui fait partie du
chemin des données. Qui ne l'a pas ne trouve rien, exactement comme un lien
privé. C'est ce qui convient à une équipe de huit personnes, et il faut le
savoir : quiconque obtient le code voit le calendrier et peut le modifier.

Le code se crée une fois depuis les réglages, puis se recopie sur les sept
autres téléphones par « Rejoindre avec un code ». Ne le publiez nulle part.

## Comment le partage fonctionne

L'application est locale d'abord : elle lit et écrit dans le navigateur,
s'affiche instantanément et fonctionne sans réseau. Quand un calendrier
partagé est configuré, `assets/js/nuage.js` s'y branche en plus, et les
appareils qui portent le même code voient le même calendrier.

Le partage passe par une base Firestore atteinte directement en HTTP, sans
aucune bibliothèque à charger. Une page statique suffit donc : pas de serveur
à tenir, pas de compte à créer, pas de connexion à demander à qui que ce soit.

**Chaque case du tableau est une fiche à elle seule**, et non chaque match.
C'est ce qui permet à huit personnes d'annoncer leurs disponibilités en même
temps sans s'écraser : Patricia et Luc qui répondent tous les deux pour le 7
octobre ne touchent jamais la même fiche. Deux appareils n'entrent en conflit
que sur la disponibilité d'un même joueur pour un même match, et le dernier
écrit l'emporte.

Chaque fiche porte la date à laquelle un appareil l'a modifiée, et non celle
de son envoi. C'est elle qui départage deux appareils : celui qui retrouve le
réseau après deux jours ne passe pas pour le plus à jour. Elle règle aussi
l'arrivée d'un huitième téléphone, qui part du même plan, avec les mêmes
identifiants, et n'a donc rien à apporter tant qu'il n'a rien annoncé.

Firestore n'offre pas d'écoute temps réel en HTTP simple. Plutôt que de relire
le calendrier entier sans arrêt, l'application interroge toutes les huit
secondes un minuscule document témoin, mis à jour à chaque écriture. Le
calendrier n'est relu que lorsqu'il change, ce qui laisse le trafic à quelques
centaines d'octets tant que personne ne touche à rien.

Une annonce faite hors réseau est conservée et envoyée à la reprise. Les
réglages indiquent où en est le partage, et distinguent : vérification en
cours, actif, en attente de réseau, pas encore partagé, ou impossible sur
cette version faute de base configurée.

## Où sont les données

Au premier lancement, l'application lit `data/seed.json` et le recopie dans le
navigateur. Ensuite, tout est lu et écrit localement.

| Emplacement | Contenu |
| --- | --- |
| `localStorage` | Les joueurs, les matchs, les disponibilités, les préférences |
| `data/seed.json` | Le point de départ, jamais modifié par l'application |
| `data/planning_2026_2027.msg` | Le mail d'origine, conservé tel quel |

Sans partage configuré, les données vivent dans un seul navigateur et ne
suivent pas d'un appareil à l'autre. Le bouton « Sauvegarde complète » des
réglages télécharge un fichier JSON que « Restaurer une sauvegarde » relit sur
un autre appareil. Cette sauvegarde reste utile même avec le partage, pour
garder une copie hors de l'application.

Vider les données de site du navigateur efface le calendrier local. Le partage
ou une sauvegarde régulière sont les deux protections.

## Réimporter la planification

Sébastien enverra le même mail l'an prochain. Le script relit le message
Outlook et régénère `data/seed.json`.

```bash
pip install olefile compressed-rtf beautifulsoup4
python3 tools/msg_vers_seed.py                       # lit data/planning_2026_2027.msg
python3 tools/msg_vers_seed.py autre_message.msg     # ou un autre message
```

Le chemin est moins direct qu'il n'y paraît. Un `.msg` est un conteneur OLE,
le corps du message y est un RTF compressé, et ce RTF encapsule le HTML
d'origine plutôt que de le remplacer. Le script ouvre le conteneur,
décompresse, déballe le HTML de son emballage RTF, puis lit le tableau.

Deux contrôles méritent d'être signalés, parce qu'ils décident de la
confiance qu'on peut accorder au résultat.

**Les totaux.** Le script recompte les dix-huit lignes et confronte le
résultat aux vingt-sept totaux que le mail affiche en bas de son tableau. Si
la lecture des colonnes glisse d'un cran, les totaux ne tombent plus et le
script s'arrête, au lieu de livrer une saison fausse qui ne se verrait qu'en
janvier. Il vérifie aussi que chaque date tombe bien le jour de la semaine que
le mail annonce.

**Les contacts.** Le tableau dit « Peter W », « Sebu » et « JP », la liste
téléphonique dit « Peter Wyss », « Sébastien » et « Jean-Philippe », et les
destinataires du message portent les noms complets à côté de leur adresse. Le
script rejoint les trois, affiche le rapprochement obtenu pour qu'il soit
relu, et laisse sans contact plutôt que mal rattaché tout joueur qu'il ne sait
pas identifier. Un numéro de téléphone attribué au mauvais joueur coûterait
plus cher qu'une case vide.

## Organisation du code

```
.github/workflows/         publication automatique sur GitHub Pages
index.html                 coquille de la page et jeu d'icônes SVG
manifest.webmanifest       description de l'application installable
sw.js                      service worker : mise en cache pour l'hors ligne
assets/css/styles.css      feuille de style unique, mobile d'abord
assets/js/
  app.js                   routage par ancre, navigation, démarrage
  langue.js                dictionnaire français et allemand, formats de date
  model.js                 statuts, effectif d'un match, totaux
  store.js                 état, persistance, annonces de disponibilité
  nuage.js                 partage du calendrier entre appareils
  nuage-configuration.js   coordonnées de la base, vides au départ
  composants.js            fragments d'interface partagés
  dom.js                   aides pour construire le DOM
  theme.js                 thème clair, sombre ou système
  export.js                sauvegarde JSON, export iCalendar
  vues/                    une vue par onglet, plus la fiche d'un match
data/                      le mail d'origine et le jeu de données initial
tools/msg_vers_seed.py     import du mail vers data/seed.json
```

Le code n'utilise aucune bibliothèque ni étape de compilation : des modules
JavaScript natifs, servis tels quels. Modifier un fichier et recharger la page
suffit. Après une modification, il faut incrémenter `VERSION` dans `sw.js`
pour que les navigateurs déjà visités récupèrent la nouvelle version, et
`VERSION_APP` dans `store.js` pour que les réglages l'affichent.

## Source

Planification de la saison 2026/27 envoyée par Sébastien Cettou le 12
septembre 2026, conservée dans `data/planning_2026_2027.msg`.
