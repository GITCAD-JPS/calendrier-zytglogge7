#!/usr/bin/env python3
"""Relit la planification envoyée par Sébastien et régénère data/seed.json.

Sébastien envoie chaque année le même message Outlook : un tableau de la
saison, une ligne par match, une colonne par joueur, et la liste téléphonique
en dessous. Ce script en fait le point de départ de l'application, pour que la
saison suivante ne se recopie pas à la main.

    pip install olefile compressed-rtf beautifulsoup4
    python3 tools/msg_vers_seed.py                     # lit data/planning_2026_2027.msg
    python3 tools/msg_vers_seed.py autre_message.msg   # ou un autre message

Le chemin est moins direct qu'il n'y paraît. Un .msg est un conteneur OLE, le
corps du message y est un RTF compressé, et ce RTF encapsule le HTML d'origine
plutôt que de le remplacer. Il faut donc ouvrir le conteneur, décompresser,
puis déballer le HTML de son emballage RTF avant de voir enfin le tableau.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

import compressed_rtf
import olefile
from bs4 import BeautifulSoup

RACINE = Path(__file__).resolve().parent.parent
MESSAGE_PAR_DEFAUT = RACINE / 'data' / 'planning_2026_2027.msg'
SORTIE = RACINE / 'data' / 'seed.json'

# Flux du conteneur OLE. Les codes viennent de la spécification MAPI : 0x1009
# porte le corps RTF compressé, 0x1000 le corps en texte simple.
FLUX_RTF = '__substg1.0_10090102'
FLUX_TEXTE = '__substg1.0_1000001F'

# Ce que veut dire chaque case du tableau. Le mail donne sa propre légende :
# « X = spielt, E = Ersatz, 0 = kann nicht spielen ».
STATUTS = {'x': 'joue', 'e': 'remplacant', '0': 'absent'}

# Le mail ne donne que le jour et le mois abrégés sur deux chiffres. L'année
# de la saison tranche entre 2026 et 2027.
JOURS = {'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7}


# --- lecture du message -----------------------------------------------------


def corps_html(chemin: Path) -> str:
    """Rend le HTML du message, déballé de son emballage RTF."""
    with olefile.OleFileIO(str(chemin)) as ole:
        if not ole.exists(FLUX_RTF):
            raise SystemExit(f'{chemin.name} ne contient pas de corps RTF.')
        compresse = ole.openstream(FLUX_RTF).read()
    rtf = compressed_rtf.decompress(compresse).decode('latin-1', errors='replace')
    return deballer_html(rtf)


def deballer_html(rtf: str) -> str:
    """Extrait le HTML qu'un RTF encapsulé garde à l'intérieur.

    Outlook range le HTML d'origine dans des destinations `\\*\\htmltag`, et
    intercale du RTF de rendu pour les lecteurs qui ne savent pas lire le HTML.
    Les bascules `\\htmlrtf` et `\\htmlrtf0` délimitent ce RTF de rendu : le
    texte qu'elles encadrent est à jeter, celui qui reste est le contenu.
    """
    morceaux: list[str] = []
    position, fin = 0, len(rtf)
    texte_utile = True

    while position < fin:
        if rtf.startswith('{\\*\\htmltag', position):
            fermeture = fin_du_groupe(rtf, position)
            groupe = rtf[position:fermeture]
            entete = re.match(r'\{\\\*\\htmltag\d+ ?', groupe)
            morceaux.append(groupe[entete.end():] if entete else '')
            position = fermeture + 1
            continue

        if rtf.startswith('\\htmlrtf0', position):
            texte_utile = True
            position += len('\\htmlrtf0')
            continue
        if rtf.startswith('\\htmlrtf', position):
            texte_utile = False
            position += len('\\htmlrtf')
            continue

        if rtf[position] == '\\':
            octet = re.match(r"\\'([0-9a-fA-F]{2})", rtf[position:])
            if octet:
                if texte_utile:
                    morceaux.append(bytes([int(octet.group(1), 16)])
                                    .decode('cp1252', errors='replace'))
                position += 4
                continue
            commande = re.match(r'\\([a-zA-Z]+)(-?\d+)? ?', rtf[position:])
            position += commande.end() if commande else 2
            continue

        if rtf[position] in '{}':
            position += 1
            continue

        if texte_utile:
            morceaux.append(rtf[position])
        position += 1

    return ''.join(morceaux)


def fin_du_groupe(rtf: str, debut: int) -> int:
    """Position de l'accolade qui ferme le groupe ouvert en `debut`."""
    profondeur = 0
    for index in range(debut, len(rtf)):
        if rtf[index] == '{':
            profondeur += 1
        elif rtf[index] == '}':
            profondeur -= 1
            if profondeur == 0:
                return index
    return len(rtf)


def lignes_du_tableau(html: str) -> list[list[str]]:
    soup = BeautifulSoup(html, 'html.parser')
    tableau = soup.find('table')
    if tableau is None:
        raise SystemExit('Aucun tableau trouvé dans le message.')
    lignes = []
    for tr in tableau.find_all('tr'):
        lignes.append([
            td.get_text(' ', strip=True).replace('\xa0', ' ').strip()
            for td in tr.find_all('td')
        ])
    return lignes


# --- interprétation du tableau ----------------------------------------------


def identifiant(valeur: str) -> str:
    """Un identifiant stable et lisible, tiré d'un nom."""
    sans_accent = unicodedata.normalize('NFKD', valeur)
    sans_accent = ''.join(c for c in sans_accent if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', sans_accent.lower()).strip('-')


def trouver_entete(lignes: list[list[str]]) -> int:
    for index, ligne in enumerate(lignes):
        if ligne and ligne[0] == 'Tag':
            return index
    raise SystemExit("Ligne d'en-tête « Tag » introuvable.")


def joueurs_de_l_entete(entete: list[str]) -> list[dict]:
    """Les joueurs sont les colonnes qui suivent celle du SCB.

    Le tableau commence par cinq colonnes fixes, puis l'adversaire dans une
    colonne sans titre, puis le SCB. Tout ce qui vient après est un joueur.
    """
    depart = entete.index('SCB') + 1
    noms = [nom for nom in entete[depart:] if nom]
    return [
        {'id': identifiant(nom), 'abrege': nom, 'ordre': rang}
        for rang, nom in enumerate(noms, start=1)
    ]


def date_du_match(jour_abrege: str, date_courte: str, annee_depart: int) -> str:
    """« Mi », « 07.10.26 » → « 2026-10-07 »."""
    jour, mois, annee = (int(part) for part in date_courte.split('.'))
    complete = date(2000 + annee, mois, jour)
    if complete.year not in (annee_depart, annee_depart + 1):
        raise SystemExit(f'Date hors saison : {date_courte}')
    attendu = JOURS.get(jour_abrege)
    if attendu and complete.isoweekday() != attendu:
        raise SystemExit(
            f'{date_courte} tombe un {complete.isoweekday()}, le mail dit {jour_abrege}.'
        )
    return complete.isoformat()


def lire_matchs(lignes: list[list[str]], depart: int, joueurs: list[dict],
                annee: int) -> tuple[list[dict], list[dict]]:
    matchs: list[dict] = []
    presences: list[dict] = []
    premiere_colonne_joueur = 7

    for ligne in lignes[depart:]:
        if len(ligne) < premiere_colonne_joueur + len(joueurs):
            break
        jour, date_courte, heure, rink, championnat, adversaire, scb = ligne[:7]
        if not re.fullmatch(r'\d{2}\.\d{2}\.\d{2}', date_courte or ''):
            break  # les lignes de totaux et la légende commencent ici

        identite = f'm{len(matchs) + 1:02d}'
        matchs.append({
            'id': identite,
            'ordre': len(matchs) + 1,
            'date': date_du_match(jour, date_courte, annee),
            'heure': heure.replace('.', ':'),
            'rink': rink,
            'championnat': championnat,
            'adversaire': adversaire,
            'scb': bool(scb.strip()),
        })

        cases = ligne[premiere_colonne_joueur:premiere_colonne_joueur + len(joueurs)]
        for joueur, case in zip(joueurs, cases):
            statut = STATUTS.get(case.strip().lower())
            if statut is None:
                raise SystemExit(f'Case incomprise « {case} » le {date_courte}.')
            presences.append({
                'id': f"{identite}__{joueur['id']}",
                'matchId': identite,
                'joueurId': joueur['id'],
                'statut': statut,
                'modifieLe': '',
                'modifiePar': '',
            })

    if not matchs:
        raise SystemExit('Aucun match lu dans le tableau.')
    return matchs, presences


def lire_totaux(lignes: list[list[str]], nombre_de_joueurs: int) -> dict[str, list[int]]:
    """Les trois lignes de totaux du mail, qui serviront à se contrôler."""
    totaux = {}
    for ligne in lignes:
        if len(ligne) < 7 + nombre_de_joueurs:
            continue
        etiquette = ligne[4]
        if etiquette in ('BCM', 'CM', 'Total') and ligne[5].isdigit():
            valeurs = ligne[7:7 + nombre_de_joueurs]
            if all(valeur.isdigit() for valeur in valeurs):
                totaux[etiquette] = [int(valeur) for valeur in valeurs]
    return totaux


def lire_destinataires(ole: olefile.OleFileIO) -> dict[str, str]:
    """Les destinataires du message : adresse en clé, nom complet en valeur.

    Chaque destinataire est un sous-dossier du conteneur, où 0x3001 porte le
    nom affiché et 0x39FE l'adresse. C'est la seule source du message qui
    donne les noms de famille.
    """
    def champ(dossier: str, code: str) -> str:
        flux = ole.openstream(f'{dossier}/__substg1.0_{code}').read()
        return flux.decode('utf-16-le').strip('\x00').strip()

    noms = {}
    for dossier in {e[0] for e in ole.listdir() if e[0].startswith('__recip_version1.0')}:
        try:
            nom, adresse = champ(dossier, '3001001F'), champ(dossier, '39FE001F')
        except OSError:
            continue
        if nom and '@' in adresse:
            noms[adresse.lower()] = nom
    return noms


def lire_contacts(texte: str) -> dict[str, dict]:
    """La liste téléphonique sous le tableau, rattachée aux joueurs par le prénom."""
    contacts = {}
    motif = re.compile(
        r'^(?P<nom>[^\n:]{3,40}?)\s*:?\s*\n\s*N:\s*(?P<tel>[\d\s]{9,20})\s*\n'
        r'(?:\s*\n)*\s*(?P<courriel>[\w.+-]+@[\w.-]+\.\w+)',
        re.MULTILINE,
    )
    for trouve in motif.finditer(texte):
        nom = trouve.group('nom').strip()
        contacts[nom] = {
            'nom': nom,
            'telephone': ' '.join(trouve.group('tel').split()),
            'courriel': trouve.group('courriel'),
        }
    return contacts


def correspond(abrege: str, nom_complet: str) -> bool:
    """Le joueur de la colonne `abrege` est-il la personne `nom_complet` ?

    Les deux listes du mail ne s'écrivent pas pareil : le tableau dit
    « Peter W », « Sebu » et « JP », la liste téléphonique dit « Peter Wyss »,
    « Sébastien » et « Jean-Philippe ». Deux règles suffisent à les rejoindre,
    et un rattachement faux coûterait cher — c'est un numéro de téléphone.

    1. Même début de prénom, et même initiale de famille quand la colonne en
       porte une. C'est ce qui sépare « Peter W » de « Peter A ».
    2. La colonne est faite des initiales du nom complet, ce qui règle « JP ».
    """
    morceaux = identifiant(abrege).split('-')
    prenom, initiale = morceaux[0], (morceaux[1] if len(morceaux) > 1 else '')
    cible = identifiant(nom_complet).split('-')

    if ''.join(partie[0] for partie in cible) == prenom:
        return True

    if cible[0][:3] != prenom[:3]:
        return False
    return not initiale or (len(cible) > 1 and cible[1].startswith(initiale))


def rattacher_contacts(joueurs: list[dict], contacts: dict[str, dict],
                       noms_complets: dict[str, str]) -> None:
    """Donne à chaque joueur son téléphone, son courriel et son nom complet.

    Un contact déjà pris ne peut plus l'être : deux joueurs ne repartent
    jamais avec le même numéro. Un joueur que le mail ne liste pas reste sans
    contact, ce que le script annonce, plutôt que d'hériter de celui du
    voisin.

    La liste téléphonique n'écrit le plus souvent que le prénom. Les
    destinataires du message, eux, portent le nom complet à côté de leur
    adresse : c'est de là que vient « Patricia Wettstein-Mürner », par une
    jointure sur l'adresse, donc sans rien deviner.
    """
    restants = dict(contacts)
    for joueur in joueurs:
        joueur.update(nom=joueur['abrege'], telephone='', courriel='')
        for nom, contact in restants.items():
            if not correspond(joueur['abrege'], nom):
                continue
            courriel = contact['courriel']
            joueur.update(nom=noms_complets.get(courriel.lower()) or nom,
                          telephone=contact['telephone'], courriel=courriel)
            del restants[nom]
            break
        completer_nom(joueur)


def completer_nom(joueur: dict) -> None:
    """Complète le prénom seul d'un joueur absent de la liste des destinataires.

    C'est le cas de l'expéditeur, qui ne s'écrit évidemment pas lui-même. Son
    adresse a la forme « prénom.nom » : le prénom vient de la liste
    téléphonique, avec ses accents, et le nom de famille de l'adresse. Rien
    n'est complété si l'adresse n'a pas cette forme.
    """
    if ' ' in joueur['nom'] or '@' not in joueur['courriel']:
        return
    morceaux = joueur['courriel'].split('@')[0].split('.')
    if len(morceaux) != 2 or identifiant(joueur['nom']) != identifiant(morceaux[0]):
        return
    joueur['nom'] = f"{joueur['nom']} {morceaux[1].capitalize()}"


def verifier(joueurs: list[dict], matchs: list[dict], presences: list[dict],
             totaux: dict[str, list[int]]) -> None:
    """Recompte le tableau et le confronte aux totaux que le mail affiche.

    C'est le seul garde-fou qui vaille : si la lecture des colonnes glisse
    d'un cran, les totaux ne tombent plus et le script s'arrête, au lieu de
    livrer une saison fausse qui ne se verrait qu'en janvier.
    """
    championnat = {match['id']: match['championnat'] for match in matchs}
    joue = {joueur['id']: {'BCM': 0, 'CM': 0} for joueur in joueurs}
    for presence in presences:
        if presence['statut'] == 'joue':
            joue[presence['joueurId']][championnat[presence['matchId']]] += 1

    for etiquette in ('BCM', 'CM'):
        attendu = totaux.get(etiquette)
        if not attendu:
            raise SystemExit(f'Ligne de totaux {etiquette} introuvable.')
        obtenu = [joue[joueur['id']][etiquette] for joueur in joueurs]
        if obtenu != attendu:
            raise SystemExit(f'Totaux {etiquette} : lu {obtenu}, le mail dit {attendu}.')

    attendu = totaux.get('Total')
    obtenu = [joue[j['id']]['BCM'] + joue[j['id']]['CM'] for j in joueurs]
    if attendu and obtenu != attendu:
        raise SystemExit(f'Totaux généraux : lu {obtenu}, le mail dit {attendu}.')

    # Une équipe de curling compte quatre joueurs. Le mail le respecte pour
    # les dix-huit matchs, et l'application s'appuie dessus pour signaler un
    # effectif incomplet.
    for match in matchs:
        titulaires = sum(
            1 for p in presences
            if p['matchId'] == match['id'] and p['statut'] == 'joue'
        )
        if titulaires != 4:
            print(f"  attention : {match['date']} compte {titulaires} titulaires")


def main() -> None:
    chemin = Path(sys.argv[1]) if len(sys.argv) > 1 else MESSAGE_PAR_DEFAUT
    if not chemin.exists():
        raise SystemExit(f'Message introuvable : {chemin}')

    html = corps_html(chemin)
    lignes = lignes_du_tableau(html)
    rang_entete = trouver_entete(lignes)

    titre = ' '.join(lignes[0][0].split()) if lignes and lignes[0] else ''
    saison = re.search(r'(\d{4})/(\d{2})', titre)
    if not saison:
        raise SystemExit(f'Saison illisible dans le titre : {titre!r}')
    annee = int(saison.group(1))
    groupe = titre.split('-')[-1].strip()

    joueurs = joueurs_de_l_entete(lignes[rang_entete])
    matchs, presences = lire_matchs(lignes, rang_entete + 1, joueurs, annee)
    totaux = lire_totaux(lignes, len(joueurs))
    verifier(joueurs, matchs, presences, totaux)

    with olefile.OleFileIO(str(chemin)) as ole:
        texte = ole.openstream(FLUX_TEXTE).read().decode('utf-16-le', errors='replace')
        noms_complets = lire_destinataires(ole)
    rattacher_contacts(joueurs, lire_contacts(texte), noms_complets)

    seed = {
        'version': 1,
        'saison': f'{annee}/{saison.group(2)}',
        'groupe': groupe,
        'equipe': 'CC Zytglogge 7',
        'joueurs': joueurs,
        'matchs': matchs,
        'presences': presences,
    }
    SORTIE.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + '\n',
                      encoding='utf-8')

    print(f'{SORTIE.relative_to(RACINE)} écrit : {len(joueurs)} joueurs, '
          f'{len(matchs)} matchs, {len(presences)} présences.')
    print(f'Saison {seed["saison"]}, groupe {groupe}. Totaux du mail retrouvés.')
    # Le rapprochement des colonnes et de la liste téléphonique est la seule
    # étape que les totaux ne contrôlent pas. Il s'affiche pour être relu.
    for joueur in joueurs:
        contact = joueur['telephone'] or 'sans contact dans le mail'
        print(f'  {joueur["abrege"]:9} → {joueur["nom"]:26} {contact}')


if __name__ == '__main__':
    main()
