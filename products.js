/* Bâti-Pro — catalogue des produits
 * Pour ajouter un produit : copier un bloc { ... } et changer ses informations.
 * - id : court, en minuscules, avec des tirets (il sert dans l'adresse de la page : produit.html?id=...)
 * - prix : en FCFA, sans espaces (0 = « Prix sur demande »)
 * - image : chemin d'une photo réelle (ex. "img/moto-toro-valor-160.webp") — nom de fichier descriptif = meilleur référencement
 * - description : 2 ou 3 phrases utiles, avec les mots que vos clients tapent sur Google
 */
/* Photos du site. Provisoires (Unsplash, libres de droits) : remplacez-les dès que possible par de vraies
 * photos du magasin et des produits, placées dans img/ (ex. photo: 'img/rayon-motos.jpg'). */
var U = function (id) { return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=1400&q=70'; };
window.PHOTOS = {
  hero: U('1668609268461-4f6a15269ff1'),       // chantier, briques
  motos: U('1667862224967-a25abfb769a1'),
  materiaux: U('1773394089934-3e29f2a3d6a9'),
  electronique: U('1615986200762-a1ed9610d3b1'),
  climatisation: U('1762341123870-d706f257a12e'),
  solaire: U('1753881110611-00755160afd2'),
  equipements: U('1759200165738-6366977a73c6'),
};

window.CATEGORIES = [
  { id: 'motos', nom: 'Motos', accroche: 'Motos neuves, casques et pièces.' },
  { id: 'materiaux', nom: 'Matériaux', accroche: 'Ciment, fer à béton, tôles, outillage de chantier.' },
  { id: 'electronique', nom: 'Électronique', accroche: 'Téléviseurs, téléphones, audio.' },
  { id: 'climatisation', nom: 'Climatisation', accroche: 'Climatiseurs split, ventilateurs, rafraîchisseurs.' },
  { id: 'solaire', nom: 'Énergie solaire', accroche: 'Panneaux, batteries, onduleurs et kits complets.' },
  { id: 'equipements', nom: 'Équipements', accroche: 'Groupes électrogènes, pompes, froid, soudure.' },
];

window.PRODUCTS = [
  // ---------- Motos ----------
  { id: 'moto-toro-valor-160', cat: 'motos', nom: 'Toro Valor 160', prix: 628500, marque: 'Toro', badge: 'Moto du moment', populaire: true,
    description: "Moto 160 cm³ robuste et économique, idéale pour la ville et les pistes autour de Ouagadougou. Démarrage électrique, freins à disque avant et grand réservoir.",
    caracteristiques: { 'Cylindrée': '160 cm³', 'Démarrage': 'Électrique et kick', 'Réservoir': '14 L', 'Freins': 'Disque avant / tambour arrière' } },
  { id: 'moto-sanili-125', cat: 'motos', nom: 'Sanili 125 Classic', prix: 485000, marque: 'Sanili', populaire: true,
    description: "La 125 cm³ fiable du quotidien : faible consommation, entretien simple et pièces disponibles en boutique.",
    caracteristiques: { 'Cylindrée': '125 cm³', 'Consommation': 'env. 2,2 L / 100 km', 'Réservoir': '12 L' } },
  { id: 'moto-apsonic-115', cat: 'motos', nom: 'Apsonic 115 Eco', prix: 398000, marque: 'Apsonic',
    description: "Moto légère 115 cm³ pour les petits trajets, au meilleur prix. Parfaite pour débuter.",
    caracteristiques: { 'Cylindrée': '115 cm³', 'Poids': '98 kg', 'Réservoir': '10 L' } },
  { id: 'casque-moto-integral', cat: 'motos', nom: 'Casque moto intégral', prix: 18500,
    description: "Casque intégral homologué avec visière claire, pour rouler en sécurité. Plusieurs tailles disponibles.",
    caracteristiques: { 'Type': 'Intégral', 'Tailles': 'M, L, XL' } },

  // ---------- Matériaux ----------
  { id: 'ciment-cpj-45-sac-50kg', cat: 'materiaux', nom: 'Ciment CPJ 45 — sac de 50 kg', prix: 6250, populaire: true,
    description: "Ciment Portland composé CPJ 45 pour maçonnerie, dalles et enduits. Livraison sur chantier à Ouagadougou selon quantité.",
    caracteristiques: { 'Classe': 'CPJ 45', 'Conditionnement': 'Sac de 50 kg', 'Usage': 'Béton, maçonnerie, enduit' } },
  { id: 'fer-a-beton-12mm', cat: 'materiaux', nom: 'Fer à béton HA 12 mm (barre de 12 m)', prix: 5800,
    description: "Barre de fer à haute adhérence de 12 mm pour poteaux, poutres et chaînages.",
    caracteristiques: { 'Diamètre': '12 mm', 'Longueur': '12 m', 'Type': 'Haute adhérence (HA)' } },
  { id: 'tole-bac-alu-3m', cat: 'materiaux', nom: 'Tôle bac aluminium 3 m', prix: 9500,
    description: "Tôle bac en aluminium pour toiture, résistante à la rouille et à la chaleur.",
    caracteristiques: { 'Longueur': '3 m', 'Matière': 'Aluminium', 'Épaisseur': '0,4 mm' } },
  { id: 'brouette-chantier-90l', cat: 'materiaux', nom: 'Brouette de chantier 90 L', prix: 32000,
    description: "Brouette renforcée à cuve 90 litres et roue gonflable, pour les travaux de chantier.",
    caracteristiques: { 'Capacité': '90 L', 'Roue': 'Gonflable' } },

  // ---------- Électronique ----------
  { id: 'televiseur-led-43-smart', cat: 'electronique', nom: 'Téléviseur LED 43" Smart TV', prix: 185000, populaire: true,
    description: "Smart TV 43 pouces Full HD avec YouTube et Netflix intégrés, 2 ports HDMI et USB.",
    caracteristiques: { 'Taille': '43 pouces', 'Résolution': 'Full HD 1080p', 'Connectique': '2 HDMI, 1 USB, Wi-Fi' } },
  { id: 'smartphone-android-128go', cat: 'electronique', nom: 'Smartphone Android 128 Go', prix: 95000,
    description: "Smartphone double SIM, 128 Go de stockage, grande batterie 5000 mAh pour tenir toute la journée.",
    caracteristiques: { 'Stockage': '128 Go', 'Batterie': '5000 mAh', 'SIM': 'Double SIM' } },
  { id: 'enceinte-bluetooth-karaoke', cat: 'electronique', nom: 'Enceinte Bluetooth karaoké', prix: 45000,
    description: "Enceinte puissante avec micro sans fil, Bluetooth, radio FM et batterie rechargeable.",
    caracteristiques: { 'Puissance': '60 W', 'Autonomie': '8 h', 'Inclus': 'Micro sans fil' } },
  { id: 'decodeur-tnt-hd', cat: 'electronique', nom: 'Décodeur TNT HD', prix: 15000,
    description: "Décodeur pour recevoir les chaînes de la TNT en haute définition, avec télécommande.",
    caracteristiques: { 'Norme': 'DVB-T2', 'Sortie': 'HDMI' } },

  // ---------- Climatisation ----------
  { id: 'climatiseur-split-12000-btu', cat: 'climatisation', nom: 'Climatiseur split 12 000 BTU', prix: 265000, populaire: true, badge: 'Saison chaude',
    description: "Climatiseur mural 1,5 CV pour une chambre ou un bureau jusqu'à 20 m². Installation sur devis à Ouagadougou.",
    caracteristiques: { 'Puissance': '12 000 BTU (1,5 CV)', 'Surface': "jusqu'à 20 m²", 'Gaz': 'R410A' } },
  { id: 'climatiseur-split-18000-btu', cat: 'climatisation', nom: 'Climatiseur split 18 000 BTU', prix: 355000,
    description: "Climatiseur 2 CV pour salon ou grande pièce jusqu'à 30 m², mode économie d'énergie.",
    caracteristiques: { 'Puissance': '18 000 BTU (2 CV)', 'Surface': "jusqu'à 30 m²" } },
  { id: 'ventilateur-sur-pied-rechargeable', cat: 'climatisation', nom: 'Ventilateur sur pied rechargeable', prix: 38000,
    description: "Ventilateur avec batterie intégrée : il continue de tourner pendant les coupures d'électricité.",
    caracteristiques: { 'Autonomie': "jusqu'à 6 h", 'Recharge': 'Secteur ou panneau solaire' } },
  { id: 'refroidisseur-air-40l', cat: 'climatisation', nom: "Refroidisseur d'air 40 L", prix: 89000,
    description: "Rafraîchisseur à eau économique, consomme peu et convient aux grandes pièces.",
    caracteristiques: { 'Réservoir': '40 L', 'Consommation': '120 W' } },

  // ---------- Solaire ----------
  { id: 'kit-solaire-eclairage-recharge', cat: 'solaire', nom: 'Kit solaire éclairage + recharge', prix: 45000, populaire: true, badge: 'Bon plan',
    description: "Panneau, batterie, 4 ampoules LED et prise USB pour recharger les téléphones. Idéal contre les coupures.",
    caracteristiques: { 'Panneau': '30 W', 'Ampoules': '4 LED', 'Sortie': 'USB' } },
  { id: 'panneau-solaire-300w', cat: 'solaire', nom: 'Panneau solaire 300 W monocristallin', prix: 78000,
    description: "Panneau haut rendement pour installations domestiques et professionnelles.",
    caracteristiques: { 'Puissance': '300 W', 'Technologie': 'Monocristallin', 'Garantie': '10 ans' } },
  { id: 'batterie-solaire-gel-200ah', cat: 'solaire', nom: 'Batterie solaire gel 200 Ah', prix: 165000,
    description: "Batterie à décharge profonde, sans entretien, pour stocker l'énergie de vos panneaux.",
    caracteristiques: { 'Capacité': '200 Ah', 'Tension': '12 V', 'Type': 'Gel' } },
  { id: 'onduleur-hybride-3kva', cat: 'solaire', nom: 'Onduleur hybride 3 kVA', prix: 245000, populaire: true,
    description: "Onduleur avec régulateur MPPT intégré : solaire, batterie et réseau SONABEL dans un seul appareil.",
    caracteristiques: { 'Puissance': '3 kVA', 'Régulateur': 'MPPT', 'Entrées': 'Solaire, réseau, groupe' } },

  // ---------- Équipements ----------
  { id: 'groupe-electrogene-5kva', cat: 'equipements', nom: 'Groupe électrogène 5 kVA essence', prix: 385000, populaire: true,
    description: "Groupe électrogène à démarrage électrique pour maison, boutique ou chantier.",
    caracteristiques: { 'Puissance': '5 kVA', 'Carburant': 'Essence', 'Démarrage': 'Électrique' } },
  { id: 'pompe-a-eau-immergee-1cv', cat: 'equipements', nom: 'Pompe à eau immergée 1 CV', prix: 125000,
    description: "Pompe pour forage ou puits, débit élevé, pour l'arrosage et l'alimentation en eau.",
    caracteristiques: { 'Puissance': '1 CV', 'Profondeur max.': '60 m' } },
  { id: 'refrigerateur-congelateur-250l', cat: 'equipements', nom: 'Réfrigérateur-congélateur 250 L', prix: 215000,
    description: "Réfrigérateur double porte économe en énergie, adapté aux fortes chaleurs.",
    caracteristiques: { 'Volume': '250 L', 'Classe énergétique': 'A+' } },
  { id: 'poste-a-souder-250a', cat: 'equipements', nom: 'Poste à souder 250 A', prix: 95000,
    description: "Poste à souder inverter compact pour les travaux de métallerie et de réparation.",
    caracteristiques: { 'Intensité': '250 A', 'Technologie': 'Inverter' } },
];
