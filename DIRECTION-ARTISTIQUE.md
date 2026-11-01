# Bâti-Pro — direction artistique (v2)

## 1. Direction artistique : « le comptoir »
Le site s'inspire d'un catalogue imprimé de magasin sérieux : papier chaud, encre noire, une seule couleur
d'accent, des listes de prix bien alignées. Pas de « vitrine tech » : on doit sentir un vrai commerce de Koulouba,
qui vend du ciment, des motos et des panneaux solaires, et qui répond sur WhatsApp.
- Mise en page éditoriale : grands titres courts, texte court, beaucoup de vide.
- Chaque section a une composition différente (index numéroté, image + texte, défilement horizontal, étapes, bloc sombre).
- Les photos sont grandes, sans cadre ni ombre ; les produits sans photo ont une vignette typographique (pas de fausse photo).
- Détails discrets : filets de 1 px, numérotation 01–06, prix en chiffres à chasse fixe comme sur une étiquette.

## 2. Palette (limitée)
| Rôle | Couleur |
|---|---|
| Papier (fond) | `#F4F1EA` |
| Sable (fond alterné) | `#EAE4D8` |
| Encre (texte, sections sombres) | `#161412` |
| Texte secondaire | `#5E5850` |
| Filets | `#D9D2C4` |
| **Orange brûlé** (accent unique : prix, CTA, icônes, lien actif) | `#C8621F` → survol `#A24E17`, fond clair `#F4E4D4` |

Aucun dégradé, aucune lueur. Le vert WhatsApp n'apparaît que sur le bouton rond flottant.

**Icônes** : Font Awesome (hébergé dans `vendor/fontawesome`), utilisées pour les rayons, les coordonnées, les étapes et les engagements.

## 3. Typographie
- **Archivo** (Google Fonts, axe de largeur) : titres en largeur 75 % / graisse 800, texte courant en largeur 100 % / 400–600.
- **IBM Plex Mono** : prix, références, numéros de rayon — l'effet « étiquette de prix ».
- Échelle : 14 · 16 · 18 · 22 · 28 · 40 · 64 · 104 px (titres en `clamp()`), interlignage 1,55 pour le texte, 0,95 pour les grands titres.
- Paragraphes limités à ~60 caractères de large.

## 4. Structure
**Accueil**
1. En-tête sur deux lignes : logo (image) · recherche · téléphone · WhatsApp, puis la ligne des 6 rayons avec leurs icônes.
2. Hero asymétrique : titre « Construire, rouler, s'équiper. » + une phrase concrète + 2 CTA ; grande photo à droite qui touche le bord de l'écran, légende avec l'adresse.
3. Bandeau d'informations (texte seul, séparé par des filets) : livraison, vérification en boutique, téléphone.
4. **Les rayons** : index numéroté 01–06 en grandes lignes ; au survol (ordinateur) la photo du rayon s'affiche à droite.
5. **Le moment** : pleine largeur, grande photo + fiche de la moto du moment ; en dessous, une ligne de liens vers les autres offres.
6. **Les plus demandés** : liste horizontale (produit, prix), sans cartes.
7. **Commander en trois temps** : étapes numérotées reliées par un filet (c'est le vrai fonctionnement : choisir → WhatsApp → retrait ou livraison).
8. **Le magasin** (fond encre) : texte court, adresse, lien Google Maps, questions fréquentes en liste.
9. Pied de page.

**Catalogue** : titre, onglets texte des rayons, recherche, grille éditoriale de produits (image, nom, prix), sans bordures.
**Fiche produit** : image à gauche (fixe au défilement), infos à droite : rayon, nom, prix, description, caractéristiques en tableau à filets, CTA WhatsApp + appel.

## 5. Espacement
Base 8 px : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
Sections : `clamp(72px, 10vw, 136px)` en haut et en bas. Conteneur 1240 px, marges 20 px (mobile) → 40 px (ordinateur).
Rayons des angles : 2 px (boutons, champs) — rien d'arrondi.

## 6. Responsive (compositions propres à chaque écran)
- **Mobile** (< 700 px) : titre du hero puis photo pleine largeur ; rayons en lignes avec miniature ; « Le moment » photo pleine largeur puis texte ; « Plus demandés » en défilement horizontal ; étapes verticales ; **bouton WhatsApp rond flottant** qui suit tout le défilement ; menu en tiroir avec les rayons ; rayons en pastilles défilantes sous l'en-tête ; loupe qui ouvre la recherche.
- **Tablette** (700–1080 px) : hero en 2 colonnes serrées, catalogue en 2 colonnes, rayons sans image au survol.
- **Ordinateur** (> 1080 px) : grille 12 colonnes, compositions asymétriques, image des rayons au survol.

## 7. Animations (discrètes)
- Apparition légère (opacité + 8 px) des titres et images de section, une seule fois, au défilement.
- Zoom de 3 % sur les images au survol (600 ms), fondu de 250 ms entre les photos des rayons.
- Transitions de couleur sur les liens et boutons, soulignement qui se dessine.
- Tout est désactivé si le téléphone demande « réduire les animations ».
