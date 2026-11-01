/* ============================================================
   BÂTI-PRO — fabrique des pages du site
   À chaque publication depuis l'admin (et une première fois avec Node),
   ce fichier écrit les pages complètes :
   - index.html, produits.html (les allées), produit/<adresse>.html
   - 404.html, sitemap.xml, robots.txt
   Les pages sont lisibles par Google même sans JavaScript.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BPSEO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ----- La boutique -----
  var BOUTIQUE = {
    nom: 'Bâti-Pro',
    rue: 'Avenue Maurice Yaméogo, Koulouba',
    bp: '01 BP 2661 Ouagadougou 01',
    ville: 'Ouagadougou',
    pays: 'BF',
    tel: '25 33 34 47',
    telLien: '+22625333447'
  };
  var SITE_PAR_DEFAUT = 'https://www.batipro.bf/';
  var RAYONS = [
    { id: 'materiaux', nom: 'Matériaux de construction', court: 'Matériaux', code: '01' },
    { id: 'climatisation', nom: 'Climatisation', court: 'Climatisation', code: '02' },
    { id: 'solaire', nom: 'Énergie solaire', court: 'Énergie solaire', code: '03' },
    { id: 'electronique', nom: 'Électronique et téléviseurs', court: 'Électronique', code: '04' },
    { id: 'motos', nom: 'Motos', court: 'Motos', code: '05' },
    { id: 'equipements', nom: 'Équipements et fournitures', court: 'Équipements', code: '06' }
  ];
  var DISPO = {
    disponible: { label: 'Disponible', cls: 'ok', schema: 'https://schema.org/InStock' },
    commande: { label: 'Sur commande', cls: 'cmd', schema: 'https://schema.org/BackOrder' },
    rupture: { label: 'Rupture', cls: 'rupt', schema: 'https://schema.org/OutOfStock' }
  };
  var FACEBOOK_PAR_DEFAUT = 'https://www.facebook.com/273430846662451/';

  // CSP : le navigateur refuse tout script, style, police ou cadre venant d'un autre site que ceux listés
  var CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; " +
    "frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

  // ----- Outils -----
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsonLd(o) { return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>'; }
  function nombre(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' et ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '') || 'produit';
  }
  function couper(t, max) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    var c = t.slice(0, max - 1), i = c.lastIndexOf(' ');
    return (i > max * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.–-]+$/, '') + '…';
  }
  function base(u) {
    u = String(u || '').trim();
    if (!u) return SITE_PAR_DEFAUT;
    try {
      var x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u);
      if (!/^https?:$/.test(x.protocol) || !/\./.test(x.hostname) || x.username || x.password) return SITE_PAR_DEFAUT;
      var h = (x.origin + x.pathname).replace(/'/g, '%27');
      return h.charAt(h.length - 1) === '/' ? h : h + '/';
    } catch (e) { return SITE_PAR_DEFAUT; }
  }
  function idGA(v) { v = String(v || '').trim().toUpperCase(); return /^G-[A-Z0-9]{4,15}$/.test(v) ? v : ''; }
  function codeGSC(v) {
    v = String(v || '').trim();
    var m = v.match(/content\s*=\s*["']([^"']+)["']/i);
    if (m) v = m[1];
    return /^[A-Za-z0-9_\-]{10,120}$/.test(v) ? v : '';
  }
  function urlSure(u) {
    u = String(u || '').trim();
    if (!u) return '';
    try { var x = new URL(u); return /^https:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; }
  }
  // lien d'un réseau social : https et bon domaine seulement (pas de page piège à la place de Facebook)
  function lienReseau(u, domaines) {
    var x = urlSure(u);
    if (!x) return '';
    var h = new URL(x).hostname.toLowerCase();
    return domaines.some(function (d) { return h === d || h.slice(-d.length - 1) === '.' + d; }) ? x : '';
  }
  function waNum(v) { var d = String(v || '').replace(/\D/g, ''); if (/^0{0,2}226\d{8}$/.test(d)) d = d.replace(/^0+/, ''); if (/^\d{8}$/.test(d)) d = '226' + d; return /^\d{10,15}$/.test(d) ? d : ''; }
  function texte(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max || 600); }

  // Réglages de la boutique (data/site.json), modifiés depuis l'admin
  function normSite(o) {
    o = o || {};
    var a = String(o.adresse || '').trim();
    return {
      adresse: a ? base(a) : '',
      ga: idGA(o.ga), gsc: codeGSC(o.gsc),
      whatsapp: waNum(o.whatsapp),
      email: /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i.test(String(o.email || '').trim()) ? String(o.email).trim() : '',
      horaires: texte(o.horaires, 300), livraison: texte(o.livraison), garantie: texte(o.garantie), paiement: texte(o.paiement),
      facebook: o.facebook === undefined ? FACEBOOK_PAR_DEFAUT : lienReseau(o.facebook, ['facebook.com', 'fb.com']), tiktok: lienReseau(o.tiktok, ['tiktok.com'])
    };
  }

  // Un article, toujours sous la même forme
  function normaliser(p) {
    p = p || {};
    var num = function (v) { return v === null || v === undefined || v === '' ? null : Number(v); };
    var rayon = RAYONS.some(function (r) { return r.id === p.rayon; }) ? p.rayon : 'equipements';
    var specs = {};
    Object.keys(p.specs || {}).forEach(function (k) { var kk = String(k).trim().slice(0, 40); if (kk) specs[kk] = String(p.specs[k] == null ? '' : p.specs[k]).trim().slice(0, 120); });
    return {
      id: Number(p.id) || 0,
      slug: String(p.slug || '').replace(/[^a-z0-9-]/g, ''),
      nom: String(p.nom || '').trim().slice(0, 100),
      marque: String(p.marque || '').trim().slice(0, 40),
      rayon: rayon,
      prix: Math.max(0, Math.round(Number(p.prix) || 0)),
      ancienPrix: num(p.ancienPrix) && Number(p.ancienPrix) > 0 ? Math.round(Number(p.ancienPrix)) : null,
      dispo: DISPO[p.dispo] ? p.dispo : 'disponible',
      promo: !!p.promo, nouveau: !!p.nouveau, vedette: !!p.vedette,
      couleurs: (Array.isArray(p.couleurs) ? p.couleurs : []).map(function (c) {
        return { nom: String(c && c.nom || '').trim().slice(0, 30), hex: /^#[0-9a-f]{6}$/i.test(c && c.hex) ? c.hex : '#888888' };
      }).filter(function (c) { return c.nom; }).slice(0, 12),
      photos: (Array.isArray(p.photos) ? p.photos : []).map(String).filter(function (s) { return /^(img\/[A-Za-z0-9._\/-]+|https:\/\/[^\s"'<>]+)$/.test(s); }).slice(0, 8),
      desc: String(p.desc || '').trim().slice(0, 1200),
      specs: specs,
      visible: p.visible !== false
    };
  }
  function visibles(liste) { return (liste || []).filter(function (p) { return p && p.visible !== false; }); }
  // Adresse stable et unique : produit/<slug>.html, jamais changée une fois donnée
  function attribuerSlugs(liste) {
    var pris = {};
    liste.forEach(function (p) { if (p.slug) { if (pris[p.slug]) p.slug = ''; else pris[p.slug] = 1; } });
    liste.forEach(function (p) {
      if (p.slug) return;
      var s = slugify(p.nom), t = s, i = 2;
      while (pris[t]) t = s + '-' + i++;
      p.slug = t; pris[t] = 1;
    });
    return liste;
  }
  function rayonDe(p) { for (var i = 0; i < RAYONS.length; i++) if (RAYONS[i].id === p.rayon) return RAYONS[i]; return RAYONS[RAYONS.length - 1]; }
  function enPromo(p) { return p.promo || (p.ancienPrix && p.ancienPrix > p.prix && p.prix > 0); }
  function remise(p) { return p.ancienPrix && p.ancienPrix > p.prix && p.prix > 0 ? Math.round((1 - p.prix / p.ancienPrix) * 100) : 0; }
  function surDemande(p) { return !(p.prix > 0); }
  function prixTexte(p) { return surDemande(p) ? 'Prix sur demande' : nombre(p.prix) + ' FCFA'; }
  function urlProduit(p, b) { return base(b) + 'produit/' + p.slug + '.html'; }
  function clair(hex) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return false;
    var l = [m[1], m[2], m[3]].map(function (h) { var c = parseInt(h, 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] > 0.2;
  }
  function grandNombre(p) { var m = String(p.nom).match(/(\d{2,4})(?!.*\d)/); return m ? m[1] : rayonDe(p).code; }

  // Contact : WhatsApp si le numéro est réglé, sinon appel
  function lienContact(site, message) {
    var n = waNum(site.whatsapp);
    if (n) return { href: 'https://wa.me/' + n + '?text=' + encodeURIComponent(message), wa: true };
    return { href: 'tel:' + BOUTIQUE.telLien, wa: false };
  }
  function attrsLien(c) { return c.wa ? ' target="_blank" rel="noopener"' : ''; }

  // ----- Icônes (dessinées, aucune police d'icônes externe) -----
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    '<symbol id="i-wa" viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 9.5c.3 1.8 1.6 3.5 3.5 4.3l1.2-1.1 1.8.8-.4 1.6c-3 .3-6.6-3-6.8-6l1.5-.5.8 1.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-tel" viewBox="0 0 24 24"><path d="M6 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-loupe" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-fleche" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-gauche" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-droite" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol>' +
    '<symbol id="i-horloge" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-camion" viewBox="0 0 24 24"><rect x="1.5" y="7" width="12" height="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13.5 10h4l3 3v3h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6" cy="18.5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="18.5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol>' +
    '<symbol id="i-bouclier" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.4 8.5-7 10-3.6-1.5-7-5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-paie" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 10h19M6 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-magasin" viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-haut" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-partage" viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-fb" viewBox="0 0 24 24"><path fill="currentColor" d="M14 8.5h2.5V5.3c-.4-.06-2-.2-3.1-.2-3.1 0-4.4 1.8-4.4 4.9v2.5H6v3.6h3v8.4h3.7v-8.4h3l.5-3.6h-3.5V10c0-.9.25-1.5 1.3-1.5z"/></symbol>' +
    '<symbol id="i-tiktok" viewBox="0 0 24 24"><path fill="currentColor" d="M14.5 3h2.6c.2 1.6 1.3 2.9 3 3.2v2.7c-1.1 0-2.2-.3-3.1-.9v5.6a5.6 5.6 0 1 1-4.8-5.5v2.8a2.9 2.9 0 1 0 2 2.7V3z"/></symbol>' +
    '<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3.5 7 8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>' +
    '</svg>';
  function ico(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }

  function statistiques(ga) {
    ga = idGA(ga);
    if (!ga) return '';
    return '<script async src="https://www.googletagmanager.com/gtag/js?id=' + ga + '"></script>\n' +
      '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","' + ga + '");</script>\n';
  }

  // ----- En-tête de page -----
  function tete(o, site) {
    return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n' +
      '<meta name="referrer" content="strict-origin-when-cross-origin">\n' +
      '<title>' + esc(o.titre) + '</title>\n' +
      '<meta name="description" content="' + esc(o.description) + '">\n' +
      (o.noindex ? '<meta name="robots" content="noindex">\n' : '<link rel="canonical" href="' + esc(o.url) + '">\n') +
      (site.gsc && o.accueil ? '<meta name="google-site-verification" content="' + esc(site.gsc) + '">\n' : '') +
      '<meta property="og:type" content="' + (o.ogType || 'website') + '">\n<meta property="og:site_name" content="Bâti-Pro">\n<meta property="og:locale" content="fr_FR">\n' +
      '<meta property="og:title" content="' + esc(o.titre) + '">\n<meta property="og:description" content="' + esc(o.description) + '">\n' +
      (o.url ? '<meta property="og:url" content="' + esc(o.url) + '">\n' : '') +
      '<meta property="og:image" content="' + esc(o.image) + '">\n<meta name="twitter:card" content="summary_large_image">\n' +
      '<meta name="theme-color" content="#17191C">\n' +
      '<link rel="icon" type="image/png" sizes="32x32" href="' + o.p + 'img/icons/favicon-32.png">\n' +
      '<link rel="icon" type="image/png" sizes="192x192" href="' + o.p + 'img/icons/icon-192.png">\n' +
      '<link rel="apple-touch-icon" href="' + o.p + 'img/icons/apple-touch-icon.png">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@600;700;800;900&amp;family=Big+Shoulders+Stencil:wght@700;800&amp;family=Instrument+Sans:wght@400;500;600&amp;display=swap">\n' +
      '<link rel="stylesheet" href="' + o.p + 'css/style.css">\n' +
      '<script>document.documentElement.classList.add("js")</script>\n' +
      (o.ld || '') + '\n' + statistiques(site.ga) + '</head>\n';
  }
  function corps(site) {
    return '<body data-wa="' + esc(waNum(site.whatsapp)) + '" data-tel="' + BOUTIQUE.telLien + '">\n' + SPRITE + '\n' +
      '<a class="aller" href="#contenu">Aller au contenu</a>\n';
  }

  function enseigne(p) {
    return '<a class="enseigne" href="' + (p || './') + '" aria-label="Bâti-Pro, accueil"><b>BÂTI PRO</b><small>KOULOUBA · OUAGADOUGOU</small></a>';
  }
  function entete(p, actif, site) {
    var c = lienContact(site, 'Bonjour Bâti-Pro, ');
    var lien = function (href, nom, cle) { return '<a href="' + href + '"' + (actif === cle ? ' aria-current="page"' : '') + '>' + nom + '</a>'; };
    var nav = lien(p + 'produits.html', 'Rayons', 'rayons') + lien(p + 'produits.html#promotions', 'Promotions', 'promos') +
      lien(p + 'produits.html#nouveautes', 'Nouveautés', 'nouv') + lien(p + 'index.html#pros', 'Professionnels', 'pros') + lien(p + 'index.html#magasin', 'Le magasin', 'mag');
    return '<header class="haut">\n<div class="enveloppe haut-l">\n' + enseigne(p) + '\n' +
      '<nav class="nav" aria-label="Menu principal">' + nav + '</nav>\n' +
      '<div class="haut-d"><a class="haut-tel" href="tel:' + BOUTIQUE.telLien + '">' + ico('tel') + BOUTIQUE.tel + '</a>' +
      '<a class="btn btn-accent btn-pilule" href="' + esc(c.href) + '"' + attrsLien(c) + '>' + ico(c.wa ? 'wa' : 'tel') + (c.wa ? 'WhatsApp' : 'Appeler') + '</a>' +
      '<button class="burger" type="button" aria-expanded="false" aria-controls="menu-mobile" aria-label="Ouvrir le menu">' + ico('menu') + '</button></div>\n' +
      '</div>\n<div class="menu-mobile" id="menu-mobile" hidden><nav aria-label="Menu mobile">' + nav + '<a href="tel:' + BOUTIQUE.telLien + '">Appeler le ' + BOUTIQUE.tel + '</a></nav></div>\n</header>\n';
  }

  // ----- Pied de page -----
  function lignes(t) { return esc(t).replace(/\n/g, '<br>'); }
  function pied(p, liste, site) {
    var vis = visibles(liste);
    var c = lienContact(site, 'Bonjour Bâti-Pro, ');
    var compte = function (id) { return vis.filter(function (x) { return x.rayon === id; }).length; };
    var rayons = RAYONS.map(function (r) {
      var n = compte(r.id);
      return '<li><a href="' + p + 'produits.html#' + r.id + '">' + esc(r.nom) + '</a><span>' + (n ? n : '') + '</span></li>';
    }).join('');
    var reseaux = (site.facebook ? '<a href="' + esc(site.facebook) + '" target="_blank" rel="noopener" aria-label="Bâti-Pro sur Facebook">' + ico('fb') + '</a>' : '') +
      (site.tiktok ? '<a href="' + esc(site.tiktok) + '" target="_blank" rel="noopener" aria-label="Bâti-Pro sur TikTok">' + ico('tiktok') + '</a>' : '');
    var an = new Date().getFullYear();
    return '<footer class="pied mur-sombre">\n' +
      '<div class="enveloppe pied-grille">\n' +
      '<div class="pied-marque">' + enseigne(p) + '<p>Commerce et distribution à Ouagadougou : matériaux de construction, climatisation, énergie solaire, téléviseurs et motos, pour les particuliers et les professionnels.</p>' +
      (reseaux ? '<div class="pied-reseaux">' + reseaux + '</div>' : '') + '</div>\n' +
      '<nav class="pied-col" aria-label="Rayons"><p class="pied-h">Les rayons</p><ul class="pied-rayons">' + rayons + '</ul></nav>\n' +
      '<nav class="pied-col" aria-label="Sélections"><p class="pied-h">À découvrir</p><ul>' +
      '<li><a href="' + p + 'produits.html#promotions">Promotions</a></li><li><a href="' + p + 'produits.html#nouveautes">Nouveautés</a></li>' +
      '<li><a href="' + p + 'index.html#showroom">La moto du moment</a></li><li><a href="' + p + 'produits.html">Tout le catalogue</a></li>' +
      '<li><a href="' + p + 'index.html#pros">Devis pour chantier</a></li><li><a href="' + p + 'index.html#infos">Questions fréquentes</a></li></ul></nav>\n' +
      '<div class="pied-col"><p class="pied-h">Le magasin</p><ul class="pied-infos">' +
      '<li>' + ico('pin') + '<span>' + esc(BOUTIQUE.rue) + '<br>' + esc(BOUTIQUE.bp) + '</span></li>' +
      '<li>' + ico('horloge') + '<span>' + (site.horaires ? lignes(site.horaires) : 'Horaires : renseignez-vous au ' + BOUTIQUE.tel) + '</span></li>' +
      '<li>' + ico('magasin') + '<span><a href="https://www.google.com/maps/dir/?api=1&amp;destination=' + encodeURIComponent('Avenue Maurice Yaméogo, Koulouba, Ouagadougou') + '" target="_blank" rel="noopener">Itinéraire jusqu’au magasin</a></span></li></ul></div>\n' +
      '<div class="pied-col"><p class="pied-h">Contact et infos</p><ul class="pied-infos">' +
      '<li>' + ico('tel') + '<span><a href="tel:' + BOUTIQUE.telLien + '">+226 ' + BOUTIQUE.tel + '</a></span></li>' +
      (c.wa ? '<li>' + ico('wa') + '<span><a href="' + esc(c.href) + '" target="_blank" rel="noopener">WhatsApp</a></span></li>' : '') +
      (site.email ? '<li>' + ico('mail') + '<span><a href="mailto:' + esc(site.email) + '">' + esc(site.email) + '</a></span></li>' : '') +
      '<li>' + ico('paie') + '<span>' + (site.paiement ? lignes(couper(site.paiement, 120)) : 'Paiement : nous consulter') + '</span></li>' +
      '<li>' + ico('camion') + '<span><a href="' + p + 'index.html#infos">Livraison et garantie</a></span></li></ul></div>\n' +
      '</div>\n' +
      '<div class="enveloppe pied-bas"><span>© ' + an + ' Bâti-Pro · ' + esc(BOUTIQUE.rue) + ', ' + BOUTIQUE.ville + '</span>' +
      '<span class="pied-liens"><a href="' + p + 'produits.html">Catalogue</a><a href="' + p + 'sitemap.xml">Plan du site</a>' +
      '<a class="remonter" href="#contenu">' + ico('haut') + 'Haut de page</a></span></div>\n' +
      '</footer>\n';
  }
  function barreMobile(site, message) {
    var c = lienContact(site, message || 'Bonjour Bâti-Pro, ');
    return '<nav class="barre-mobile" aria-label="Contacter Bâti-Pro"><a class="btn btn-accent btn-pilule" data-wa-msg="' + esc(message || 'Bonjour Bâti-Pro, ') + '" href="' + esc(c.href) + '"' + attrsLien(c) + '>' + ico(c.wa ? 'wa' : 'tel') + (c.wa ? 'WhatsApp' : 'Appeler') + '</a>' +
      (c.wa ? '<a class="barre-tel" href="tel:' + BOUTIQUE.telLien + '" aria-label="Appeler le magasin">' + ico('tel') + '</a>' : '') + '</nav>\n';
  }
  function fin(p) { return '<script src="' + p + 'js/site.js" defer></script>\n</body>\n</html>\n'; }

  // ----- Morceaux réutilisés -----
  function vignette(p, prefixe, classe) {
    if (p.photos.length) {
      var src = /^https:/.test(p.photos[0]) ? p.photos[0] : prefixe + p.photos[0];
      return '<img class="' + (classe || '') + '" src="' + esc(src) + '" alt="' + esc(p.nom) + '" loading="lazy" decoding="async">';
    }
    var r = rayonDe(p);
    return '<span class="sans-photo ' + (classe || '') + '"><b>' + r.code + '</b><small>Photo à venir</small></span>';
  }
  function badges(p) {
    var out = '';
    if (enPromo(p)) out += '<span class="pastille pastille-promo">' + (remise(p) ? '−' + remise(p) + ' %' : 'PROMO') + '</span>';
    if (p.nouveau) out += '<span class="pastille pastille-neuf">NOUVEAU</span>';
    if (p.vedette && p.rayon === 'motos') out += '<span class="pastille pastille-noir">À LA UNE</span>';
    return out;
  }
  function etat(p) { var d = DISPO[p.dispo]; return '<span class="etat etat-' + d.cls + '"><i></i>' + d.label + '</span>'; }
  function message(p) {
    return surDemande(p) ? 'Bonjour Bâti-Pro, je voudrais connaître le prix de : ' + p.nom
      : 'Bonjour Bâti-Pro, je suis intéressé(e) par : ' + p.nom + ' (' + nombre(p.prix).replace(/ /g, ' ') + ' FCFA)';
  }
  function carte(p, prefixe, site) {
    var c = lienContact(site, message(p));
    var r = rayonDe(p);
    var lien = prefixe + 'produit/' + p.slug + '.html';
    return '<article class="carte" data-rayon="' + p.rayon + '" data-dispo="' + p.dispo + '" data-promo="' + (enPromo(p) ? 1 : 0) + '" data-nouveau="' + (p.nouveau ? 1 : 0) + '" data-prix="' + p.prix + '" data-nom="' + esc(p.nom.toLowerCase() + ' ' + p.marque.toLowerCase() + ' ' + r.nom.toLowerCase()) + '">\n' +
      '<a class="carte-photo" href="' + lien + '" tabindex="-1" aria-hidden="true"><span class="trou"></span>' + vignette(p, prefixe) + '</a>\n' +
      '<div class="carte-badges">' + badges(p) + '</div>\n' +
      '<div class="carte-corps"><span class="carte-rayon">' + esc(r.court) + '</span>' +
      '<h3 class="carte-nom"><a href="' + lien + '">' + esc(p.nom) + '</a></h3>' + etat(p) +
      '<div class="carte-bas"><span class="carte-prix">' + (surDemande(p) ? '<span class="sur-demande">Prix sur demande</span>' : nombre(p.prix) + ' <small>FCFA</small>') +
      (p.ancienPrix && p.ancienPrix > p.prix && p.prix > 0 ? '<s>' + nombre(p.ancienPrix) + '</s>' : '') + '</span>' +
      '<a class="carte-wa" href="' + esc(c.href) + '"' + attrsLien(c) + ' aria-label="' + (c.wa ? 'Demander ' : 'Appeler pour ') + esc(p.nom) + (c.wa ? ' sur WhatsApp' : '') + '">' + ico(c.wa ? 'wa' : 'tel') + '</a></div></div>\n</article>';
  }

  // ----- Données lues par Google -----
  function ldMagasin(b, site) {
    var o = {
      '@context': 'https://schema.org', '@type': 'Store', '@id': b + '#magasin', name: 'Bâti-Pro', url: b,
      image: b + 'img/partage.jpg', logo: b + 'img/icons/icon-512.png',
      description: 'Commerce et distribution à Ouagadougou : matériaux de construction, climatisation, énergie solaire, téléviseurs et motos.',
      telephone: BOUTIQUE.telLien,
      address: { '@type': 'PostalAddress', streetAddress: BOUTIQUE.rue, postOfficeBoxNumber: '01 BP 2661', addressLocality: BOUTIQUE.ville, addressCountry: 'BF' },
      areaServed: { '@type': 'City', name: 'Ouagadougou' }, currenciesAccepted: 'XOF'
    };
    if (site.paiement) o.paymentAccepted = couper(site.paiement, 120);
    if (site.email) o.email = site.email;
    var same = [site.facebook, site.tiktok].filter(Boolean);
    if (same.length) o.sameAs = same;
    return o;
  }
  function questions(site) {
    return [
      ['Comment commander chez Bâti-Pro ?', 'Choisissez votre produit sur le site puis touchez le bouton de commande : un message déjà rempli s’ouvre sur WhatsApp. Vous pouvez aussi appeler le ' + BOUTIQUE.tel + ' ou passer au magasin, avenue Maurice Yaméogo à Koulouba.'],
      ['Que veut dire « sur commande » ?', 'Le produit n’est pas en rayon aujourd’hui mais nous pouvons le faire venir. Le délai et le prix vous sont confirmés avant toute commande.'],
      ['Livrez-vous ?', site.livraison || 'Renseignez-vous au ' + BOUTIQUE.tel + ' ou sur WhatsApp : le délai et le coût dépendent du produit et du quartier.'],
      ['Quels moyens de paiement acceptez-vous ?', site.paiement || 'Les moyens de paiement vous sont précisés à la commande, au téléphone ou au magasin.'],
      ['Les produits sont-ils garantis ?', site.garantie || 'Les conditions de garantie dépendent du produit : demandez-les avant l’achat, elles vous sont indiquées par écrit.'],
      ['Faites-vous des devis pour les chantiers ?', 'Oui. Envoyez votre liste de matériaux sur WhatsApp ou par téléphone : quantités, disponibilité, prix et livraison vous sont confirmés.']
    ];
  }

  // ----- Accueil -----
  function pageAccueil(liste, b, site) {
    var vis = visibles(liste), p = '';
    var vedette = vis.filter(function (x) { return x.vedette; })[0];
    var promos = vis.filter(enPromo), neufs = vis.filter(function (x) { return x.nouveau; });
    var une = [];
    [vis.filter(function (x) { return x.vedette; }), promos, neufs, vis].forEach(function (g) { g.forEach(function (x) { if (une.length < 3 && une.indexOf(x) < 0) une.push(x); }); });
    var cordes = [52, 128, 22], pos = ['0px', 'calc(50% - 80px)', 'calc(100% - 160px)'], durees = ['6s', '7s', '5.4s'];
    var etiquettes = une.map(function (x, i) {
      var r = rayonDe(x);
      var bandeau = enPromo(x) ? '<span class="pastille pastille-promo">' + (remise(x) ? '−' + remise(x) + ' %' : 'PROMO') + '</span>'
        : x.nouveau ? '<span class="pastille pastille-neuf">NOUVEAU</span>'
        : x.dispo === 'commande' ? '<span class="pastille pastille-noir">SUR COMMANDE</span>' : '<span class="pastille pastille-noir">À LA UNE</span>';
      return '<a class="etiquette" href="produit/' + x.slug + '.html" style="left:' + pos[i] + ';animation-duration:' + durees[i] + ';animation-delay:-' + (i * 1.4).toFixed(1) + 's">' +
        '<span class="fil" style="height:' + cordes[i] + 'px"></span><span class="etiquette-carton"><span class="trou"></span>' + bandeau +
        '<span class="etiquette-rayon">' + esc(r.court) + '</span><span class="etiquette-nom">' + esc(x.nom) + '</span>' +
        '<span class="etiquette-prix">' + (surDemande(x) ? '<span class="sur-demande">Prix sur demande</span>' : nombre(x.prix) + ' <small>FCFA</small>') + '</span>' + etat(x) + '</span></a>';
    }).join('');

    var compte = function (id) { return vis.filter(function (x) { return x.rayon === id; }).length; };
    var photoRayon = function (id) { var x = vis.filter(function (y) { return y.rayon === id && y.photos.length; })[0]; return x ? x.photos[0] : ''; };
    var brique = function (r, flex, delai) {
      var n = compte(r.id), ph = photoRayon(r.id);
      return '<a class="brique" href="produits.html#' + r.id + '" style="flex:' + flex + ';animation-delay:' + delai + 's">' +
        (ph ? '<img class="brique-photo" src="' + esc(ph) + '" alt="" loading="lazy">' : '') +
        '<span class="brique-code">' + r.code + '</span><span class="brique-bas"><span class="brique-nom">' + esc(r.nom) + '</span>' +
        '<span class="brique-n">' + (n ? n + (n > 1 ? ' produits' : ' produit') : 'Sur demande') + ico('fleche') + '</span></span></a>';
    };
    var R = {}; RAYONS.forEach(function (r) { R[r.id] = r; });
    var rang1 = brique(R.materiaux, '1.45 1 300px', 0) + brique(R.climatisation, '1 1 230px', 0.1) + brique(R.solaire, '1.2 1 250px', 0.2) +
      (compte('equipements') ? brique(R.equipements, '1 1 230px', 0.25) : '');
    var rang2 = '<a class="brique brique-promo" href="produits.html#promotions" style="flex:.62 1 150px;animation-delay:.3s"><span class="brique-bas"><span class="brique-nom">Promos</span><span class="brique-n">' + (promos.length ? promos.length + ' en cours' : 'Les prix du moment') + '</span></span></a>' +
      brique(R.electronique, '1.3 1 260px', 0.4) + brique(R.motos, '1.3 1 260px', 0.5) +
      '<a class="brique brique-noire" href="produits.html#nouveautes" style="flex:.62 1 150px;animation-delay:.6s"><span class="brique-bas"><span class="brique-nom">Nouveau</span><span class="brique-n">Arrivés au magasin</span></span></a>';


    var rail = function (id, titreSur, titre, items, lien) {
      if (!items.length) return '';
      return '<section class="section rail-section monte" id="' + id + '" aria-labelledby="t-' + id + '">\n<div class="enveloppe tete-section"><div><p class="surtitre' + (id === 'promotions' ? ' surtitre-promo' : '') + '">' + titreSur + '</p>' +
        '<h2 class="titre-section" id="t-' + id + '">' + titre + '</h2></div><div class="rail-nav"><a class="lien-fort" href="' + lien + '">Tout voir</a>' +
        '<button class="rond" type="button" data-rail="' + id + '" data-sens="-1" aria-label="Précédents">' + ico('gauche') + '</button>' +
        '<button class="rond rond-plein" type="button" data-rail="' + id + '" data-sens="1" aria-label="Suivants">' + ico('droite') + '</button></div></div>\n' +
        '<div class="enveloppe"><div class="rail" id="rail-' + id + '">' + items.map(function (x) { return carte(x, '', site); }).join('\n') + '</div></div>\n</section>\n';
    };

    var showroom = '';
    if (vedette) {
      var cv = lienContact(site, message(vedette));
      var couls = vedette.couleurs;
      var teinte = couls.length ? couls[0].hex : '#17191C';
      showroom = '<section class="showroom' + (clair(teinte) ? ' showroom-clair' : '') + '" id="showroom" style="--sr-fond:' + esc(teinte) + ';--sr-mur:' + esc(teinte) + '" aria-labelledby="t-showroom">\n<div class="enveloppe showroom-l">\n' +
        '<div class="showroom-scene">' +
        '<a class="showroom-photo" href="produit/' + vedette.slug + '.html" tabindex="-1" aria-hidden="true">' + vignette(vedette, '') + '</a></div>\n' +
        '<div class="showroom-texte"><p class="surtitre surtitre-clair"><i></i>SHOWROOM · ' + esc(rayonDe(vedette).court.toUpperCase()) + ' À LA UNE</p>' +
        '<h2 class="showroom-titre" id="t-showroom">' + esc(vedette.nom) + '</h2>' +
        '<p class="showroom-prix">' + (surDemande(vedette) ? 'Prix sur demande' : nombre(vedette.prix) + ' <small>FCFA</small>') + '</p>' + etat(vedette) +
        (couls.length ? '<div class="couleurs" role="group" aria-label="Choisir la couleur" data-cible="sr-wa"><p class="couleurs-titre">Couleur : <strong data-couleur-nom>' + esc(couls[0].nom) + '</strong></p><div class="couleurs-l">' +
          couls.map(function (k, i) { return '<button type="button" class="pastille-couleur" aria-pressed="' + (i ? 'false' : 'true') + '" aria-label="' + esc(k.nom) + '" data-couleur="' + esc(k.nom) + '" data-hex="' + esc(k.hex) + '" style="background:' + esc(k.hex) + '"></button>'; }).join('') + '</div></div>' : '') +
        '<div class="actions"><a class="btn btn-accent btn-pilule" id="sr-wa" data-wa-msg="' + esc(message(vedette)) + '" href="' + esc(cv.href) + '"' + attrsLien(cv) + '>' + ico(cv.wa ? 'wa' : 'tel') + (vedette.dispo === 'commande' ? 'Réserver' : 'Commander') + (cv.wa ? ' sur WhatsApp' : ' par téléphone') + '</a>' +
        '<a class="btn btn-contour-clair btn-pilule" href="produit/' + vedette.slug + '.html">Voir la fiche</a></div></div>\n</div>\n</section>\n';
    }

    var cPro = lienContact(site, 'Bonjour Bâti-Pro, voici ma liste de matériaux pour un chantier : ');
    var cDevis = lienContact(site, 'Bonjour Bâti-Pro, je voudrais un devis pour : ');
    var faq = questions(site);
    var mapQ = encodeURIComponent('Avenue Maurice Yaméogo, Koulouba, Ouagadougou, Burkina Faso');

    var ld = jsonLd({ '@context': 'https://schema.org', '@graph': [ldMagasin(b, site),
      { '@type': 'WebSite', '@id': b + '#site', url: b, name: 'Bâti-Pro', inLanguage: 'fr', publisher: { '@id': b + '#magasin' } }] }) + '\n' +
      jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(function (q) { return { '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } }; }) });

    return tete({
      titre: 'Bâti-Pro Ouagadougou — Matériaux, climatisation, solaire, téléviseurs et motos',
      description: 'Bâti-Pro, commerce et distribution à Koulouba, Ouagadougou : matériaux de construction, climatiseurs, kits solaires, téléviseurs et motos. Prix en FCFA, commande sur WhatsApp ou au ' + BOUTIQUE.tel + '.',
      url: b, image: b + 'img/partage.jpg', p: p, ld: ld, accueil: true
    }, site) + corps(site) + entete(p, '', site) +
      '<main id="contenu">\n' +
      '<section class="accroche enveloppe">\n<div class="accroche-texte">\n<p class="surtitre"><i></i>COMMERCE MULTISECTEUR · OUAGADOUGOU</p>\n' +
      '<h1 class="geant"><span class="ligne"><span>On construit.</span></span><span class="ligne l2"><span>On équipe.</span></span><span class="ligne l3"><span class="accent">On roule.</span></span></h1>\n' +
      '<p class="chapeau">Matériaux de construction, climatisation, énergie solaire, téléviseurs et motos. Un seul magasin à Koulouba, pour les particuliers comme pour les chantiers.</p>\n' +
      '<form class="recherche" role="search" action="produits.html" method="get"><label class="recherche-champ">' + ico('loupe') + '<span class="masque">Rechercher un produit</span>' +
      '<input type="search" name="q" maxlength="80" placeholder="Ciment, climatiseur, téléviseur 55 pouces…" autocomplete="off"></label><button class="btn btn-noir" type="submit">Chercher</button></form>\n' +
      '</div>\n<div class="vitrine" aria-label="À la une"><span class="corde" aria-hidden="true"></span>' + etiquettes + '</div>\n</section>\n' +
      '<section class="section enveloppe" id="rayons" aria-labelledby="t-rayons">\n<div class="tete-section"><h2 class="titre-section titre-xl" id="t-rayons">Le mur<br>des rayons</h2>' +
      '<p class="tete-texte">Chaque brique ouvre un rayon. Prix et disponibilité sont affichés pour chaque produit.</p></div>\n' +
      '<div class="mur-rayons"><div class="rangee">' + rang1 + '</div><div class="rangee">' + rang2 + '</div></div>\n</section>\n' +
      rail('promotions', 'PROMOTIONS', 'Les prix du moment', promos, 'produits.html#promotions') +
      showroom +
      rail('nouveautes', 'NOUVEAUTÉS', 'Arrivés au magasin', neufs, 'produits.html#nouveautes') +
      '<section class="section enveloppe" id="pros" aria-labelledby="t-pros">\n<div class="pros monte"><div class="pros-texte"><p class="surtitre surtitre-clair">PROFESSIONNELS ET CHANTIERS</p>' +
      '<h2 class="titre-section titre-clair" id="t-pros">Vous avez<br>un chantier ?</h2><p>Envoyez votre liste de matériaux, même en photo. Quantités, disponibilité, prix et livraison vous sont confirmés par écrit.</p>' +
      '<div class="actions"><a class="btn btn-blanc btn-pilule" href="' + esc(cPro.href) + '"' + attrsLien(cPro) + '>' + ico(cPro.wa ? 'wa' : 'tel') + (cPro.wa ? 'Envoyer ma liste sur WhatsApp' : 'Appeler pour un devis') + '</a>' +
      '<a class="btn btn-contour-clair btn-pilule" href="' + esc(cDevis.href) + '"' + attrsLien(cDevis) + '>Demander un devis</a></div></div>' +
      '<div class="pros-papier mur"><figure class="liste-chantier"><figcaption><b>LISTE CHANTIER</b><span>exemple</span></figcaption><ul>' +
      [['Ciment', '40 sacs'], ['Fer à béton de 10', '60 barres'], ['Tôles', '35'], ['Climatiseur pour bureau', '2'], ['Kit solaire', '1']].map(function (l) { return '<li><span>' + l[0] + '</span><b>' + l[1] + '</b></li>'; }).join('') +
      '</ul><p>Une photo de votre liste suffit.</p></figure></div></div>\n</section>\n' +
      '<section class="section enveloppe" id="infos" aria-labelledby="t-infos">\n<div class="tete-section"><h2 class="titre-section" id="t-infos">Bon à savoir</h2><p class="tete-texte">Commande, livraison, paiement, garantie : les réponses aux questions que l’on nous pose le plus.</p></div>\n' +
      '<div class="faq">' + faq.map(function (q, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(q[0]) + ico('droite') + '</summary><p>' + lignes(q[1]) + '</p></details>'; }).join('') + '</div>\n</section>\n' +
      '<section class="section enveloppe magasin" id="magasin" aria-labelledby="t-mag">\n' +
      '<div class="plaque monte"><h2 class="titre-section" id="t-mag">Passez<br>au magasin</h2><dl>' +
      '<div><dt>Adresse</dt><dd>' + esc(BOUTIQUE.rue) + '<br>' + esc(BOUTIQUE.bp) + '</dd></div>' +
      '<div><dt>Téléphone</dt><dd><a href="tel:' + BOUTIQUE.telLien + '">+226 ' + BOUTIQUE.tel + '</a></dd></div>' +
      (waNum(site.whatsapp) ? '<div><dt>WhatsApp</dt><dd><a href="' + esc(lienContact(site, 'Bonjour Bâti-Pro, ').href) + '" target="_blank" rel="noopener">Écrire au magasin</a></dd></div>' : '') +
      '<div><dt>Horaires</dt><dd>' + (site.horaires ? lignes(site.horaires) : 'Renseignez-vous au ' + BOUTIQUE.tel) + '</dd></div></dl>' +
      '<div class="actions"><a class="btn btn-noir btn-pilule" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + mapQ + '" target="_blank" rel="noopener">' + ico('pin') + 'Itinéraire</a>' +
      '<a class="btn btn-contour btn-pilule" href="tel:' + BOUTIQUE.telLien + '">' + ico('tel') + 'Appeler</a></div></div>\n' +
      '<div class="carte-geo monte"><iframe title="Bâti-Pro sur la carte, avenue Maurice Yaméogo à Koulouba" src="https://www.google.com/maps?q=' + mapQ + '&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>\n' +
      '<form class="ecrire monte" id="ecrire" novalidate><h3>Écrivez-nous</h3>' +
      '<label>Nom<input name="nom" type="text" maxlength="60" autocomplete="name" required></label>' +
      '<label>Téléphone<input name="tel" type="tel" maxlength="20" autocomplete="tel" required></label>' +
      '<label>Votre demande<textarea name="msg" rows="3" maxlength="600" required></textarea></label>' +
      '<p class="ecrire-err" role="alert" hidden></p><button class="btn btn-accent btn-pilule" type="submit">' + (waNum(site.whatsapp) ? ico('wa') + 'Envoyer sur WhatsApp' : ico('tel') + 'Nous appeler') + '</button></form>\n' +
      '</section>\n</main>\n' + pied(p, liste, site) + barreMobile(site) + fin(p);
  }

  // ----- Le catalogue : les allées -----
  function pageCatalogue(liste, b, site) {
    var vis = visibles(liste), p = '';
    var allees = RAYONS.map(function (r) {
      var items = vis.filter(function (x) { return x.rayon === r.id; });
      if (!items.length && r.id === 'equipements') return '';
      var c = lienContact(site, 'Bonjour Bâti-Pro, je cherche dans le rayon ' + r.nom + ' : ');
      return '<section class="allee" id="' + r.id + '" data-allee="' + r.id + '" aria-labelledby="a-' + r.id + '">\n' +
        '<h2 class="allee-titre" id="a-' + r.id + '"><span>ALLÉE ' + r.code + '</span>' + esc(r.nom) + '<em>' + items.length + '</em></h2>\n' +
        (items.length ? '<div class="etagere">' + items.map(function (x) { return carte(x, p, site); }).join('\n') + '</div>'
          : '<div class="allee-vide"><p>Ce rayon arrive bientôt en ligne. Dites-nous ce qu’il vous faut : nous vous répondons avec le prix et la disponibilité.</p>' +
            '<a class="btn btn-noir btn-pilule" href="' + esc(c.href) + '"' + attrsLien(c) + '>' + ico(c.wa ? 'wa' : 'tel') + (c.wa ? 'Demander sur WhatsApp' : 'Appeler le magasin') + '</a></div>') +
        '\n</section>';
    }).join('\n');
    var boutons = '<button type="button" class="panneau" data-filtre-allee="tout" aria-pressed="true"><span>TOUT</span>Tout le magasin</button>' +
      RAYONS.map(function (r) {
        var n = vis.filter(function (x) { return x.rayon === r.id; }).length;
        if (!n && r.id === 'equipements') return '';
        return '<button type="button" class="panneau" data-filtre-allee="' + r.id + '" aria-pressed="false"><span>ALLÉE ' + r.code + '</span>' + esc(r.court) + '</button>';
      }).join('');
    var cAutre = lienContact(site, 'Bonjour Bâti-Pro, je cherche : ');
    var bientot = RAYONS.filter(function (r) { return r.id !== 'equipements' && !vis.some(function (x) { return x.rayon === r.id; }); }).map(function (r) { return r.nom.toLowerCase(); });
    var ld = jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Catalogue Bâti-Pro',
      itemListElement: vis.map(function (x, i) { return { '@type': 'ListItem', position: i + 1, url: urlProduit(x, b), name: x.nom }; }) }) + '\n' +
      jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: b }, { '@type': 'ListItem', position: 2, name: 'Catalogue', item: b + 'produits.html' }] });
    return tete({
      titre: 'Catalogue Bâti-Pro — matériaux, climatisation, solaire, téléviseurs, motos | Ouagadougou',
      description: 'Tous les produits Bâti-Pro à Ouagadougou, rayon par rayon : matériaux de construction, climatiseurs, énergie solaire, téléviseurs et motos. Prix en FCFA et disponibilité.',
      url: b + 'produits.html', image: b + 'img/partage.jpg', p: p, ld: ld
    }, site) + corps(site) + entete(p, 'rayons', site) +
      '<main id="contenu" class="enveloppe catalogue">\n<nav class="ariane" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span>Catalogue</nav>\n' +
      '<div class="cat-tete"><h1 class="geant geant-m"><span class="ligne"><span>Les allées</span></span></h1>' +
      '<label class="recherche-champ recherche-seule">' + ico('loupe') + '<span class="masque">Rechercher dans le catalogue</span><input type="search" id="q" maxlength="80" placeholder="Que cherchez-vous ?" autocomplete="off"></label></div>\n' +
      '<div class="panneaux" role="group" aria-label="Choisir une allée">' + boutons + '</div>\n' +
      '<div class="filtres"><span class="filtres-n" aria-live="polite"><b id="n-produits">' + vis.length + '</b> produits</span>' +
      '<button type="button" class="puce" data-filtre="promo" aria-pressed="false" id="promotions">Promotions</button>' +
      '<button type="button" class="puce" data-filtre="nouveau" aria-pressed="false" id="nouveautes">Nouveautés</button>' +
      '<button type="button" class="puce" data-filtre="disponible" aria-pressed="false"><i class="pt pt-ok"></i>Disponible</button>' +
      '<button type="button" class="puce" data-filtre="commande" aria-pressed="false"><i class="pt pt-cmd"></i>Sur commande</button>' +
      '<label class="trier">Trier<select id="tri"><option value="">Par rayon</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></label></div>\n' +
      '<div class="allees">' + allees + '</div>\n' +
      '<div class="aucun" id="aucun" hidden><p class="titre-section">Rien trouvé</p><p>Essayez un autre mot, ou demandez-nous directement : nous avons aussi des produits qui ne sont pas encore en ligne.</p>' +
      '<a class="btn btn-accent btn-pilule" href="' + esc(cAutre.href) + '"' + attrsLien(cAutre) + '>' + ico(cAutre.wa ? 'wa' : 'tel') + (cAutre.wa ? 'Demander sur WhatsApp' : 'Appeler le magasin') + '</a></div>\n' +
      '<div class="pas-trouve"><div><p class="titre-section">Pas dans les allées ?</p><p>Envoyez le nom ou une photo du produit : on vous dit s’il est disponible ou sur commande.' + (bientot.length ? ' Bientôt en ligne : ' + esc(bientot.join(', ')) + '.' : '') + '</p></div>' +
      '<a class="btn btn-accent btn-pilule" href="' + esc(cAutre.href) + '"' + attrsLien(cAutre) + '>' + ico(cAutre.wa ? 'wa' : 'tel') + (cAutre.wa ? 'Demander sur WhatsApp' : 'Appeler le magasin') + '</a></div>\n' +
      '</main>\n' + pied(p, liste, site) + barreMobile(site) + fin(p);
  }

  // ----- Fiche produit -----
  function titreProduit(p) {
    var t = p.nom + (surDemande(p) ? '' : ' — ' + nombre(p.prix).replace(/ /g, ' ') + ' FCFA') + ' | Bâti-Pro Ouagadougou';
    return t.length > 70 ? p.nom + ' | Bâti-Pro Ouagadougou' : t;
  }
  function descriptionProduit(p) {
    var d = p.desc ? couper(p.desc, 110) + ' ' : '';
    var fin = (surDemande(p) ? 'Prix sur demande' : nombre(p.prix).replace(/ /g, ' ') + ' FCFA') + ', ' + DISPO[p.dispo].label.toLowerCase() + ' chez Bâti-Pro, Koulouba, Ouagadougou. Commande sur WhatsApp.';
    return couper(d + fin, 160);
  }
  function pageProduit(x, liste, b, site) {
    var vis = visibles(liste), p = '../', r = rayonDe(x);
    var c = lienContact(site, message(x));
    var url = urlProduit(x, b);
    var autres = vis.filter(function (y) { return y.rayon === x.rayon && y.id !== x.id; });
    if (autres.length < 4) autres = autres.concat(vis.filter(function (y) { return y.rayon !== x.rayon && y.id !== x.id; })).slice(0, 4);
    else autres = autres.slice(0, 4);
    var photos = x.photos.map(function (s) { return /^https:/.test(s) ? s : p + s; });
    var galerie = photos.length
      ? '<div class="galerie-grande"><span class="galerie-nombre" aria-hidden="true">' + esc(grandNombre(x)) + '</span><img id="photo-grande" src="' + esc(photos[0]) + '" alt="' + esc(x.nom) + '" decoding="async"></div>' +
        (photos.length > 1 ? '<div class="vignettes" role="group" aria-label="Choisir une photo">' + photos.map(function (s, i) {
          return '<button type="button" class="vignette" data-photo="' + esc(s) + '" aria-pressed="' + (i ? 'false' : 'true') + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(s) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '')
      : '<div class="galerie-grande"><span class="galerie-nombre" aria-hidden="true">' + esc(grandNombre(x)) + '</span>' + vignette(x, p, 'sans-photo-grande') + '</div>';
    var couls = x.couleurs;
    var specs = [['Rayon', r.nom]].concat(x.marque ? [['Marque', x.marque]] : [])
      .concat(Object.keys(x.specs).map(function (k) { return [k, x.specs[k]]; }))
      .concat(couls.length ? [['Couleurs', couls.map(function (k) { return k.nom; }).join(' · ')]] : [])
      .concat([['Disponibilité', DISPO[x.dispo].label]]);
    var infos = [['camion', 'Livraison', site.livraison || 'Renseignez-vous : délai et coût selon le produit et le quartier.'],
      ['bouclier', 'Garantie', site.garantie || 'Conditions indiquées par écrit avant l’achat.'],
      ['paie', 'Paiement', site.paiement || 'Moyens de paiement précisés à la commande.'],
      ['magasin', 'Au magasin', 'À voir avenue Maurice Yaméogo, Koulouba.']];
    var verbe = x.dispo === 'commande' ? 'Réserver' : surDemande(x) ? 'Demander le prix' : 'Commander';
    var cDevis = lienContact(site, 'Bonjour Bâti-Pro, je voudrais un devis pour : ' + x.nom);
    var ldP = { '@context': 'https://schema.org', '@type': 'Product', name: x.nom, url: url, sku: 'BP-' + x.id, category: r.nom,
      description: x.desc || descriptionProduit(x), image: photos.length ? x.photos.map(function (s) { return /^https:/.test(s) ? s : b + s; }) : [b + 'img/partage.jpg'] };
    if (x.marque) ldP.brand = { '@type': 'Brand', name: x.marque };
    if (!surDemande(x)) ldP.offers = { '@type': 'Offer', price: x.prix, priceCurrency: 'XOF', availability: DISPO[x.dispo].schema, url: url, seller: { '@type': 'Organization', name: 'Bâti-Pro' } };
    var ld = (surDemande(x) ? '' : jsonLd(ldP) + '\n') + jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: b }, { '@type': 'ListItem', position: 2, name: r.nom, item: b + 'produits.html#' + r.id },
      { '@type': 'ListItem', position: 3, name: x.nom, item: url }] });
    return tete({ titre: titreProduit(x), description: descriptionProduit(x), url: url, ogType: 'product',
      image: photos.length ? (/^https:/.test(x.photos[0]) ? x.photos[0] : b + x.photos[0]) : b + 'img/partage.jpg', p: p, ld: ld }, site) +
      corps(site) + entete(p, 'rayons', site) +
      '<main id="contenu" class="enveloppe fiche">\n<nav class="ariane" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a><span aria-hidden="true">/</span>' +
      '<a href="../produits.html#' + r.id + '">Allée ' + r.code + ' · ' + esc(r.court) + '</a><span aria-hidden="true">/</span>' + esc(x.nom) + '</nav>\n' +
      '<div class="fiche-l">\n<section class="galerie" aria-label="Photos du produit">' + galerie + '</section>\n' +
      '<section class="fiche-info" aria-labelledby="t-produit"><span class="corde" aria-hidden="true"></span><div class="etiquette etiquette-fiche"><span class="fil"></span><div class="etiquette-carton">' +
      '<span class="trou"></span><div class="fiche-badges">' + badges(x) + (x.dispo === 'commande' ? '<span class="pastille pastille-noir">SUR COMMANDE</span>' : '') + '</div>' +
      '<p class="etiquette-rayon">' + esc(r.court) + (x.marque ? ' · ' + esc(x.marque) : '') + '</p><h1 class="fiche-titre" id="t-produit">' + esc(x.nom) + '</h1>' +
      '<p class="fiche-prix">' + (surDemande(x) ? '<span class="sur-demande">Prix sur demande</span>' : nombre(x.prix) + ' <small>FCFA</small>') +
      (x.ancienPrix && x.ancienPrix > x.prix && x.prix > 0 ? ' <s>' + nombre(x.ancienPrix) + ' FCFA</s>' : '') + '</p>' + etat(x) +
      (x.dispo === 'commande' ? '<p class="fiche-note">Délai et prix confirmés avant la commande.</p>' : '') +
      (couls.length ? '<div class="couleurs couleurs-fiche" role="group" aria-label="Choisir la couleur" data-cible="fiche-wa"><p class="couleurs-titre">Couleur : <strong data-couleur-nom>' + esc(couls[0].nom) + '</strong></p><div class="couleurs-l">' +
        couls.map(function (k, i) { return '<button type="button" class="choix-couleur" aria-pressed="' + (i ? 'false' : 'true') + '" data-couleur="' + esc(k.nom) + '"><i style="background:' + esc(k.hex) + '"></i>' + esc(k.nom) + '</button>'; }).join('') + '</div></div>' : '') +
      '<div class="fiche-actions"><a class="btn btn-accent btn-pilule btn-large" id="fiche-wa" data-wa-msg="' + esc(message(x)) + '" href="' + esc(c.href) + '"' + attrsLien(c) + '>' + ico(c.wa ? 'wa' : 'tel') + verbe + (c.wa ? ' sur WhatsApp' : ' par téléphone') + '</a>' +
      '<div class="fiche-actions-2"><a class="btn btn-contour btn-pilule" href="' + esc(cDevis.href) + '"' + attrsLien(cDevis) + '>Demander un devis</a><a class="btn btn-contour btn-pilule" href="tel:' + BOUTIQUE.telLien + '">' + ico('tel') + 'Appeler</a>' +
      '<button type="button" class="btn btn-contour btn-pilule btn-icone" data-partager aria-label="Partager ce produit">' + ico('partage') + '</button></div></div>' +
      '</div></div>\n<ul class="fiche-infos">' + infos.map(function (i) { return '<li>' + ico(i[0]) + '<span><b>' + i[1] + '</b> · ' + lignes(i[2]) + '</span></li>'; }).join('') + '</ul></section>\n</div>\n' +
      '<section class="fiche-bas" aria-label="Détails">\n<div class="fiche-desc monte"><h2 class="titre-section">Le produit</h2><p>' + (x.desc ? lignes(x.desc) : 'Demandez-nous les détails de ce produit : nous vous répondons rapidement sur WhatsApp ou au téléphone.') + '</p></div>\n' +
      '<figure class="fiche-tech monte"><figcaption><b>FICHE TECHNIQUE</b><span>Réf. BP-' + x.id + '</span></figcaption><dl>' +
      specs.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><i aria-hidden="true"></i><dd>' + esc(s[1]) + '</dd></div>'; }).join('') + '</dl></figure>\n</section>\n' +
      (autres.length ? '<section class="section-courte" aria-labelledby="t-autres"><h2 class="titre-section" id="t-autres">Dans la même allée</h2><div class="etagere">' +
        autres.map(function (y) { return carte(y, p, site); }).join('\n') + '</div></section>\n' : '') +
      '</main>\n' + pied(p, liste, site) + barreMobile(site, message(x)) + fin(p);
  }

  // ----- Page 404 (adresses absolues : elle peut s'afficher à n'importe quel niveau) -----
  function page404(b, site) {
    b = base(b);
    return tete({ titre: 'Page introuvable | Bâti-Pro', description: 'Cette page n’existe pas ou plus.', noindex: true, image: b + 'img/partage.jpg', p: b }, site) +
      corps(site) + '<main id="contenu" class="page404 enveloppe"><a class="enseigne" href="' + esc(b) + '"><b>BÂTI PRO</b><small>KOULOUBA · OUAGADOUGOU</small></a>' +
      '<p class="geant">404</p><h1 class="titre-section">Cette page n’existe pas ou plus</h1><p>Le produit a peut-être été retiré ou renommé.</p>' +
      '<p class="actions"><a class="btn btn-accent btn-pilule" href="' + esc(b) + '">Accueil Bâti-Pro</a><a class="btn btn-contour btn-pilule" href="' + esc(b) + 'produits.html">Voir le catalogue</a></p></main>\n</body>\n</html>\n';
  }

  function sitemap(vis, b) {
    var urls = [b, b + 'produits.html'].concat(vis.map(function (x) { return urlProduit(x, b); }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) { return '  <url><loc>' + esc(u) + '</loc></url>'; }).join('\n') + '\n</urlset>\n';
  }
  function robots(b) {
    var chemin = '/';
    try { chemin = new URL(b).pathname; } catch (e) {}
    return 'User-agent: *\nAllow: /\nDisallow: ' + chemin + 'admin.html\n\nSitemap: ' + b + 'sitemap.xml\n';
  }

  // Tout le site d'un coup. `liste` est modifiée : chaque article reçoit son adresse.
  function generer(liste, adresse, reglages) {
    var b = base(adresse), site = normSite(reglages);
    attribuerSlugs(liste);
    var vis = visibles(liste.map(normaliser).map(function (x, i) { x.slug = liste[i].slug; return x; }));
    var tous = liste.map(function (x) { var n = normaliser(x); n.slug = x.slug; return n; });
    var f = {};
    f['index.html'] = pageAccueil(tous, b, site);
    f['produits.html'] = pageCatalogue(tous, b, site);
    vis.forEach(function (x) { f['produit/' + x.slug + '.html'] = pageProduit(x, tous, b, site); });
    f['404.html'] = page404(b, site);
    f['sitemap.xml'] = sitemap(vis, b);
    f['robots.txt'] = robots(b);
    return { fichiers: f, pages: vis.length };
  }

  return {
    BOUTIQUE: BOUTIQUE, SITE_PAR_DEFAUT: SITE_PAR_DEFAUT, RAYONS: RAYONS, DISPO: DISPO, CSP: CSP,
    base: base, idGA: idGA, codeGSC: codeGSC, waNum: waNum, normSite: normSite, lienReseau: lienReseau, normaliser: normaliser,
    slugify: slugify, attribuerSlugs: attribuerSlugs, titre: titreProduit, description: descriptionProduit,
    enPromo: enPromo, generer: generer
  };
});
