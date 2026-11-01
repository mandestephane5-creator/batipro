/* Bâti-Pro — fonctionnement du site : rayons, catalogue, fiche produit, WhatsApp et référencement */
(function () {
  'use strict';

  // ================== RÉGLAGES À COMPLÉTER ==================
  // Numéro WhatsApp au format international, sans + ni espaces (Burkina = 226).
  // ⚠️ 25 33 34 47 est un fixe : mettez ici le numéro MOBILE qui a WhatsApp.
  var WHATSAPP = '22625333447';
  // Adresse définitive du site (liens partagés, Google)
  var SITE_URL = 'https://www.batipro.bf';
  // Produit mis en avant dans « Le moment » (accueil)
  var PRODUIT_DU_MOMENT = 'moto-toro-valor-160';
  // =========================================================

  var CATS = window.CATEGORIES || [], PRODS = window.PRODUCTS || [], PHOTOS = window.PHOTOS || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var plat = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var prix = function (p) { return p ? p.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' FCFA' : 'Prix sur demande'; };
  var cat = function (id) { return CATS.find(function (c) { return c.id === id; }); };
  var wa = function (m) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(m); };
  var fiche = function (p) { return 'produit.html?id=' + encodeURIComponent(p.id); };
  var msgProduit = function (p) { return 'Bonjour Bâti-Pro, je suis intéressé(e) par : ' + p.nom + ' (' + prix(p.prix) + '). Est-il disponible ?'; };
  var nbsp = function (t) { return String(t).replace(/(\d) (\d)/g, '$1\u00a0$2'); };
  var deux = function (n) { return (n < 10 ? '0' : '') + n; };

  // ---------- Liens WhatsApp généraux ----------
  $$('[data-wa]').forEach(function (a) {
    a.href = wa('Bonjour Bâti-Pro, je souhaite un renseignement.');
    a.target = '_blank'; a.rel = 'noopener';
  });

  // ---------- Photos (avec repli propre si une photo ne charge pas) ----------
  function brancherPhoto(img, src) {
    if (!src) { img.closest('figure, a, div').classList.add('sans-photo'); return; }
    img.addEventListener('error', function () { img.closest('figure, a, div').classList.add('sans-photo'); img.remove(); }, { once: true });
    img.src = src;
  }
  $$('img[data-photo]').forEach(function (img) { brancherPhoto(img, PHOTOS[img.dataset.photo]); });

  // ---------- Menu mobile (tiroir) et recherche mobile ----------
  var menu = $('.menu'), tiroir = $('#tiroir');
  function basculerMenu(ouvrir) {
    if (!tiroir) return;
    tiroir.hidden = !ouvrir;
    document.body.classList.toggle('menu-ouvert', ouvrir);
    menu.setAttribute('aria-expanded', String(ouvrir));
    menu.innerHTML = ouvrir ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  }
  if (menu) menu.addEventListener('click', function () { basculerMenu(tiroir.hidden); });
  $$('#tiroir a').forEach(function (a) { a.addEventListener('click', function () { basculerMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tiroir && !tiroir.hidden) basculerMenu(false); });
  var ouvrirCherche = $('.ouvrir-cherche');
  if (ouvrirCherche) ouvrirCherche.addEventListener('click', function () {
    var o = document.body.classList.toggle('cherche-ouverte');
    if (o) $('#q-entete').focus();
  });
  // le champ du haut reprend la recherche en cours
  if (params.get('q') && $('#q-entete')) $('#q-entete').value = params.get('q');

  // ---------- Rayon actif dans la barre ----------
  function rayonActif(id) {
    $$('[data-rayon-nav]').forEach(function (a) {
      var on = a.dataset.rayonNav === id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      if (on && window.innerWidth <= 700) a.parentNode.parentNode.scrollLeft = a.parentNode.offsetLeft - 16;
    });
  }

  // ---------- Vignette produit : photo réelle si fournie, sinon étiquette typographique ----------
  // Photo de l'article : img/produits/<id>.jpg (ou le chemin indiqué dans products.js).
  // Tant qu'elle n'existe pas, l'étiquette typographique reste visible en dessous.
  var photoProduit = function (p) { return p.image || 'img/produits/' + p.id + '.jpg'; };
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName === 'IMG' && img.hasAttribute('data-repli')) img.remove();
  }, true);
  function media(p, grand) {
    var c = cat(p.cat) || {};
    return '<span class="media-boite">' + etiquette(p, c)
      + '<img data-repli src="' + esc(photoProduit(p)) + '" alt="' + esc(p.nom + ', ' + (c.nom || '') + ', Bâti-Pro Ouagadougou') + '" loading="' + (grand ? 'eager' : 'lazy') + '" decoding="async" width="900" height="1100"></span>';
  }
  function etiquette(p, c) {
    return '<span class="etiquette" role="img" aria-label="' + esc(p.nom) + '"><span class="e-rayon">' + esc(c.nom || '') + '</span><span class="e-nom">' + esc(nbsp(p.nom)) + '</span><span class="e-ref">Réf. ' + esc(p.id.split('-').slice(0, 3).join('-').toUpperCase()) + '</span></span>';
  }
  function produitHtml(p) {
    var c = cat(p.cat) || {};
    return '<article class="produit">'
      + '<a class="produit-media" href="' + fiche(p) + '" tabindex="-1" aria-hidden="true">' + media(p) + '</a>'
      + '<p class="produit-rayon">' + esc(c.nom || '') + (p.badge ? ' <span class="marque">· ' + esc(p.badge) + '</span>' : '') + '</p>'
      + '<h3 class="produit-nom"><a href="' + fiche(p) + '">' + esc(nbsp(p.nom)) + '</a></h3>'
      + '<p class="produit-prix">' + prix(p.prix) + '</p>'
      + '<a class="produit-cmd" href="' + wa(msgProduit(p)) + '" target="_blank" rel="noopener">Commander <span aria-hidden="true">→</span></a>'
      + '</article>';
  }

  // ================= ACCUEIL =================
  var liste = $('#rayons-liste');
  if (liste) {
    liste.innerHTML = CATS.map(function (c, i) {
      var n = PRODS.filter(function (p) { return p.cat === c.id; }).length;
      return '<li><a href="produits.html?cat=' + esc(c.id) + '" data-rayon="' + esc(c.id) + '">'
        + '<span class="r-num">' + deux(i + 1) + '</span>'
        + '<span class="r-nom">' + esc(c.nom) + '</span>'
        + '<span class="r-desc">' + esc(c.accroche) + '</span>'
        + '<span class="r-n">' + n + ' produit' + (n > 1 ? 's' : '') + '</span>'
        + '<span class="r-mini"><img alt="" loading="lazy" data-mini="' + esc(c.id) + '"></span>'
        + '</a></li>';
    }).join('');
    $$('img[data-mini]', liste).forEach(function (img) { brancherPhoto(img, PHOTOS[img.dataset.mini]); });
    // grande photo du rayon survolé (ordinateur)
    var grande = $('#rayons-img');
    var montrer = function (id) {
      if (!grande || !PHOTOS[id] || grande.dataset.id === id) return;
      grande.classList.add('change');
      setTimeout(function () { grande.src = PHOTOS[id]; grande.dataset.id = id; grande.alt = (cat(id) || {}).nom || ''; }, 180);
    };
    if (grande) {
      grande.addEventListener('load', function () { grande.classList.remove('change'); });
      grande.addEventListener('error', function () { grande.classList.remove('change'); });
      montrer(CATS[0] && CATS[0].id);
    }
    $$('a[data-rayon]', liste).forEach(function (a) {
      a.addEventListener('mouseenter', function () { montrer(a.dataset.rayon); });
      a.addEventListener('focus', function () { montrer(a.dataset.rayon); });
    });
  }

  var moment = $('#moment');
  if (moment) {
    var pm = PRODS.find(function (p) { return p.id === PRODUIT_DU_MOMENT; }) || PRODS[0];
    if (pm) {
      var specs = pm.caracteristiques ? Object.keys(pm.caracteristiques).slice(0, 3).map(function (k) { return '<div><dt>' + esc(k) + '</dt><dd>' + esc(pm.caracteristiques[k]) + '</dd></div>'; }).join('') : '';
      var kit = PRODS.find(function (p) { return p.id === 'kit-solaire-eclairage-recharge'; });
      moment.innerHTML = '<div class="moment-grid">'
        + '<figure class="moment-photo"><img alt="' + esc(pm.nom) + ' disponible chez Bâti-Pro" loading="lazy" id="moment-img" width="1400" height="1000"></figure>'
        + '<div class="moment-texte apparait">'
        + '<p class="sur-titre">' + esc(pm.badge || 'En ce moment') + '</p>'
        + '<h2>' + esc(nbsp(pm.nom)) + '</h2>'
        + '<p class="moment-prix">' + prix(pm.prix) + '</p>'
        + '<p>' + esc(pm.description) + '</p>'
        + (specs ? '<dl class="specs">' + specs + '</dl>' : '')
        + '<div class="ctas"><a class="btn btn-plein" href="' + wa(msgProduit(pm)) + '" target="_blank" rel="noopener">Réserver sur WhatsApp</a><a class="btn btn-lien" href="' + fiche(pm) + '">Voir la fiche <span aria-hidden="true">→</span></a></div>'
        + '</div></div>'
        + '<div class="wrap aussi"><span class="aussi-t">Aussi en ce moment</span>'
        + (kit ? '<a href="produits.html?cat=solaire">Kits solaires dès ' + prix(kit.prix) + '</a>' : '')
        + '<a href="produits.html?cat=climatisation">Climatiseurs en stock, installation sur devis</a></div>';
      brancherPhoto($('#moment-img'), pm.image || PHOTOS[pm.cat]);
    }
  }

  var demandes = $('#demandes');
  if (demandes) demandes.innerHTML = '<div class="defile-piste">' + PRODS.filter(function (p) { return p.populaire; }).map(produitHtml).join('') + '</div>';

  // ================= CATALOGUE =================
  var grille = $('#grille');
  if (grille) {
    var etat = { cat: cat(params.get('cat')) ? params.get('cat') : '', q: params.get('q') || '' };
    var champ = $('#recherche');
    champ.value = etat.q;
    var minuteur;
    champ.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(function () { etat.q = champ.value; adresse(); rendre(); }, 180); });

    var adresse = function () {
      var u = new URLSearchParams();
      if (etat.cat) u.set('cat', etat.cat);
      if (etat.q.trim()) u.set('q', etat.q.trim());
      history.replaceState(null, '', 'produits.html' + (u.toString() ? '?' + u : ''));
    };
    var rendre = function () {
      var c = cat(etat.cat), q = plat(etat.q).trim();
      rayonActif(etat.cat);
      var r = PRODS.filter(function (p) {
        return (!etat.cat || p.cat === etat.cat) && (!q || plat([p.nom, p.marque, p.description, (cat(p.cat) || {}).nom].join(' ')).indexOf(q) >= 0);
      });
      $('#compte').innerHTML = esc(r.length + ' produit' + (r.length > 1 ? 's' : '') + (q ? ' pour « ' + etat.q.trim() + ' »' : ''))
        + (c ? ' <a href="produits.html" class="tous-rayons"><i class="fa-solid fa-xmark" aria-hidden="true"></i> Tous les rayons</a>' : '');
      grille.innerHTML = r.length ? r.map(produitHtml).join('')
        : '<p class="vide">Aucun produit ne correspond. Essayez un autre mot, ou demandez-nous directement.</p>';
      $('#cat-h1').textContent = c ? c.nom : 'Catalogue';
      $('#cat-intro').textContent = c ? c.accroche : 'Tous les produits du magasin, avec leurs prix en FCFA.';
      document.title = c ? c.nom + ' à Ouagadougou — Bâti-Pro' : 'Catalogue — Bâti-Pro, Ouagadougou';
      meta('description', c ? c.nom + ' à Ouagadougou chez Bâti-Pro : ' + c.accroche.toLowerCase().replace(/\.$/, '') + '. Prix en FCFA, commande sur WhatsApp et livraison.' : null);
      canonique(SITE_URL + '/produits.html' + (c ? '?cat=' + c.id : ''));
    };
    rendre();
  }

  // ================= FICHE PRODUIT =================
  var racine = $('#fiche');
  if (racine) {
    var p = PRODS.find(function (x) { return x.id === params.get('id'); });
    if (!p) {
      document.title = 'Produit introuvable — Bâti-Pro';
      meta('robots', 'noindex');
      $('#ariane-produit').textContent = 'Introuvable';
      racine.innerHTML = '<div class="introuvable-fiche"><h1>Ce produit n\'est plus en ligne.</h1><p>Il a peut-être été retiré ou le lien est incomplet.</p><a class="btn btn-plein" href="produits.html">Retour au catalogue</a></div>';
      $('#similaires-bloc').remove();
    } else {
      var c = cat(p.cat) || {};
      var lignes = p.caracteristiques ? Object.keys(p.caracteristiques).map(function (k) { return '<tr><th scope="row">' + esc(k) + '</th><td>' + esc(p.caracteristiques[k]) + '</td></tr>'; }).join('') : '';
      $('#ariane-produit').textContent = p.nom;
      racine.innerHTML = '<figure class="fiche-media"><img id="fiche-img" src="' + esc(photoProduit(p)) + '" alt="' + esc(p.nom + ', Bâti-Pro Ouagadougou') + '" width="900" height="1100"><figcaption hidden>Photo d\'illustration du rayon ' + esc(c.nom.toLowerCase()) + '</figcaption></figure>'
        + '<div class="fiche-infos">'
        + '<p class="sur-titre"><a href="produits.html?cat=' + esc(p.cat) + '">' + esc(c.nom) + '</a>' + (p.marque ? ' · ' + esc(p.marque) : '') + '</p>'
        + '<h1>' + esc(nbsp(p.nom)) + '</h1>'
        + '<p class="fiche-prix">' + prix(p.prix) + '</p>'
        + '<p class="fiche-desc">' + esc(p.description) + '</p>'
        + '<div class="ctas"><a class="btn btn-plein" href="' + wa(msgProduit(p)) + '" target="_blank" rel="noopener">Commander sur WhatsApp</a>'
        + '<a class="btn btn-contour" href="tel:+22625333447">Appeler le 25 33 34 47</a></div>'
        + (lignes ? '<table class="caracteristiques"><caption>Caractéristiques</caption><tbody>' + lignes + '</tbody></table>' : '')
        + '<ul class="garanties"><li>Vérifié en boutique avant la vente</li><li>Retrait à Koulouba ou livraison à Ouagadougou</li><li>Prix confirmé à la commande</li></ul>'
        + '<button type="button" class="partager" id="partager">Partager ce produit</button>'
        + '</div>';
      rayonActif(p.cat);
      var imgFiche = $('#fiche-img');
      imgFiche.addEventListener('error', function repli() {
        imgFiche.removeEventListener('error', repli);
        var fig = imgFiche.closest('figure');
        if (PHOTOS[p.cat]) { brancherPhoto(imgFiche, PHOTOS[p.cat]); fig.querySelector('figcaption').hidden = false; }
        else { imgFiche.remove(); fig.insertAdjacentHTML('afterbegin', etiquette(p, c)); }
      });

      var titre = p.nom + ' — ' + prix(p.prix) + ' | Bâti-Pro Ouagadougou';
      var desc = p.nom + ' à ' + prix(p.prix) + ' chez Bâti-Pro, Ouagadougou. ' + p.description;
      document.title = titre;
      meta('description', desc.slice(0, 158));
      meta('og:title', titre, true); meta('og:description', desc.slice(0, 200), true);
      meta('og:type', 'product', true); meta('og:url', SITE_URL + '/' + fiche(p), true);
      canonique(SITE_URL + '/' + fiche(p));
      jsonLd({
        '@context': 'https://schema.org', '@type': 'Product', name: p.nom, description: p.description, category: c.nom, sku: p.id,
        brand: p.marque ? { '@type': 'Brand', name: p.marque } : undefined,
        image: p.image ? SITE_URL + '/' + p.image : undefined,
        offers: p.prix ? { '@type': 'Offer', price: p.prix, priceCurrency: 'XOF', availability: 'https://schema.org/InStock', url: SITE_URL + '/' + fiche(p), seller: { '@type': 'Organization', name: 'Bâti-Pro' } } : undefined,
      });
      jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: c.nom, item: SITE_URL + '/produits.html?cat=' + p.cat },
        { '@type': 'ListItem', position: 3, name: p.nom },
      ] });

      $('#partager').addEventListener('click', function () {
        if (navigator.share) navigator.share({ title: p.nom, text: p.nom + ' — ' + prix(p.prix), url: location.href }).catch(function () {});
        else window.open('https://wa.me/?text=' + encodeURIComponent(p.nom + ' — ' + prix(p.prix) + ' chez Bâti-Pro : ' + location.href), '_blank', 'noopener');
      });

      var sim = PRODS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; });
      if (sim.length) { $('#similaires-titre').textContent = 'Aussi au rayon ' + c.nom.toLowerCase(); $('#similaires').innerHTML = '<div class="defile-piste">' + sim.map(produitHtml).join('') + '</div>'; }
      else $('#similaires-bloc').remove();
    }
  }

  // ---------- Référencement : petits outils ----------
  function meta(nom, contenu, prop) {
    if (!contenu) return;
    var a = prop ? 'property' : 'name', m = document.head.querySelector('meta[' + a + '="' + nom + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(a, nom); document.head.appendChild(m); }
    m.setAttribute('content', contenu);
  }
  function canonique(url) {
    var l = document.head.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
    l.href = url;
  }
  function jsonLd(o) { var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(o); document.head.appendChild(s); }

  // ---------- Apparition discrète au défilement ----------
  var aAnimer = $$('.apparait, .hero-photo, .moment-photo, .rayons-photo');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('anim');
    var io = new IntersectionObserver(function (l) {
      l.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    aAnimer.forEach(function (el) { io.observe(el); });
  }

  // ---------- Divers ----------
  $$('[data-annee]').forEach(function (s) { s.textContent = new Date().getFullYear(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (a && typeof window.gtag === 'function') window.gtag('event', 'clic_whatsapp', { page: location.pathname });
  });
})();
