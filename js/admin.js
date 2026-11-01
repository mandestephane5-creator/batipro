/* ============================================================
   BÂTI-PRO — Espace admin sans serveur
   Les articles sont dans data/produits.json, sur GitHub.
   Cette page les modifie, puis publie en un seul envoi : les articles,
   les nouvelles photos et toutes les pages du site (js/seo-pages.js).
   ============================================================ */
(function () {
  "use strict";
  // Jamais dans le cadre d'un autre site (protection contre le « clickjacking »)
  if (window.top !== window.self) return;

  /* ---------- Réglages ----------
     Sur GitHub Pages, le compte et le dépôt sont détectés tout seuls.
     Ailleurs (Hostoweb, Cloudflare…), indiquez-les ici, par exemple
     owner: "mandestephane5-creator", repo: "batipro". */
  const CONFIG = {
    owner: "mandestephane5-creator",   // compte GitHub qui héberge le site
    repo: "batipro",                // nom du dépôt
    branch: "",                   // vide = branche principale du dépôt
    dataPath: "data/produits.json",
    sitePath: "data/site.json",   // réglages de la boutique et de Google
    imgDir: "img/produits",
  };
  const SEO = window.BPSEO;       // js/seo-pages.js : fabrique les pages du site

  /* ---------- outils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fcfa = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const keep = {
    get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} },
  };
  const slug = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "article";

  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  async function gitBlobSha(text) {
    const body = new TextEncoder().encode(text);
    const head = new TextEncoder().encode("blob " + body.length + "\0");
    const all = new Uint8Array(head.length + body.length);
    all.set(head); all.set(body, head.length);
    const h = await crypto.subtle.digest("SHA-1", all);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const normaliser = (p) => SEO.normaliser(p);

  /* ---------- référencement : adresse du site et outils Google ---------- */
  function adresseDetectee() {
    if (!/^https?:$/.test(location.protocol)) return "";
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname)) return "";
    return location.origin + location.pathname.replace(/[^/]*$/, "");
  }
  const normSite = (o) => SEO.normSite(o);
  const adresseSite = () => S.site.adresse || adresseDetectee() || SEO.SITE_PAR_DEFAUT;
  function siteChange() {
    return S.siteOriginal === null || JSON.stringify(normSite(S.site)) !== JSON.stringify(S.siteOriginal);
  }

  /* ---------- état ---------- */
  const S = {
    owner: "", repo: "", branch: "", token: "",
    baseSha: null,          // version du fichier en ligne sur laquelle on travaille
    original: [],           // articles tels qu'en ligne
    produits: [],           // articles avec les modifications
    images: {},             // nouvelles photos à envoyer : chemin -> data URL
    shown: {},              // photos déjà envoyées, gardées pour l'affichage
    site: null,             // réglages de la boutique (modifiés)
    siteOriginal: null,     // réglages en ligne (null = jamais publiés)
    filtre: "tous", q: "", cat: "",
  };
  const draftKey = () => `bp-admin-brouillon:${S.owner}/${S.repo}`.toLowerCase();

  /* ---------- message et confirmation ---------- */
  let toastT;
  function toast(msg, ms = 2800) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("on"), ms);
  }
  function ask(title, text, yes = "Confirmer", no = "Annuler") {
    return new Promise((resolve) => {
      const d = $("#dialog");
      $("#dlgTitle").textContent = title;
      $("#dlgText").textContent = text;
      $("#dlgYes").textContent = yes;
      $("#dlgNo").textContent = no;
      d.hidden = false;
      $("#dlgYes").focus();
      const done = (v) => { d.hidden = true; $("#dlgYes").onclick = $("#dlgNo").onclick = null; resolve(v); };
      $("#dlgYes").onclick = () => done(true);
      $("#dlgNo").onclick = () => done(false);
    });
  }

  /* ---------- API GitHub ---------- */
  async function gh(path, opts = {}) {
    let res;
    try {
      res = await fetch("https://api.github.com" + path, {
        method: opts.method || "GET",
        headers: Object.assign(
          { Accept: "application/vnd.github+json", Authorization: "Bearer " + S.token, "X-GitHub-Api-Version": "2022-11-28" },
          opts.body ? { "Content-Type": "application/json" } : {}
        ),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) {
      const err = new Error("Pas de connexion internet. Vérifiez votre réseau et réessayez.");
      err.status = 0;
      throw err;
    }
    if (!res.ok) {
      let msg = "";
      try { msg = (await res.json()).message || ""; } catch (e) {}
      const err = new Error(msg || res.statusText);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const R = () => `/repos/${encodeURIComponent(S.owner)}/${encodeURIComponent(S.repo)}`;
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

  function messageErreur(e, quoi) {
    if (e.status === 0) return e.message;
    if (e.status === 401) return "Clé refusée par GitHub : elle est incorrecte ou a expiré. Créez-en une nouvelle.";
    if (e.status === 403 && /rate limit/i.test(e.message)) return "GitHub limite les envois pour l'instant. Réessayez dans quelques minutes.";
    if (e.status === 403 || (e.status === 404 && quoi === "publier"))
      return "Cette clé n'a pas le droit de modifier le dépôt. Sur GitHub, donnez-lui la permission « Contents : Read and write ».";
    if (e.status === 404) return `Dépôt « ${S.owner}/${S.repo} » introuvable. Vérifiez son nom, et que la clé a bien accès à ce dépôt.`;
    if (e.status === 409) return "Le dépôt est vide. Envoyez d'abord les fichiers du site sur GitHub.";
    return "Erreur GitHub : " + e.message;
  }

  /* ---------- dépôt : détection et réglages ---------- */
  function detecter() {
    const h = location.hostname.toLowerCase();
    if (h.endsWith(".github.io")) {
      const owner = h.replace(/\.github\.io$/, "");
      const seg = location.pathname.split("/").filter(Boolean)[0];
      return { owner, repo: seg && !seg.includes(".") ? seg : h };
    }
    return null;
  }
  function chargerReglages() {
    let saved = null;
    try { saved = JSON.parse(keep.get("bp-admin-depot") || "null"); } catch (e) {}
    const d = detecter();
    S.owner = (saved && saved.owner) || (d && d.owner) || CONFIG.owner;
    S.repo = (saved && saved.repo) || (d && d.repo) || CONFIG.repo;
    $("#repoLabel").textContent = S.owner && S.repo ? `${S.owner}/${S.repo}` : "à indiquer";
    $("#inOwner").value = S.owner;
    $("#inRepo").value = S.repo;
    if (!S.owner || !S.repo) { $("#repoFields").hidden = false; $("#repoLine").hidden = true; }
  }

  /* ---------- verrouillage ----------
     La clé GitHub n'est jamais enregistrée en clair : elle est chiffrée
     (AES-GCM) avec une clé tirée du code de verrouillage (PBKDF2).
     Sans le code, ce qui reste sur l'appareil est illisible. */
  const COFFRE = "bp-admin-coffre", ESSAIS = "bp-admin-essais";
  const MAX_ESSAIS = 5, VEILLE_MIN = 10, TOURS = 600000;
  const masqueCss = !!(window.CSS && CSS.supports && CSS.supports("-webkit-text-security", "disc"));
  function remasquer() {
    $$("[data-eye]").forEach((b) => {
      const i = document.getElementById(b.dataset.eye);
      if (masqueCss) i.classList.add("secret"); else i.type = "password";
      b.querySelector("i").className = "fas fa-eye";
    });
  }
  let coffreMemo = null, verrouille = false, modeVerrou = "ouvrir", derniereActivite = Date.now();
  const b64 = (u8) => { let s = ""; u8.forEach((c) => (s += String.fromCharCode(c))); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function cleDuCode(code, sel, tours) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sel, iterations: tours, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function sceller(token, code, local) {
    const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await cleDuCode(code, sel, TOURS);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(token)));
    coffreMemo = { v: 1, it: TOURS, sel: b64(sel), iv: b64(iv), ct: b64(ct) };
    oublierCle(true);
    if (!keep.set(COFFRE, JSON.stringify(coffreMemo), !local))
      toast("Cet appareil ne peut pas garder la clé : il faudra la recoller à la prochaine ouverture.", 5000);
  }
  function coffre() {
    try { return JSON.parse(keep.get(COFFRE, true) || keep.get(COFFRE) || "null") || coffreMemo; } catch (e) { return coffreMemo; }
  }
  async function ouvrirCoffre(code) {
    const c = coffre();
    if (!c) return null;
    try {
      const k = await cleDuCode(code, unb64(c.sel), c.it || TOURS);
      return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(c.iv) }, k, unb64(c.ct)));
    } catch (e) { return null; }
  }
  function oublierCle(garderMemo) {
    keep.del(COFFRE); keep.del(ESSAIS); keep.del("bp-admin-cle");
    if (!garderMemo) coffreMemo = null;
  }
  function codeFaible(c) {
    if (c.length < 6) return "Le code doit faire au moins 6 caractères.";
    if (/^(.)\1+$/.test(c)) return "Ce code est trop simple : évitez de répéter le même caractère.";
    if ("01234567890 09876543210 abcdefghijklmnopqrstuvwxyz azertyuiop qwertyuiop".includes(c.toLowerCase()))
      return "Ce code est trop simple : évitez les suites comme 123456 ou abcdef.";
    if (/^(password|motdepasse|zentech|admin)/i.test(c)) return "Ce code est trop facile à deviner.";
    return "";
  }
  function inerte(on) {
    ["#app", "#editor", "#seoPanel", "#veil", "#dialog"].forEach((s) => { const el = $(s); if (el) el.inert = on; });
  }
  function montrerVerrou(mode, msg) {
    modeVerrou = mode;
    const choisir = mode === "choisir";
    $("#lockTitle").textContent = choisir ? "Protégez l'admin" : "Admin verrouillé";
    $("#lockSub").textContent = msg || (choisir
      ? `Choisissez un code de verrouillage. Il vous sera demandé sur cet appareil à chaque ouverture et après ${VEILLE_MIN} minutes sans activité.`
      : "Entrez votre code de verrouillage pour continuer.");
    $("#lockCode2").hidden = !choisir;
    $("#inUnlock").placeholder = choisir ? "6 caractères minimum" : "";
    $("#unlockBtn").innerHTML = choisir ? '<i class="fas fa-shield-halved"></i> Enregistrer le code' : '<i class="fas fa-unlock"></i> Déverrouiller';
    $("#lockForgot").textContent = choisir ? "Utiliser une autre clé GitHub" : "Code oublié ? Se reconnecter avec la clé GitHub";
    $("#inUnlock").value = $("#inUnlock2").value = "";
    remasquer();
    $("#lockErr").hidden = true;
    $("#login").hidden = true;
    $("#lock").hidden = false;
    inerte(true);
    setTimeout(() => $("#inUnlock").focus(), 60);
  }
  function deverrouiller() {
    verrouille = false;
    $("#lock").hidden = true;
    inerte(false);
    derniereActivite = Date.now();
  }
  function verrouiller(auto) {
    if (!S.token || verrouille) return;
    if (!coffre()) return retourConnexion("Session terminée. Reconnectez-vous avec votre clé GitHub.");
    verrouille = true;
    S.token = "";
    montrerVerrou("ouvrir", auto ? `Verrouillé après ${VEILLE_MIN} minutes sans activité. Entrez votre code pour continuer.` : "");
  }
  function retourConnexion(msg) {
    verrouille = false;
    S.token = "";
    S.ancien = null;
    $("#lock").hidden = true;
    $("#app").hidden = true;
    inerte(false);
    $("#login").hidden = false;
    const e = $("#loginErr");
    e.textContent = msg || "";
    e.hidden = !msg;
    setTimeout(() => $("#inToken").focus(), 60);
  }
  function verifierVeille() {
    if (S.token && !verrouille && !publishing && Date.now() - derniereActivite > VEILLE_MIN * 60000) verrouiller(true);
  }

  /* ---------- connexion ---------- */
  async function connecter(token, scelle) {
    S.token = token.trim();
    const repo = await gh(R());
    S.branch = CONFIG.branch || repo.default_branch || "main";
    if (repo.permissions && repo.permissions.push === false)
      throw Object.assign(new Error(""), { status: 403 });
    await chargerArticles();
    if (scelle) await sceller(S.token, scelle.code, scelle.local);
    keep.set("bp-admin-depot", JSON.stringify({ owner: S.owner, repo: S.repo }));
    ["#inToken", "#inCode", "#inCode2", "#inUnlock", "#inUnlock2"].forEach((s) => ($(s).value = ""));
    remasquer();
    $("#login").hidden = true;
    $("#lock").hidden = true;
    inerte(false);
    verrouille = false;
    S.ancien = null;
    derniereActivite = Date.now();
    $("#app").hidden = false;
    $("#repoInfo").textContent = `Dépôt ${S.owner}/${S.repo} · branche ${S.branch}`;
    await reprendreBrouillon();
    rendre();
    S.pret = true;
  }

  async function chargerArticles() {
    let r = null;
    try {
      r = await gh(`${R()}/contents/${enc(CONFIG.dataPath)}?ref=${encodeURIComponent(S.branch)}&t=${Date.now()}`);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    if (!r) {
      S.baseSha = null;
      S.original = [];
      toast(`Le fichier ${CONFIG.dataPath} n'existe pas encore : il sera créé à la première publication.`, 5000);
    } else {
      let b64 = r.content;
      if (!b64 && r.sha) b64 = (await gh(`${R()}/git/blobs/${r.sha}`)).content; // fichier de plus de 1 Mo
      let data;
      try { data = JSON.parse(b64ToUtf8(b64)); } catch (e) { throw new Error(`Le fichier ${CONFIG.dataPath} est abîmé (JSON invalide).`); }
      S.baseSha = r.sha;
      S.original = (Array.isArray(data) ? data : []).map(normaliser);
    }
    S.produits = clone(S.original);
    S.images = {};
    // réglages de la boutique et de Google
    S.siteOriginal = null;
    try {
      const f = await gh(`${R()}/contents/${enc(CONFIG.sitePath)}?ref=${encodeURIComponent(S.branch)}&t=${Date.now()}`);
      S.siteOriginal = normSite(JSON.parse(b64ToUtf8(f.content || "")));
    } catch (e) {
      if (e.status && e.status !== 404) throw e;
    }
    S.site = S.siteOriginal ? clone(S.siteOriginal) : normSite({ adresse: adresseDetectee() });
  }

  async function reprendreBrouillon() {
    let d = null;
    try { d = JSON.parse(keep.get(draftKey()) || "null"); } catch (e) {}
    if (!d || !Array.isArray(d.produits)) return;
    const pareil = JSON.stringify(d.produits.map(normaliser)) === JSON.stringify(S.original);
    if (pareil) { if (d.site) S.site = normSite(d.site); if (!siteChange()) keep.del(draftKey()); return; }
    if (d.site) S.site = normSite(d.site);
    if (d.baseSha === S.baseSha) {
      S.produits = d.produits.map(normaliser);
      S.images = d.images || {};
      toast("Vos modifications non publiées ont été récupérées.");
      return;
    }
    const ok = await ask(
      "Modifications non publiées",
      "Vous aviez des modifications non publiées, mais les articles ont changé en ligne depuis. Les reprendre quand même ? Elles remplaceront la version en ligne quand vous publierez.",
      "Les reprendre", "Les abandonner"
    );
    if (ok) { S.produits = d.produits.map(normaliser); S.images = d.images || {}; }
    else keep.del(draftKey());
  }

  let draftT;
  function sauverBrouillon() {
    clearTimeout(draftT);
    draftT = setTimeout(() => {
      if (!nbChangements()) { keep.del(draftKey()); return; }
      const ok = keep.set(draftKey(), JSON.stringify({ baseSha: S.baseSha, produits: S.produits, images: S.images, site: S.site, date: Date.now() }));
      if (!ok) toast("Photos trop lourdes pour être gardées sur l'appareil : publiez avant de fermer la page.", 4500);
    }, 300);
  }

  /* ---------- modifications ---------- */
  function idsModifies() {
    const o = new Map(S.original.map((p) => [p.id, JSON.stringify(p)]));
    const set = new Set();
    S.produits.forEach((p) => { if (o.get(p.id) !== JSON.stringify(p)) set.add(p.id); });
    return set;
  }
  function nbChangements() {
    const n = new Set(S.produits.map((p) => p.id));
    return idsModifies().size + S.original.filter((p) => !n.has(p.id)).length + (siteChange() ? 1 : 0);
  }
  function apresModif() { sauverBrouillon(); rendre(); }

  /* ---------- affichage ---------- */
  const imgSrc = (p) => S.images[p] || S.shown[p] || p;
  const enPromo = (p) => SEO.enPromo(p);
  const rayonNom = (id) => (SEO.RAYONS.find((r) => r.id === id) || {}).nom || id;
  const DISPO = SEO.DISPO;

  function rendre() {
    const all = S.produits, mod = idsModifies();
    const vis = all.filter((p) => p.visible).length;
    const n = (f) => all.filter(f).length;
    $("#stats").innerHTML =
      `<div class="stat"><b>${all.length}</b><span>articles · ${vis} visibles</span></div>` +
      `<div class="stat ok"><b>${n((p) => p.dispo === "disponible")}</b><span>disponibles</span></div>` +
      `<div class="stat warn"><b>${n((p) => p.dispo === "commande")}</b><span>sur commande</span></div>` +
      `<div class="stat red"><b>${n(enPromo)}</b><span>en promotion</span></div>`;
    // rayons
    const sel = $("#catSel"), cur = S.cat;
    sel.innerHTML = '<option value="">Tous les rayons</option>' + SEO.RAYONS.map((r) => `<option value="${r.id}"${r.id === cur ? " selected" : ""}>${esc(r.nom)} (${n((p) => p.rayon === r.id)})</option>`).join("");
    // liste
    const q = S.q.toLowerCase();
    const list = all.filter((p) => {
      if (S.cat && p.rayon !== S.cat) return false;
      if (q && !`${p.nom} ${p.marque} ${rayonNom(p.rayon)}`.toLowerCase().includes(q)) return false;
      if (S.filtre === "promo") return enPromo(p);
      if (S.filtre === "nouveau") return p.nouveau;
      if (S.filtre === "commande") return p.dispo === "commande";
      if (S.filtre === "rupture") return p.dispo === "rupture";
      if (S.filtre === "masques") return !p.visible;
      if (S.filtre === "modifies") return mod.has(p.id);
      return true;
    });
    $("#list").innerHTML = list.length
      ? list.map((p) => ligne(p, mod.has(p.id))).join("")
      : `<div class="empty"><i class="fas fa-box-open"></i>${all.length ? "Aucun article ne correspond." : "Aucun article pour l'instant. Cliquez sur « Ajouter un article »."}</div>`;
    // barre de publication
    const c = nbChangements();
    $("#pubbar").hidden = c === 0;
    $("#pubCount").textContent = c;
    $("#pubLabel").textContent = c > 1 ? "modifications non publiées"
      : siteChange() ? (S.siteOriginal === null ? "réglage à publier : mise en place du site" : "réglage de la boutique à publier")
      : "modification non publiée";
  }

  function ligne(p, modifie) {
    const neuf = !S.original.some((o) => o.id === p.id);
    const tags = (neuf ? '<span class="tagx mod">ajouté</span>' : modifie ? '<span class="tagx mod">modifié</span>' : "") +
      (p.nouveau ? '<span class="tagx new">Nouveau</span>' : "") + (enPromo(p) ? '<span class="tagx promo">Promo</span>' : "") +
      (p.vedette ? '<span class="tagx une">À la une</span>' : "");
    const ph = p.photos[0];
    const opts = Object.keys(DISPO).map((k) => `<option value="${k}"${p.dispo === k ? " selected" : ""}>${DISPO[k].label}</option>`).join("");
    return `<div class="item${modifie ? " changed" : ""}${p.visible ? "" : " hidden-item"}" data-id="${p.id}">
      <div class="thumb">${ph ? `<img src="${esc(imgSrc(ph))}" alt="" loading="lazy">` : '<i class="fas fa-image"></i>'}</div>
      <div class="it-name"><b>${esc(p.nom)}</b><small>${esc(rayonNom(p.rayon))}${p.marque ? " · " + esc(p.marque) : ""}</small>${tags}</div>
      <div class="it-price">${p.prix > 0 ? `<b>${fcfa(p.prix)}</b>` : '<b class="dem">Prix sur demande</b>'}${p.ancienPrix && p.ancienPrix > p.prix && p.prix > 0 ? `<s>${fcfa(p.ancienPrix)}</s>` : ""}</div>
      <div class="it-stock"><label class="dispo-sel d-${p.dispo}"><span class="sr">Disponibilité de ${esc(p.nom)}</span><select data-dispo>${opts}</select></label></div>
      <div class="it-vis"><span class="sw"><input type="checkbox" data-vis aria-label="Visible sur le site"${p.visible ? " checked" : ""}><i></i></span></div>
      <div class="it-acts"><button class="ib" type="button" data-act="edit" title="Modifier" aria-label="Modifier"><i class="fas fa-pen"></i></button><button class="ib" type="button" data-act="dup" title="Dupliquer" aria-label="Dupliquer"><i class="fas fa-copy"></i></button></div>
    </div>`;
  }

  /* ---------- fiche article ---------- */
  let edit = null; // { id|null, photos: [chemins], nouvelles: { chemin: dataURL } }
  function ouvrir(p, copie) {
    const neuf = !p || copie;
    edit = { id: neuf ? null : p.id, photos: p ? p.photos.slice() : [] };
    $("#edTitle").textContent = neuf ? (copie ? "Nouvel article (copie)" : "Nouvel article") : "Modifier l'article";
    $("#edDelete").hidden = neuf;
    $("#fNom").value = p ? p.nom + (copie ? " (copie)" : "") : "";
    $("#fMarque").value = p ? p.marque : "";
    $("#fRayon").innerHTML = SEO.RAYONS.map((r) => `<option value="${r.id}">${esc(r.nom)}</option>`).join("");
    $("#fRayon").value = p ? p.rayon : S.cat || "materiaux";
    $("#fPrix").value = p && p.prix ? p.prix : "";
    $("#fAncien").value = p && p.ancienPrix ? p.ancienPrix : "";
    $$('#fDispo input').forEach((r) => (r.checked = r.value === (p ? p.dispo : "disponible")));
    $("#fPromo").checked = p ? p.promo : false;
    $("#fNouveau").checked = p ? p.nouveau && !copie : true;
    $("#fVedette").checked = p ? p.vedette && !copie : false;
    $("#fVisible").checked = p ? p.visible : true;
    $("#fDesc").value = p ? p.desc : "";
    $("#couleurs").innerHTML = "";
    (p ? p.couleurs : []).forEach((c) => ajouterCouleur(c.nom, c.hex));
    $("#specs").innerHTML = "";
    Object.entries(p ? p.specs : {}).forEach(([k, v]) => ajouterSpec(k, v));
    if (!p) ajouterSpec("", "");
    montrerPhotos();
    $("#edErr").hidden = true;
    $$(".bad", $("#edForm")).forEach((x) => x.classList.remove("bad"));
    majPromo();
    majApercu();
    $("#veil").hidden = false;
    $("#editor").classList.add("on");
    $("#editor").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    $("#edForm").scrollTop = 0;
    setTimeout(() => $("#fNom").focus({ preventScroll: true }), 300);
  }
  function fermer() {
    $("#editor").classList.remove("on");
    $("#editor").setAttribute("aria-hidden", "true");
    $("#veil").hidden = true;
    document.body.classList.remove("lock");
    edit = null;
  }
  function montrerPhotos() {
    const box = $("#photos");
    box.innerHTML = edit.photos.map((ph, i) => `<div class="ph${i === 0 ? " main" : ""}" data-i="${i}"><img src="${esc(imgSrc(ph))}" alt="">` +
      (i === 0 ? '<span class="ph-tag">Principale</span>' : `<button type="button" class="ph-btn ph-up" data-up="${i}" aria-label="Mettre en photo principale" title="Mettre en photo principale"><i class="fas fa-star"></i></button>`) +
      `<button type="button" class="ph-btn ph-del" data-del="${i}" aria-label="Retirer cette photo" title="Retirer"><i class="fas fa-xmark"></i></button></div>`).join("") +
      (edit.photos.length < 8 ? '<button type="button" class="ph-add" id="photoAdd"><i class="fas fa-camera"></i><span>Ajouter</span></button>' : "");
    const add = $("#photoAdd");
    if (add) add.onclick = () => $("#edFile").click();
  }
  function ajouterSpec(k, v) {
    const d = document.createElement("div");
    d.className = "spec";
    d.innerHTML = `<input class="sk" placeholder="Ex. Puissance" value="${esc(k)}" maxlength="40" aria-label="Caractéristique"><input class="sv" placeholder="Ex. 12 000 BTU" value="${esc(v)}" maxlength="120" aria-label="Valeur"><button type="button" class="ib" aria-label="Retirer"><i class="fas fa-xmark"></i></button>`;
    d.querySelector("button").onclick = () => d.remove();
    $("#specs").appendChild(d);
    return d;
  }
  function ajouterCouleur(nom, hex) {
    const d = document.createElement("div");
    d.className = "spec couleur";
    d.innerHTML = `<input type="color" class="ch" value="${/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#1f2023"}" aria-label="Teinte"><input class="cn" placeholder="Ex. Noir mat" value="${esc(nom)}" maxlength="30" aria-label="Nom de la couleur"><button type="button" class="ib" aria-label="Retirer"><i class="fas fa-xmark"></i></button>`;
    d.querySelector("button").onclick = () => d.remove();
    $("#couleurs").appendChild(d);
    return d;
  }
  // aperçu de l'article tel qu'il apparaîtra dans les résultats Google
  function majApercu() {
    if (!$("#serpUrl")) return;
    const nom = $("#fNom").value.trim() || "Nom de l'article";
    const ancien = edit && edit.id !== null ? S.produits.find((p) => p.id === edit.id) : null;
    const p = SEO.normaliser({ nom, prix: $("#fPrix").value, desc: $("#fDesc").value, dispo: ($("#fDispo input:checked") || {}).value });
    const sl = ancien && ancien.slug ? ancien.slug : SEO.slugify(nom);
    const url = SEO.base(adresseSite()) + "produit/" + sl + ".html";
    $("#serpUrl").textContent = url.replace(/^https?:\/\//, "").replace(/\//g, " › ").replace(/ › $/, "");
    $("#serpTitle").textContent = SEO.titre(p);
    $("#serpDesc").textContent = SEO.description(p);
    const n = $("#fDesc").value.trim().length, h = $("#descHint");
    h.textContent = n === 0 ? "Ajoutez une description : Google l'affiche sous le titre."
      : n < 50 ? `${n} caractères : un peu court. Ajoutez ce que le client recherche (marque, usage, ville).`
      : n > 300 ? `${n} caractères : Google n'en affiche qu'environ 150, mettez l'essentiel au début.`
      : `${n} caractères : bien.`;
    h.className = "hint" + (n >= 50 && n <= 300 ? " ok" : "");
  }
  function majPromo() {
    const prix = Number($("#fPrix").value), anc = Number($("#fAncien").value), h = $("#promoHint");
    if (prix > 0 && anc > prix) { h.hidden = false; h.textContent = `Promo affichée : -${Math.round((1 - prix / anc) * 100)} %, avec l'ancien prix barré.`; }
    else if (!(prix > 0)) { h.hidden = false; h.textContent = "Sans prix, le site affiche « Prix sur demande » et un bouton pour demander le prix."; }
    else h.hidden = true;
  }

  async function lirePhoto(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error("Ce fichier n'est pas une image.");
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const transparent = /png|webp|gif/.test(file.type);
      let max = 1400, data = "";
      for (let essai = 0; essai < 3; essai++) {
        const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * sc);
        c.height = Math.round(img.naturalHeight * sc);
        const ctx = c.getContext("2d");
        if (!transparent) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        data = c.toDataURL("image/webp", 0.82);
        if (!/^data:image\/webp/.test(data)) data = transparent ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
        if (data.length < 1.2e6) break;
        max = Math.round(max * 0.7);
      }
      const ext = /^data:image\/webp/.test(data) ? "webp" : /^data:image\/png/.test(data) ? "png" : "jpg";
      return { data, ext };
    } catch (e) {
      throw new Error("Impossible de lire cette photo. Utilisez une image JPG ou PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function enregistrer() {
    const err = (msg, el) => { const e = $("#edErr"); e.textContent = msg; e.hidden = false; if (el) { el.classList.add("bad"); el.focus(); } };
    $$(".bad", $("#edForm")).forEach((x) => x.classList.remove("bad"));
    const nom = $("#fNom").value.trim(), prix = $("#fPrix").value, anc = $("#fAncien").value;
    if (!nom) return err("Indiquez le nom de l'article.", $("#fNom"));
    if (prix !== "" && !(Number(prix) >= 0)) return err("Le prix doit être un nombre positif (ou vide pour « Prix sur demande »).", $("#fPrix"));
    if (anc !== "" && Number(anc) > 0 && !(Number(prix) > 0)) return err("Indiquez d'abord le prix de vente pour afficher un ancien prix.", $("#fPrix"));
    if (anc !== "" && Number(anc) > 0 && Number(anc) <= Number(prix)) return err("L'ancien prix doit être plus élevé que le prix de vente (ou laissez-le vide).", $("#fAncien"));
    const specs = {};
    $$("#specs .spec").forEach((r) => { const k = r.querySelector(".sk").value.trim(); if (k) specs[k] = r.querySelector(".sv").value.trim(); });
    const couleurs = $$("#couleurs .couleur").map((r) => ({ nom: r.querySelector(".cn").value.trim(), hex: r.querySelector(".ch").value })).filter((c) => c.nom);
    const ancien = S.produits.find((p) => p.id === edit.id);
    // photos jamais publiées et retirées de la fiche : on les oublie
    if (ancien) ancien.photos.forEach((ph) => { if (S.images[ph] && !edit.photos.includes(ph)) delete S.images[ph]; });
    const vedette = $("#fVedette").checked;
    const p = SEO.normaliser({
      id: edit.id !== null ? edit.id : S.produits.concat(S.original).reduce((m, x) => Math.max(m, x.id), 0) + 1,
      nom, marque: $("#fMarque").value, rayon: $("#fRayon").value,
      prix: prix === "" ? 0 : prix, ancienPrix: anc === "" ? null : anc,
      dispo: ($("#fDispo input:checked") || {}).value || "disponible",
      promo: $("#fPromo").checked, nouveau: $("#fNouveau").checked, vedette,
      couleurs, photos: edit.photos, desc: $("#fDesc").value, specs,
      visible: $("#fVisible").checked, slug: ancien ? ancien.slug : "",
    });
    if (vedette) S.produits.forEach((x) => { if (x.id !== p.id && x.vedette) x.vedette = false; }); // un seul article à la une
    if (ancien) S.produits[S.produits.indexOf(ancien)] = p;
    else S.produits.unshift(p);
    fermer();
    apresModif();
    toast(ancien ? "Article modifié. Pensez à publier." : "Article ajouté. Pensez à publier.");
  }

  async function supprimer() {
    const p = S.produits.find((x) => x.id === edit.id);
    if (!p) return;
    const ok = await ask("Supprimer cet article ?", `« ${p.nom} » sera retiré du site à la prochaine publication. Pour le cacher sans le supprimer, décochez plutôt « Visible sur le site ».`, "Supprimer");
    if (!ok) return;
    p.photos.forEach((ph) => { if (S.images[ph]) delete S.images[ph]; });
    S.produits = S.produits.filter((x) => x.id !== p.id);
    fermer();
    apresModif();
    toast("Article supprimé. Pensez à publier.");
  }

  /* ---------- publication ---------- */
  let publishing = false;
  async function publier(essai = 0) {
    if (publishing) return;
    publishing = true;
    const btn = $("#publishBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Publication…';
    try {
      // 1. quelqu'un a-t-il publié entre-temps ?
      let enLigne = null;
      try { enLigne = (await gh(`${R()}/contents/${enc(CONFIG.dataPath)}?ref=${encodeURIComponent(S.branch)}&t=${Date.now()}`)).sha; }
      catch (e) { if (e.status !== 404) throw e; }
      if (essai === 0 && enLigne !== S.baseSha) {
        const ok = await ask("Articles modifiés ailleurs", "Les articles ont été modifiés en ligne depuis que vous avez ouvert cette page (par un autre appareil ?). Publier quand même ? Votre version remplacera celle en ligne.", "Publier quand même");
        if (!ok) return;
      }
      // 2. dernière version du dépôt
      const ref = await gh(`${R()}/git/ref/heads/${enc(S.branch)}`);
      const head = ref.object.sha;
      const commit = await gh(`${R()}/git/commits/${head}`);
      // 3. nouvelles photos utilisées par les articles
      const utilisees = new Set([].concat(...S.produits.map((p) => p.photos)));
      const tree = [];
      for (const [path, data] of Object.entries(S.images)) {
        if (!utilisees.has(path)) continue;
        const blob = await gh(`${R()}/git/blobs`, { method: "POST", body: { content: data.split(",")[1], encoding: "base64" } });
        tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      // 4. toutes les pages du site : accueil, allées, une page par article, 404, plan du site, robots.txt
      //    (les nouveaux articles reçoivent ici l'adresse de leur page, enregistrée dans le fichier des articles)
      const noms = [...idsModifies()].map((id) => (S.produits.find((p) => p.id === id) || {}).nom).filter(Boolean);
      const n = nbChangements(), refChange = siteChange();
      const site = normSite(S.site);
      const gen = SEO.generer(S.produits, adresseSite(), site);
      for (const [path, content] of Object.entries(gen.fichiers)) tree.push({ path, mode: "100644", type: "blob", content });
      // pages d'articles supprimés ou cachés : on les retire
      let anciennes = [];
      try { anciennes = await gh(`${R()}/contents/produit?ref=${encodeURIComponent(head)}`); } catch (e) { if (e.status !== 404) throw e; }
      (Array.isArray(anciennes) ? anciennes : []).forEach((f) => {
        if (f.type === "file" && /\.html$/.test(f.path) && !gen.fichiers[f.path]) tree.push({ path: f.path, mode: "100644", type: "blob", sha: null });
      });
      tree.push({ path: CONFIG.sitePath, mode: "100644", type: "blob", content: JSON.stringify(site, null, 2) + "\n" });
      // 5. fichier des articles
      const json = JSON.stringify(S.produits, null, 2) + "\n";
      tree.push({ path: CONFIG.dataPath, mode: "100644", type: "blob", content: json });
      const newTree = await gh(`${R()}/git/trees`, { method: "POST", body: { base_tree: commit.tree.sha, tree } });
      // 6. un seul envoi pour tout
      const nArt = Math.max(0, n - (refChange ? 1 : 0));
      const message = (nArt
        ? `Admin : ${nArt} modification${nArt > 1 ? "s" : ""} des articles` + (noms.length ? ` (${noms.slice(0, 3).join(", ")}${noms.length > 3 ? ", …" : ""})` : "")
        : "Admin : réglages de la boutique") + (nArt && refChange ? " + réglages" : "");
      const nc = await gh(`${R()}/git/commits`, { method: "POST", body: { message, tree: newTree.sha, parents: [head] } });
      try {
        await gh(`${R()}/git/refs/heads/${enc(S.branch)}`, { method: "PATCH", body: { sha: nc.sha, force: false } });
      } catch (e) {
        if (e.status === 422 && essai < 2) { publishing = false; return publier(essai + 1); } // le dépôt a bougé pendant l'envoi : on recommence
        throw e;
      }
      // 7. c'est en ligne sur GitHub
      S.baseSha = await gitBlobSha(json);
      Object.assign(S.shown, S.images);
      S.images = {};
      S.original = clone(S.produits);
      S.site = site; S.siteOriginal = clone(site);
      keep.del(draftKey());
      rendre();
      toast("Publié ! Le site sera à jour dans une minute environ.", 4000);
      suivreMiseEnLigne(json);
    } catch (e) {
      ask("Publication impossible", messageErreur(e, "publier"), "OK", "Fermer");
    } finally {
      publishing = false;
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Publier sur le site';
    }
  }

  // vérifie quand GitHub Pages sert la nouvelle version
  let suiviT;
  function suivreMiseEnLigne(json) {
    clearInterval(suiviT);
    const chip = $("#sync");
    if (!/^https?:$/.test(location.protocol)) return;
    chip.hidden = false;
    chip.className = "sync wait";
    chip.innerHTML = '<i class="fas fa-circle-notch spin"></i> Mise en ligne…';
    const debut = Date.now();
    suiviT = setInterval(async () => {
      if (Date.now() - debut > 4 * 60 * 1000) { clearInterval(suiviT); chip.hidden = true; return; }
      try {
        const r = await fetch(`${CONFIG.dataPath}?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok && (await r.text()).trim() === json.trim()) {
          clearInterval(suiviT);
          chip.className = "sync ok";
          chip.innerHTML = '<i class="fas fa-check"></i> En ligne';
          setTimeout(() => (chip.hidden = true), 8000);
        }
      } catch (e) {}
    }, 8000);
  }

  /* ---------- panneau « Réglages » : la boutique et Google ---------- */
  const CHAMPS = [["sWhatsapp", "whatsapp"], ["sHoraires", "horaires"], ["sLivraison", "livraison"], ["sGarantie", "garantie"],
    ["sPaiement", "paiement"], ["sEmail", "email"], ["sFacebook", "facebook"], ["sTiktok", "tiktok"], ["sGa", "ga"], ["sGsc", "gsc"]];
  function ouvrirSeo() {
    const det = adresseDetectee();
    $("#sAdresse").value = S.site.adresse || "";
    $("#sAdresse").placeholder = det || SEO.SITE_PAR_DEFAUT;
    $("#sAdresseHint").textContent = det
      ? `Laissez vide pour utiliser l'adresse actuelle : ${det}`
      : "Adresse complète du site, par exemple https://www.batipro.bf/";
    CHAMPS.forEach(([id, k]) => ($("#" + id).value = S.site[k] || ""));
    $("#seoErr").hidden = true;
    majSeoLiens();
    $("#veil").hidden = false;
    $("#seoPanel").classList.add("on");
    $("#seoPanel").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
  }
  function fermerSeo() {
    $("#seoPanel").classList.remove("on");
    $("#seoPanel").setAttribute("aria-hidden", "true");
    if (!edit) $("#veil").hidden = true;
    document.body.classList.remove("lock");
  }
  function majSeoLiens() {
    const a = normSite({ adresse: $("#sAdresse").value.trim() || adresseDetectee() || SEO.SITE_PAR_DEFAUT }).adresse;
    $("#sSitemap").textContent = a + "sitemap.xml";
    $("#sPages").textContent = S.produits.filter((p) => p.visible).length;
  }
  function enregistrerSeo() {
    const err = (m, el) => { const e = $("#seoErr"); e.textContent = m; e.hidden = false; if (el) el.focus(); };
    const v = (id) => $("#" + id).value.trim();
    const a = v("sAdresse");
    if (a) { try { const u = new URL(/^https?:\/\//i.test(a) ? a : "https://" + a); if (!/\./.test(u.hostname)) throw 0; } catch (e) { return err("Adresse du site invalide. Exemple : https://www.batipro.bf/", $("#sAdresse")); } }
    if (v("sWhatsapp") && !SEO.waNum(v("sWhatsapp"))) return err("Numéro WhatsApp invalide. Exemple : 70 12 34 56 ou +226 70 12 34 56.", $("#sWhatsapp"));
    if (v("sEmail") && !normSite({ email: v("sEmail") }).email) return err("Adresse e-mail invalide.", $("#sEmail"));
    for (const id of ["sFacebook", "sTiktok"]) if (v(id) && !/^https:\/\//i.test(v(id))) return err("Le lien doit commencer par https://", $("#" + id));
    if (v("sFacebook") && !SEO.lienReseau(v("sFacebook"), ["facebook.com", "fb.com"])) return err("Collez l'adresse de la page Facebook (https://www.facebook.com/…).", $("#sFacebook"));
    if (v("sTiktok") && !SEO.lienReseau(v("sTiktok"), ["tiktok.com"])) return err("Collez l'adresse du compte TikTok (https://www.tiktok.com/@…).", $("#sTiktok"));
    if (v("sGa") && !SEO.idGA(v("sGa"))) return err("ID Google Analytics invalide : il commence par G- (ex. G-AB12CD34EF).", $("#sGa"));
    if (v("sGsc") && !SEO.codeGSC(v("sGsc"))) return err("Code Search Console invalide : collez la balise donnée par Google, ou seulement le code qu'elle contient.", $("#sGsc"));
    const o = { adresse: a };
    CHAMPS.forEach(([id, k]) => (o[k] = $("#" + id).value));
    S.site = normSite(o);
    fermerSeo();
    apresModif();
    toast(siteChange() ? "Réglages enregistrés. Publiez pour les mettre en ligne." : "Aucun changement.");
  }

  /* ---------- événements ---------- */
  function brancher() {
    // connexion
    $("#repoEdit").onclick = () => { $("#repoFields").hidden = false; $("#repoLine").hidden = true; $("#inOwner").focus(); };
    // champs secrets : masqués sans être des « mots de passe », pour que le navigateur
    // ne propose jamais de les enregistrer. La clé GitHub ne peut ni être affichée ni copiée.
    $$("input.secret").forEach((i) => {
      if (!masqueCss) i.type = "password";
      i.name = "z" + Math.random().toString(36).slice(2);   // pas d'historique de saisie
      ["copy", "cut", "dragstart"].forEach((ev) => i.addEventListener(ev, (e) => e.preventDefault()));
    });
    $$("[data-eye]").forEach((b) => (b.onclick = () => {
      const i = document.getElementById(b.dataset.eye);
      const show = masqueCss ? i.classList.contains("secret") : i.type === "password";
      if (masqueCss) i.classList.toggle("secret", !show); else i.type = show ? "text" : "password";
      b.querySelector("i").className = show ? "fas fa-eye-slash" : "fas fa-eye";
    }));
    $("#loginForm").onsubmit = async (e) => {
      e.preventDefault();
      const errBox = $("#loginErr"), btn = $("#loginBtn");
      const stop = (m, champ) => { errBox.textContent = m; errBox.hidden = false; if (champ) champ.focus(); };
      errBox.hidden = true;
      if (!$("#repoFields").hidden) {
        S.owner = $("#inOwner").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/.*$/, "");
        S.repo = $("#inRepo").value.trim().replace(/\.git$/, "");
      }
      const tok = $("#inToken").value.trim(), code = $("#inCode").value;
      if (!S.owner || !S.repo) return stop("Indiquez le compte GitHub et le nom du dépôt.");
      if (!tok) return stop("Collez votre clé d'accès GitHub.", $("#inToken"));
      const pb = codeFaible(code);
      if (pb) return stop(pb, $("#inCode"));
      if (code !== $("#inCode2").value) return stop("Les deux codes ne sont pas identiques.", $("#inCode2"));
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Connexion…';
      try {
        await connecter(tok, { code, local: $("#inRemember").checked });
      } catch (er) {
        S.token = "";
        stop(er.status === undefined ? er.message : messageErreur(er));
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Se connecter';
      }
    };

    // verrouillage
    $("#lockForm").onsubmit = async (e) => {
      e.preventDefault();
      const errBox = $("#lockErr"), btn = $("#unlockBtn"), code = $("#inUnlock").value;
      const stop = (m) => { errBox.textContent = m; errBox.hidden = false; $("#inUnlock").focus(); };
      errBox.hidden = true;
      if (modeVerrou === "choisir") {
        const pb = codeFaible(code) || (code !== $("#inUnlock2").value ? "Les deux codes ne sont pas identiques." : "");
        if (pb) return stop(pb);
      } else if (!code) return stop("Entrez votre code.");
      const avant = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Vérification…';
      try {
        if (modeVerrou === "choisir") { await connecter(S.ancien.token, { code, local: S.ancien.local }); return; }
        const tok = await ouvrirCoffre(code);
        if (!tok) {
          const n = (Number(keep.get(ESSAIS)) || 0) + 1, reste = MAX_ESSAIS - n;
          if (reste <= 0) {
            oublierCle();
            return retourConnexion("Trop d'essais incorrects. Pour votre sécurité, la clé a été retirée de cet appareil. Reconnectez-vous avec votre clé GitHub et choisissez un nouveau code.");
          }
          keep.set(ESSAIS, String(n));
          $("#inUnlock").value = "";
          return stop(`Code incorrect. Encore ${reste} essai${reste > 1 ? "s" : ""}, ensuite la clé sera retirée de cet appareil.`);
        }
        keep.del(ESSAIS);
        if (S.pret) { S.token = tok; deverrouiller(); }
        else await connecter(tok, null);
      } catch (er) {
        S.token = "";
        if (er.status === 0) stop(er.message);            // pas d'internet : la clé reste gardée
        else { oublierCle(); retourConnexion(er.status === undefined ? er.message : messageErreur(er)); }
      } finally {
        btn.disabled = false;
        if (!$("#lock").hidden) btn.innerHTML = avant;
      }
    };
    $("#lockForgot").onclick = () => { oublierCle(); retourConnexion(""); };
    $("#lockBtn").onclick = () => verrouiller(false);
    const bouge = () => { if (!verrouille) derniereActivite = Date.now(); };
    ["pointerdown", "keydown", "wheel", "touchstart", "input", "scroll"].forEach((ev) => document.addEventListener(ev, bouge, { passive: true, capture: true }));
    let dernierMvt = 0;
    document.addEventListener("mousemove", () => { const t = Date.now(); if (t - dernierMvt > 4000) { dernierMvt = t; bouge(); } }, { passive: true });
    setInterval(verifierVeille, 20000);
    document.addEventListener("visibilitychange", verifierVeille);

    // en-tête
    $("#themeBtn").onclick = () => {
      const h = document.documentElement, t = h.getAttribute("data-theme") === "light" ? "dark" : "light";
      h.setAttribute("data-theme", t);
      keep.set("bp-theme", t);
    };
    $("#logoutBtn").onclick = async () => {
      const n = nbChangements();
      const ok = await ask("Se déconnecter ?", n ? "Vos modifications non publiées restent enregistrées sur cet appareil." : "La clé sera retirée de cet appareil.", "Se déconnecter");
      if (!ok) return;
      oublierCle();
      S.pret = false;
      retourConnexion("");
    };

    // outils
    $("#addBtn").onclick = () => ouvrir(null);
    $("#q").oninput = (e) => { S.q = e.target.value.trim(); rendre(); };
    $("#catSel").onchange = (e) => { S.cat = e.target.value; rendre(); };
    $("#chips").onclick = (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      $$(".chip").forEach((x) => x.classList.toggle("on", x === c));
      S.filtre = c.dataset.v;
      rendre();
    };

    // liste : disponibilité rapide, visibilité, modifier, dupliquer
    $("#list").addEventListener("click", (e) => {
      const it = e.target.closest(".item");
      if (!it || e.target.closest("select, .sw")) return;
      const p = S.produits.find((x) => x.id === Number(it.dataset.id));
      const act = e.target.closest("[data-act]");
      if (act && act.dataset.act === "dup") ouvrir(p, true);
      else if (act || e.target.closest(".it-name, .thumb, .it-price")) ouvrir(p);
    });
    $("#list").addEventListener("change", (e) => {
      const it = e.target.closest(".item"); if (!it) return;
      const p = S.produits.find((x) => x.id === Number(it.dataset.id));
      if (e.target.matches("[data-vis]")) {
        p.visible = e.target.checked;
        apresModif();
        toast(p.visible ? "Article visible sur le site (après publication)." : "Article caché du site (après publication).");
      } else if (e.target.matches("[data-dispo]")) {
        p.dispo = e.target.value;
        apresModif();
        toast(`« ${p.nom} » : ${DISPO[p.dispo].label.toLowerCase()} (après publication).`);
      }
    });

    // publication
    $("#publishBtn").onclick = () => publier();
    $("#discardBtn").onclick = async () => {
      const ok = await ask("Annuler les modifications ?", "Toutes les modifications non publiées seront perdues.", "Tout annuler", "Garder");
      if (!ok) return;
      S.produits = clone(S.original);
      S.images = {};
      if (S.siteOriginal) S.site = clone(S.siteOriginal);
      keep.del(draftKey());
      rendre();
    };

    // réglages de la boutique
    $("#seoBtn").onclick = ouvrirSeo;
    $("#seoClose").onclick = $("#seoCancel").onclick = fermerSeo;
    $("#seoSave").onclick = enregistrerSeo;
    $("#seoForm").onsubmit = (e) => { e.preventDefault(); enregistrerSeo(); };
    $("#sAdresse").oninput = majSeoLiens;
    $("#sCopy").onclick = async () => {
      try { await navigator.clipboard.writeText($("#sSitemap").textContent); toast("Adresse copiée."); }
      catch (e) { toast("Copie impossible : sélectionnez l'adresse à la main."); }
    };

    // fiche article
    $("#edClose").onclick = $("#edCancel").onclick = fermer;
    $("#veil").onclick = () => { if ($("#seoPanel").classList.contains("on")) fermerSeo(); else fermer(); };
    ["#fNom", "#fDesc", "#fPrix"].forEach((id) => $(id).addEventListener("input", majApercu));
    $("#fDispo").addEventListener("change", majApercu);
    $("#edSave").onclick = enregistrer;
    $("#edDelete").onclick = supprimer;
    $("#edForm").onsubmit = (e) => { e.preventDefault(); enregistrer(); };
    $("#specAdd").onclick = () => ajouterSpec("", "").querySelector(".sk").focus();
    $("#couleurAdd").onclick = () => ajouterCouleur("", "#1f2023").querySelector(".cn").focus();
    $("#fPrix").addEventListener("input", majPromo);
    $("#fAncien").oninput = majPromo;
    $("#photos").addEventListener("click", (e) => {
      if (!edit) return;
      const up = e.target.closest("[data-up]"), del = e.target.closest("[data-del]");
      if (up) { const i = Number(up.dataset.up); edit.photos.unshift(edit.photos.splice(i, 1)[0]); montrerPhotos(); }
      else if (del) { edit.photos.splice(Number(del.dataset.del), 1); montrerPhotos(); }
    });
    $("#edFile").onchange = async (e) => {
      const files = [...e.target.files];
      e.target.value = "";
      if (!edit) return;
      const nom = $("#fNom").value.trim() || "article";
      for (const f of files) {
        if (edit.photos.length >= 8) { toast("8 photos au maximum par article."); break; }
        try {
          const d = await lirePhoto(f);
          const chemin = `${CONFIG.imgDir}/${slug(nom)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.${d.ext}`;
          S.images[chemin] = d.data;
          edit.photos.push(chemin);
        } catch (er) { toast(er.message, 4000); }
      }
      montrerPhotos();
    };

    // photo introuvable dans la liste : icône à la place (sans code dans la page)
    document.addEventListener("error", (e) => {
      const t = e.target;
      if (t && t.tagName === "IMG" && t.closest(".thumb")) t.replaceWith(Object.assign(document.createElement("i"), { className: "fas fa-image" }));
    }, true);

    // clavier, fermeture de la page
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !$("#lock").hidden) return;
      if (!$("#dialog").hidden) $("#dlgNo").click();
      else if ($("#seoPanel").classList.contains("on")) fermerSeo();
      else if (edit) fermer();
    });
    window.addEventListener("beforeunload", (e) => {
      if (S.token && nbChangements()) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* ---------- démarrage ---------- */
  async function demarrer() {
    brancher();
    chargerReglages();
    if (!S.owner || !S.repo) return;
    // clé chiffrée : on demande le code
    if (coffre()) return montrerVerrou("ouvrir");
    // ancienne version : la clé était gardée en clair. On la protège tout de suite.
    const ancienne = keep.get("bp-admin-cle", true) || keep.get("bp-admin-cle");
    if (ancienne) {
      S.ancien = { token: ancienne, local: !!keep.get("bp-admin-cle") };
      montrerVerrou("choisir");
    }
  }
  demarrer();
})();
