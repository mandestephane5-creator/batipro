# Bâti-Pro : le site et son admin

Un site vitrine et catalogue pour Bâti-Pro (Koulouba, Ouagadougou), sans serveur ni base de données.
Les pages sont de simples fichiers HTML, refaits automatiquement à chaque publication depuis l'admin.

## Ce que contient le dossier

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : étiquettes de prix, rayons, promotions, moto à la une, nouveautés, questions fréquentes, magasin, plan |
| `produits.html` | Le catalogue (« les allées ») : recherche, filtres par rayon, promos, nouveautés, disponibilité, tri par prix |
| `produit/*.html` | Une page par article (photos, prix, couleurs, bouton WhatsApp ou téléphone, fiche technique) |
| `admin.html` | L'espace de gestion des articles, des prix et des réglages |
| `data/produits.json` | La liste des articles (écrite par l'admin) |
| `data/site.json` | Les réglages de la boutique (créé à la première publication) |
| `404.html`, `sitemap.xml`, `robots.txt` | Page introuvable et fichiers pour Google |
| `.htaccess`, `.github/workflows/` | Seulement si vous passez un jour chez un hébergeur (Hostoweb, Hostinger…) |

## 1. Mettre le site en ligne (GitHub Pages, gratuit)

1. Sur GitHub (compte `mandestephane5-creator`), créez un dépôt **public** nommé `batipro`.
2. Envoyez-y tout le contenu du dossier (dans PowerShell, depuis le dossier dézippé) :
   ```
   git init
   git add .
   git commit -m "Site Bâti-Pro"
   git branch -M main
   git remote add origin https://github.com/mandestephane5-creator/batipro.git
   git push -u origin main
   ```
3. Dans le dépôt : **Settings**, puis **Pages**. Source : *Deploy from a branch*, branche `main`, dossier `/ (root)`. Enregistrez.
4. Une à deux minutes plus tard, le site est en ligne à l'adresse `https://mandestephane5-creator.github.io/batipro/`.

Si vous donnez un autre nom au dépôt, changez-le aussi dans `js/admin.js` (ligne `repo:`) ou cliquez « Modifier » sur l'écran de connexion de l'admin.

## 2. Première connexion à l'admin

1. Ouvrez `https://mandestephane5-creator.github.io/batipro/admin.html`.
2. Créez une clé GitHub : `github.com/settings/tokens/new`, cochez seulement **public_repo**, expiration dans un an. Copiez la clé.
3. Collez la clé, choisissez un **code de verrouillage** (6 caractères minimum) et connectez-vous.
4. La clé est chiffrée sur l'ordinateur et ne s'affiche plus jamais. Le code est demandé à chaque ouverture et après 10 minutes sans activité. Après 5 codes faux, la clé est effacée de l'appareil.
5. Cliquez une première fois sur **Publier sur le site** (« mise en place du site ») : toutes les pages sont refaites avec la bonne adresse.

## 3. Ce qu'il reste à remplir (bouton Réglages, en haut de l'admin)

- **Numéro WhatsApp** : tant qu'il est vide, tous les boutons du site proposent d'appeler le 25 33 34 47.
- **Horaires**, **livraison**, **garantie**, **moyens de paiement** : ils s'affichent dans le pied de page, sur chaque fiche et dans les questions fréquentes.
- **E-mail** et **TikTok** (facultatifs). La page Facebook est déjà renseignée.
- **Adresse du site** : à changer seulement le jour où vous aurez un nom de domaine (par exemple `https://www.batipro.bf/`).

## 4. Les articles

- **Ajouter un article** : nom, rayon, marque, prix, ancien prix (barré), disponibilité (disponible, sur commande, rupture), promotion, nouveauté, « à la une », couleurs, photos (8 au maximum, réduites automatiquement), description et caractéristiques.
- Dans la liste, la disponibilité et la visibilité se changent en un clic.
- Rien n'est en ligne tant que vous n'avez pas cliqué **Publier sur le site**. Les modifications non publiées restent gardées sur l'appareil.
- Un seul article peut être « à la une » : c'est lui qui occupe le showroom de l'accueil.
- **À vérifier** : les prix actuels viennent d'anciennes publications Facebook (téléviseurs AZUR 43, 55 et 75 pouces, téléviseur WebOS 85 pouces, moto Toro Valor 160). Confirmez-les ou corrigez-les avant d'annoncer le site.
- Les articles sans photo affichent une tuile avec le numéro de l'allée. Ajoutez de vraies photos dès que possible.

## 5. Donner l'accès à un vendeur

Une clé par personne, jamais partagée par WhatsApp ou e-mail :

1. Le vendeur crée son compte GitHub et active la double authentification.
2. Dans le dépôt : **Settings**, **Collaborators**, **Add people**, puis le vendeur accepte l'invitation.
3. Le vendeur crée sa propre clé (étape 2 ci-dessus) et choisit son propre code.
4. S'il quitte la boutique : retirez-le des collaborateurs. Une clé perdue se supprime sur `github.com/settings/tokens`.

Activez aussi la **double authentification** sur votre propre compte GitHub (Settings, Password and authentication).

## 6. Google

Dans Réglages, partie Google : copiez l'adresse du plan du site et déclarez-la dans Google Search Console, puis collez le code de validation donné par Google. L'ID Google Analytics est facultatif.

## 7. Plus tard : un hébergeur et un nom de domaine

- Le fichier `.htaccess` ajoute HTTPS obligatoire, des en-têtes de sécurité et un cache adapté. GitHub Pages l'ignore.
- Le fichier `.github/workflows/envoi-hebergeur.yml` envoie le site chez l'hébergeur par FTPS après chaque publication. Il ne fait rien tant que la variable `FTP_SERVEUR` n'est pas remplie (Settings, Secrets and variables, Actions). Le mode d'emploi est en tête du fichier.
- Après le changement de domaine, mettez la nouvelle adresse dans Réglages puis publiez.
