/* ============================================================
   BÂTI-PRO — petites améliorations des pages
   Le site fonctionne sans ce fichier ; il ajoute les filtres, les couleurs,
   la galerie, le menu mobile et les animations.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var corps = document.body;
  var WA = (corps.getAttribute('data-wa') || '').replace(/\D/g, '');
  var TEL = corps.getAttribute('data-tel') || '+22625333447';
  function lienContact(message) { return WA ? 'https://wa.me/' + WA + '?text=' + encodeURIComponent(message) : 'tel:' + TEL; }
  function ouvrir(message) {
    var url = lienContact(message);
    if (WA) window.open(url, '_blank', 'noopener'); else window.location.href = url;
  }

  // ---------- menu mobile ----------
  var burger = $('.burger'), menu = $('#menu-mobile');
  if (burger && menu) {
    var basculer = function (ouvert) {
      menu.hidden = !ouvert;
      burger.setAttribute('aria-expanded', String(ouvert));
      burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
      var u = burger.querySelector('use'); if (u) u.setAttribute('href', ouvert ? '#i-x' : '#i-menu');
    };
    burger.addEventListener('click', function () { basculer(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) basculer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { basculer(false); burger.focus(); } });
  }

  // ---------- apparitions au défilement ----------
  var aVoir = $$('.brique, .etagere .carte, .rail .carte, .etapes, .showroom-scene');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('carte')) {
          var freres = Array.prototype.indexOf.call(el.parentNode.children, el);
          el.style.animationDelay = Math.min(freres % 6, 5) * 0.07 + 's';
        }
        el.classList.add('vu');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    aVoir.forEach(function (el) { io.observe(el); });
  } else {
    aVoir.forEach(function (el) { el.classList.add('vu'); });
  }

  // ---------- rails horizontaux ----------
  $$('[data-rail]').forEach(function (b) {
    b.addEventListener('click', function () {
      var rail = document.getElementById('rail-' + b.getAttribute('data-rail'));
      if (rail) rail.scrollBy({ left: Number(b.getAttribute('data-sens')) * Math.max(280, rail.clientWidth * 0.8), behavior: 'smooth' });
    });
  });

  // ---------- couleurs : le message WhatsApp précise la couleur choisie ----------
  $$('.couleurs').forEach(function (bloc) {
    var cible = document.getElementById(bloc.getAttribute('data-cible'));
    var nom = bloc.querySelector('[data-couleur-nom]');
    bloc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-couleur]');
      if (!b) return;
      $$('[data-couleur]', bloc).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var c = b.getAttribute('data-couleur');
      if (nom) nom.textContent = c;
      if (cible) cible.href = lienContact(cible.getAttribute('data-wa-msg') + ', en ' + c.toLowerCase());
      var salle = bloc.closest('.showroom');
      if (salle) teindre(salle, b.getAttribute('data-hex'), b);
    });
  });

  // ---------- showroom : le mur prend la couleur choisie ----------
  function estClair(hex) {
    var l = [1, 3, 5].map(function (i) { var c = parseInt(hex.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] > 0.2;
  }
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function teindre(salle, hex, bouton) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    // une vague encore en cours : on la termine tout de suite
    $$('.showroom-vague', salle).forEach(function (v) { salle.style.setProperty('--sr-mur', v.getAttribute('data-hex')); v.remove(); });
    if (!salle.style.getPropertyValue('--sr-mur')) salle.style.setProperty('--sr-mur', getComputedStyle(salle).getPropertyValue('--sr-fond').trim() || '#17191C');
    salle.style.setProperty('--sr-fond', hex);                 // photo, boutons, contours : fondu
    var clairOk = estClair(hex);
    var texte = function () { salle.classList.toggle('showroom-clair', clairOk); };   // texte sombre sur une couleur claire
    clearTimeout(salle._bpTexte);
    var finir = function () { salle.style.setProperty('--sr-mur', hex); };
    if (calme || !('clipPath' in document.documentElement.style)) { texte(); finir(); return; }
    salle._bpTexte = setTimeout(texte, 380);                    // le texte change quand la vague passe dessous
    // la nouvelle couleur s'étend depuis la pastille touchée
    var r = salle.getBoundingClientRect(), p = bouton.getBoundingClientRect();
    var x = p.left + p.width / 2 - r.left, y = p.top + p.height / 2 - r.top;
    var rayon = Math.ceil(Math.max(Math.hypot(x, y), Math.hypot(r.width - x, y), Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y)));
    var v = document.createElement('div');
    v.className = 'showroom-vague';
    v.setAttribute('aria-hidden', 'true');
    v.setAttribute('data-hex', hex);
    v.style.backgroundColor = hex;
    v.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
    salle.insertBefore(v, salle.firstChild);
    v.getBoundingClientRect();                                 // point de départ pris en compte avant l'animation
    v.style.clipPath = 'circle(' + rayon + 'px at ' + x + 'px ' + y + 'px)';
    var fait = false;
    var fin = function () { if (fait || !v.isConnected) return; fait = true;   // une vague déjà remplacée ne touche plus à rien
      clearTimeout(salle._bpTexte); texte(); finir(); v.remove(); };
    v.addEventListener('transitionend', fin);
    setTimeout(fin, 1300);
  }

  // ---------- galerie de la fiche ----------
  var grande = $('#photo-grande');
  $$('.vignette').forEach(function (v) {
    v.addEventListener('click', function () {
      if (!grande) return;
      var g = grande.cloneNode(); g.src = v.getAttribute('data-photo');
      grande.replaceWith(g); grande = g;
      $$('.vignette').forEach(function (x) { x.setAttribute('aria-pressed', String(x === v)); });
    });
  });

  // ---------- partager ----------
  $$('[data-partager]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(d).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () {
        var t = b.lastChild; var avant = t.textContent; t.textContent = 'Lien copié'; setTimeout(function () { t.textContent = avant; }, 2000);
      }).catch(function () {});
    });
  });

  // ---------- formulaire « Écrivez-nous » ----------
  var f = $('#ecrire');
  if (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var nom = f.nom.value.trim(), tel = f.tel.value.trim(), msg = f.msg.value.trim(), err = $('.ecrire-err', f);
      var manque = !nom ? f.nom : !tel ? f.tel : !msg ? f.msg : null;
      if (manque) { err.textContent = 'Indiquez votre nom, votre téléphone et votre demande.'; err.hidden = false; manque.focus(); return; }
      if (!/^[+\d][\d\s.-]{6,}$/.test(tel)) { err.textContent = 'Le numéro de téléphone semble incomplet.'; err.hidden = false; f.tel.focus(); return; }
      err.hidden = true;
      ouvrir('Bonjour Bâti-Pro,\n\n' + msg + '\n\nNom : ' + nom + '\nTéléphone : ' + tel);
    });
  }

  // ---------- catalogue : allées, recherche, filtres, tri ----------
  var champ = $('#q');
  var allees = $$('.allee');
  if (champ && allees.length) {
    var etat = { allee: 'tout', filtres: {}, q: '', tri: '' };
    var sans = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var cartes = $$('.allees .carte');
    cartes.forEach(function (c, i) { c.setAttribute('data-ordre', i); c.setAttribute('data-cherche', sans(c.getAttribute('data-nom'))); });
    var n = $('#n-produits'), aucun = $('#aucun');

    var appliquer = function () {
      var mots = sans(etat.q).split(/\s+/).filter(Boolean);
      var F = etat.filtres, actifs = Object.keys(F).filter(function (k) { return F[k]; });
      var total = 0;
      allees.forEach(function (a) {
        var id = a.getAttribute('data-allee');
        var ici = $$('.carte', a), vus = 0;
        ici.forEach(function (c) {
          var ok = (etat.allee === 'tout' || etat.allee === id) &&
            mots.every(function (m) { return c.getAttribute('data-cherche').indexOf(m) >= 0; }) &&
            (!F.promo || c.getAttribute('data-promo') === '1') && (!F.nouveau || c.getAttribute('data-nouveau') === '1') &&
            (!(F.disponible || F.commande) || (F.disponible && c.getAttribute('data-dispo') === 'disponible') || (F.commande && c.getAttribute('data-dispo') === 'commande'));
          c.hidden = !ok; if (ok) vus++;
        });
        var vide = !ici.length;
        a.hidden = vide ? etat.allee !== id : vus === 0;   // un rayon encore vide n'apparaît que si on le choisit
        total += vus;
        // tri par prix à l'intérieur de chaque allée (prix sur demande à la fin)
        var et = $('.etagere', a);
        if (et) {
          ici.slice().sort(function (x, y) {
            if (!etat.tri) return x.getAttribute('data-ordre') - y.getAttribute('data-ordre');
            var px = Number(x.getAttribute('data-prix')) || Infinity, py = Number(y.getAttribute('data-prix')) || Infinity;
            return etat.tri === 'asc' ? px - py : (px === Infinity ? 1 : py === Infinity ? -1 : py - px);
          }).forEach(function (c) { et.appendChild(c); });
        }
      });
      n.textContent = total;
      var rien = total === 0 && (mots.length || actifs.length || etat.allee === 'tout');
      aucun.hidden = !rien;
    };

    $$('[data-filtre-allee]').forEach(function (b) {
      b.addEventListener('click', function () {
        etat.allee = b.getAttribute('data-filtre-allee');
        $$('[data-filtre-allee]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        appliquer();
      });
    });
    $$('[data-filtre]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-filtre');
        etat.filtres[k] = !etat.filtres[k];
        b.setAttribute('aria-pressed', String(!!etat.filtres[k]));
        appliquer();
      });
    });
    var minuterie;
    champ.addEventListener('input', function () { clearTimeout(minuterie); minuterie = setTimeout(function () { etat.q = champ.value; appliquer(); }, 120); });
    var tri = $('#tri');
    if (tri) tri.addEventListener('change', function () { etat.tri = tri.value; appliquer(); });

    // arrivée depuis un lien : ?q=…, #promotions, #nouveautes ou #<rayon>
    var depart = new URLSearchParams(location.search).get('q');
    if (depart) { champ.value = depart.slice(0, 80); etat.q = champ.value; }
    var ancre = '';
    try { ancre = decodeURIComponent(location.hash.replace('#', '')); } catch (e) {}
    if (!/^[a-z0-9-]{1,40}$/.test(ancre)) ancre = '';
    if (ancre === 'promotions' || ancre === 'nouveautes') {
      var cle = ancre === 'promotions' ? 'promo' : 'nouveau';
      etat.filtres[cle] = true;
      var bf = $('[data-filtre="' + cle + '"]'); if (bf) bf.setAttribute('aria-pressed', 'true');
    } else if (ancre && $('[data-filtre-allee="' + ancre + '"]')) {
      etat.allee = ancre;
      $$('[data-filtre-allee]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-filtre-allee') === ancre)); });
    }
    appliquer();
  }
})();
