# Mes soins — application personnelle de suivi

Application **locale et installable sur iPhone** pour suivre tes rendez-vous, tes traitements et tes prises de médicaments.

- Une fois installée, elle fonctionne sans Internet, sans compte, sans publicité et sans outil d'analyse.
- Une règle de sécurité intégrée (CSP) **bloque toute connexion vers l'extérieur**. Tes données restent dans le navigateur de l'appareil.
- Elle **ne génère aucun conseil médical**. Elle affiche uniquement ce qui figure dans ton fichier de données, avec le statut `confirme`.

> ⚠️ Au premier lancement, l'application affiche des **données fictives de démonstration** (bandeau rose). Ce ne sont pas tes rendez-vous ni tes traitements.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète, en un seul fichier |
| `manifest.webmanifest`, `sw.js`, `icones/` | Installation sur l'écran d'accueil et fonctionnement hors connexion |
| `polices/` | Police Plus Jakarta Sans intégrée (licence SIL OFL, voir `polices/OFL.txt`) : aucune connexion à un service de polices |
| `donnees_medicales.exemple.json` | Modèle de données **fictives**, à copier pour créer ton propre fichier |
| `outils/verifier-parcours.mjs` | Test automatique, facultatif, réservé aux développeurs |

---

## 1. Installer et lancer l'application

### Sur iPhone, sans ordinateur
L'application est publiée sur une adresse HTTPS (GitHub Pages). Cette adresse contient **uniquement le code et les données fictives**, jamais tes données.

1. Ouvre l'adresse de l'application dans **Safari** (pas dans une autre application).
2. Touche le bouton **Partager** (carré avec une flèche), puis **« Sur l'écran d'accueil »**, puis **Ajouter**.
3. Ouvre désormais l'application **depuis l'icône « Mes soins »** de l'écran d'accueil.
4. **Importe tes données depuis l'application installée**, pas depuis Safari : les deux ont des espaces de stockage séparés.

Après la première ouverture, l'application fonctionne **hors connexion**. Elle se met à jour automatiquement à l'ouverture suivante quand une nouvelle version est publiée et qu'Internet est disponible.

À savoir :
- Tes données restent dans l'espace de stockage de l'application, sur l'iPhone. Supprimer l'icône de l'écran d'accueil peut effacer ces données : fais des sauvegardes (menu **Données**).
- Pour être prévenu à l'heure, utilise l'export vers le **Calendrier** (§ 3). L'application ne peut pas te prévenir lorsqu'elle est fermée.

### Apparence
Menu **Plus → Apparence** : **Automatique** (suit le mode clair ou sombre du téléphone), **Clair** ou **Sombre**.

### Sur ordinateur
- **En ligne** : ouvre l'adresse de l'application dans ton navigateur.
- **Hors ligne** : double-clique sur `index.html`. L'application fonctionne, mais sans installation ni mode hors connexion avancé.

### Mettre en ligne avec GitHub Pages (une seule fois)
Dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source : « Deploy from a branch » → Branche : `main`, dossier `/ (root)` → Save**.
Après une à deux minutes, l'adresse s'affiche en haut de cette page (du type `https://<compte>.github.io/<dépôt>/`).

> 🔒 Le dépôt est public. N'y ajoute **jamais** `donnees_medicales.json`, une sauvegarde ou un export `.ics` : le fichier `.gitignore` les bloque, mais reste vigilant.

### Avec un serveur local (facultatif)
Dans le dossier, lance `python3 -m http.server 8000`, puis ouvre `http://localhost:8000`. Dans ce mode uniquement, un fichier `donnees_medicales.json` placé à côté de `index.html` est lu automatiquement. Il ne l'est **jamais** depuis l'adresse publique.

---

## 2. Modifier les données médicales

1. Copie `donnees_medicales.exemple.json` et renomme la copie `donnees_medicales.json`.
2. Ouvre-la avec un éditeur de texte (TextEdit en mode « texte brut », Bloc-notes, VS Code…).
3. Remplace les exemples par les informations **recopiées depuis tes documents** : ordonnances, plannings, fiches de l'équipe soignante.
4. Mets `"donnees_fictives": false` dans la section `meta`.
5. Enregistre le fichier sur l'iPhone, dans l'app **Fichiers** (par exemple « Sur mon iPhone »).
6. Dans l'application installée : menu **Plus → Données → Importer mes données médicales** → choisis le fichier.
7. Ouvre l'écran **À confirmer** pour vérifier ce qui a été refusé et pourquoi.

> 🔒 Ne mets jamais `donnees_medicales.json` sur un site web, un dépôt GitHub public ou un service de partage public.

### Format des données

Les dates s'écrivent `AAAA-MM-JJ` (exemple `2026-10-08`) et les heures `HH:MM` sur 24 h (exemple `08:00`, et non `8:00` ni `8h`).
Chaque élément a un `id` unique et un `statut` : **`confirme`** ou **`a_confirmer`**.

**Rendez-vous** (`rendez_vous`)

| Champ | Obligatoire pour « confirmé » | Exemple |
|---|---|---|
| `id` | oui | `"rdv-2026-10-08"` |
| `type` | oui | `consultation`, `prise_de_sang`, `chimiotherapie`, `immunotherapie`, `radiotherapie`, `imagerie`, `autre` |
| `titre` | oui | `"Chimiothérapie cycle 2"` |
| `date` | oui | `"2026-10-08"` |
| `heure` | oui | `"08:30"` |
| `duree_minutes` | non (60 par défaut pour l'export) | `360` |
| `types_associes` | non | Autres types de la même séance : `["immunotherapie"]` |
| `lieu`, `professionnel`, `notes` | non | texte |
| `source` | conseillé | `"Planning remis le 17/09"` |

**Médicaments** (`medicaments`) : ce sont les prises à heure fixe, qui apparaissent dans l'agenda.

| Champ | Obligatoire pour « confirmé » | Exemple |
|---|---|---|
| `nom` | oui | texte |
| `dose` | oui, **telle qu'écrite sur l'ordonnance** | `"1 comprimé"` |
| `horaires` | oui, au moins un | `["08:00", "20:00"]` |
| `date_debut` | oui (sauf si `dates` est utilisé) | `"2026-10-01"` |
| `date_fin` | non (sans date de fin = jusqu'à nouvel ordre) | `"2026-10-14"` |
| `jours` | non : limite à certains jours | `["lundi", "jeudi"]` |
| `dates` | non : liste de jours précis, à la place de début/fin | `["2026-10-08", "2026-10-09"]` |
| `consignes_prise` | non | `"Pendant le repas"` |
| `nom_boite`, `nom_boite_source` | non | Nom écrit sur ta boîte (générique ou marque) et d'où vient l'association : `"ONDANSETRON"`, `"Tableau de cure"` |
| `au_calendrier` | non | `true` : affiche aussi chaque prise dans le calendrier comme « Soin à domicile » (ex. injection par l'infirmier) |
| `calendrier_titre`, `calendrier_lieu` | non | Titre et lieu affichés dans le calendrier |
| `source` | conseillé | `"Ordonnance du 17/09/2026"` |

Les médicaments « si besoin », sans horaire fixe, se notent plutôt dans `consignes_symptomes`.

**Consignes liées à un symptôme** (`consignes_symptomes`)

| Champ | Obligatoire pour « confirmé » | Remarque |
|---|---|---|
| `symptome` | oui | Nom affiché et recherché |
| `synonymes` | non | Autres mots qui trouvent cette consigne, par exemple `["Envie de vomir"]` |
| `consigne` | oui (sauf si médicament + posologie) | Texte **recopié** du document |
| `medicament` + `posologie` | les deux ensemble, ou aucun | Posologie **telle qu'écrite** |
| `source` | **oui** | Sans source, la consigne n'est jamais affichée |
| `date_document` | non | `"2026-09-17"` |
| `nom_boite`, `nom_boite_source` | non | Nom écrit sur la boîte du médicament indiqué, et sa source |

**Conseils alimentaires** (`conseils_alimentaires`, facultatif — onglet « Alimentation »)

| Champ | Obligatoire pour « confirmé » | Remarque |
|---|---|---|
| `situation` | oui | Titre de la fiche, par exemple `"Constipation"` |
| `categorie` | non | `"en_cas_de"` (par défaut) ou `"quotidien"` : section où la fiche est rangée |
| `parties` | oui | Liste de `{ "titre": "…" (facultatif), "conseils": [ … ] }` |
| `conseils` | au moins un confirmé | Textes **recopiés** du livret. Un passage illisible s'écrit `{ "texte": "…", "statut": "a_confirmer", "note": "…" }` : il est masqué et listé dans « À confirmer » |
| `symptomes` | non | Mots de la recherche par symptôme qui affichent un lien vers cette fiche (correspondance exacte, au pluriel près) |
| `recettes` | non | Noms des recettes proposées dans le livret |
| `titre_livret` | non | Titre tel qu'écrit dans le livret |
| `source` | **oui** | Sans source, la fiche n'est jamais affichée |

**Autres sections** :
- `liste_symptomes` : symptômes proposés dans la liste de recherche ;
- `contacts` : `nom`, `role`, `telephone`, `statut`, `source` ;
- `remarques` : liste de textes (doublons, contradictions, informations manquantes relevés dans les documents), affichée dans l'écran « À confirmer ».

### Ce que la validation refuse

Un élément marqué `confirme` mais incomplet est **automatiquement traité comme « à confirmer »** :
- il n'apparaît ni dans les prises, ni dans la recherche par symptôme, ni dans l'export calendrier ;
- il est listé dans l'écran **À confirmer**, avec la raison.

Exemples de refus :
- heure absente ou mal écrite (`8h`, `8:00`) ;
- date impossible (`2026-02-30`) ;
- dose ou posologie vide, contenant `?`, `à préciser`, `illisible`… ;
- médicament sans posologie ;
- consigne sans source ;
- identifiant en double ;
- statut inconnu.

Les rendez-vous `a_confirmer` qui ont une date valide restent visibles dans le calendrier, avec une bordure en pointillés et la mention « À confirmer ». Les médicaments et consignes `a_confirmer` ne sont **jamais** présentés comme des instructions de prise. Leurs valeurs ne s'affichent que dans l'écran « À confirmer », repliées et marquées « non validées ».

---

## 3. Configurer les rappels

### Méthode fiable : export `.ics` vers le calendrier
1. Ouvre le menu **Rappels** et choisis les moments d'alerte. Pour les rendez-vous, plusieurs choix sont possibles (2 jours, 1 jour, 2 h, 1 h ou 30 min avant). Pour les prises : à l'heure prévue, ou 5, 10 ou 15 min avant.
2. Choisis la période exportée pour les prises (14 à 90 jours) et, si tu veux, l'option « Masquer les détails ».
3. Clique sur **Exporter tout (.ics)**.
4. Ajoute le fichier au calendrier :
   - **Sur iPhone** : si l'ajout au Calendrier ne s'ouvre pas directement, touche **« Partager le fichier .ics »** → **Enregistrer dans Fichiers**, puis ouvre le fichier depuis l'app Fichiers. Le comportement peut varier selon la version d'iOS, et je n'ai pas pu le tester sur un vrai iPhone : **fais un essai avec les données fictives**.
   - **Sur Mac** : double-clique sur le fichier → Calendrier → choisis le calendrier de destination.

Conseils :
- **Crée un calendrier dédié** (par exemple « Soins ») et importe-y le fichier. Pour mettre à jour, supprime ce calendrier puis réimporte le nouvel export : cela évite les doublons.
- Si ton calendrier est synchronisé avec **iCloud** ou un autre compte, son contenu y est copié. Pour tout garder sur le téléphone, utilise un calendrier « Sur mon iPhone » s'il est disponible, ou coche « Masquer les détails ».
- L'export des prises est limité à la période choisie : **refais un export avant la fin**.
- Seuls les éléments **confirmés et complets** sont exportés.

### Rappels dans l'application : limités
- Ils s'affichent **uniquement lorsque l'application est ouverte à l'écran**. Ce ne sont **pas des alarmes garanties** : rien ne s'affiche si l'application, le navigateur ou l'appareil est fermé ou en veille.
- Sur ordinateur, tu peux aussi autoriser les notifications du navigateur, avec les mêmes limites.
- **Sur iPhone, même installée sur l'écran d'accueil, l'application ne peut pas te prévenir lorsqu'elle est fermée.** Utilise l'export vers le Calendrier.

---

## 4. Sauvegarde et effacement
Ouvre le menu **Données** pour :
- télécharger ou restaurer une sauvegarde des coches, des rendez-vous réalisés et des réglages ;
- revenir aux données de démonstration ;
- **effacer toutes les données de l'appareil**.

Vider les données de navigation du navigateur efface aussi le suivi : pense aux sauvegardes.

## 4 bis. Partager avec des proches (mode proche)
Ajoute `"lecture_seule": true` dans la section `meta` d'une copie du fichier de données, ou demande un « code proche ». Une fois importée, l'application passe en **lecture seule** :
- pas de cases à cocher, pas de bouton « réalisé », pas de rappels de prise ;
- un bandeau indique « Mode proche » et la date des données ;
- l'export calendrier ne contient que les rendez-vous.

Pour que tes proches aient des informations à jour, envoie-leur un nouveau code à chaque changement. Utilise uniquement une messagerie chiffrée (iMessage, WhatsApp, Signal) : le code contient des données de santé.

## 4 ter. Mises à jour automatiques (données chiffrées)
Le fichier `carnet.chiffre.json` contient les données **chiffrées** (AES-256-GCM, clé dérivée par PBKDF2-SHA256). Il est illisible sans la clé, et **la clé n'est jamais publiée** : elle se trouve uniquement dans les codes d'abonnement « MS2: », à transmettre par messagerie chiffrée.

- **Code patient** : mises à jour automatiques, avec les cases à cocher.
- **Code proche** : mises à jour automatiques, en lecture seule.

À chaque ouverture (avec réseau), l'application télécharge le fichier, le déchiffre sur l'appareil et applique la nouvelle version. Hors connexion, elle utilise les dernières données reçues.

Pour publier une nouvelle version : `MES_SOINS_CLE=… node outils/chiffrer.mjs chiffrer donnees_medicales.json carnet.chiffre.json`, puis enregistrer et pousser `carnet.chiffre.json`. Si un code fuite : générer une nouvelle clé (`node outils/chiffrer.mjs nouvelle-cle`), rechiffrer et distribuer les nouveaux codes ; les anciens deviennent inutiles.

## 4 quater. Ajouter un rendez-vous depuis l'application
**Calendrier → + Ajouter un rendez-vous** (type, titre, date, heure, durée, lieu, notes). On peut ensuite le modifier ou le supprimer depuis sa fiche.
- Le rendez-vous est enregistré **uniquement sur ce téléphone** : il n'est ni publié ni visible par les proches.
- Sans heure, il est classé « à confirmer ».
- Il est inclus dans la sauvegarde (Plus → Données).
- Indisponible en mode proche.

## 5. Vérification automatique (facultatif)
Si Node.js est installé : `npm i -D playwright`, puis `node outils/verifier-parcours.mjs`.
Le script vérifie notamment :
- le calendrier et les prises du jour ;
- la coche d'une prise ;
- la recherche par symptôme, avec une consigne trouvée ou absente ;
- la validation des données et l'export `.ics` ;
- l'absence de toute requête réseau.
