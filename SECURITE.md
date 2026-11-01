# Bâti-Pro : rapport de test d'intrusion

Test automatisé du site public et de l'admin, avec un faux GitHub rempli de données piégées
(comme si un vendeur malveillant ou un pirate avait glissé du code dans les articles et les réglages).

**Résultat : 40 contrôles, 0 faille ouverte.**

## Ce qui a été attaqué

| Attaque | Résultat |
|---|---|
| Code caché dans le nom, la marque, la description, les caractéristiques, les couleurs, les photos et les prix d'un article | Neutralisé dans l'admin, dans toutes les pages publiées et dans la galerie |
| Code caché dans les réglages (WhatsApp, e-mail, horaires, codes Google, liens Facebook et TikTok) | Neutralisé ; liens `javascript:` refusés |
| Noms de pages piégés (`../index`, guillemets, balises) | Noms de fichiers nettoyés, rien hors du dossier `produit/` |
| Liens piégés envoyés à un client (`?q=`, `#…` avec du code ou des caractères cassés) | Aucun code exécuté, la page ne plante plus |
| Code glissé dans l'admin | Bloqué par la politique de sécurité (CSP) |
| Envoi de données de l'admin vers un autre site | Bloqué (l'admin ne parle qu'à api.github.com) |
| Admin affiché dans la page d'un autre site (clickjacking) | Refusé |
| Clé GitHub : dans la page, le stockage, la console, une adresse | Jamais visible ; chiffrée avec le code de verrouillage |
| Fichiers externes modifiés (Font Awesome) | Contrôle d'intégrité (SRI) |
| Prix d'achat ou données internes dans le fichier public | Aucun |

## Corrigé pendant le test

1. **Lien avec une ancre cassée** (`produits.html#%E0%A4%A` ou `#"]`) : le catalogue plantait. L'ancre est maintenant vérifiée.
2. **Liens Facebook et TikTok** : un collaborateur pouvait mettre l'adresse d'une page piège. Seuls les liens `facebook.com`, `fb.com` et `tiktok.com` sont acceptés.
3. **Pastilles de couleur** : la teinte est échappée à l'écriture, en plus du contrôle du format.
4. **Fiche produit** : l'étiquette ne se balance plus en continu (elle se pose puis reste stable), pour des boutons faciles à toucher.

## Protections en place

- Clé GitHub chiffrée (AES-GCM, clé dérivée du code par PBKDF2, 600 000 tours), jamais réaffichée.
- Code demandé à chaque ouverture et après 10 minutes d'inactivité ; clé effacée après 5 codes faux.
- CSP stricte sur l'admin (scripts du site seulement, connexions vers api.github.com seulement) et CSP sur toutes les pages publiques.
- Admin non indexé par Google, jamais mis en cache, jamais affiché dans un cadre.
- Photos réencodées par le navigateur avant l'envoi (aucun fichier SVG ou script ne peut passer pour une photo).
- `.htaccess` (chez un hébergeur) : HTTPS obligatoire, en-têtes de sécurité, fichiers cachés et `.md` jamais servis.

## Limite à connaître

Toute personne qui possède une clé avec accès au dépôt peut modifier le site entier, admin ou pas.
D'où les règles : une clé par personne, double authentification sur chaque compte GitHub, retrait immédiat d'un collaborateur qui part.
