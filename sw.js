/* Allenamento — service worker
   - cache offline dell'app shell (cache-first per file locali)
   - notifiche promemoria via periodicSync (best-effort) + notificationclick
   La config promemoria è scritta dalla pagina in IndexedDB (db "allenamento-rem", store "kv", chiave "config"). */

const CACHE = "allenamento-v12";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
/* Librerie da CDN: vanno in cache come tutto il resto, altrimenti a ogni avvio
   l'app resta in attesa della rete (sono script bloccanti) e offline non parte. */
const CDN_HOSTS = ["cdn.jsdelivr.net", "unpkg.com", "www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];
/* Le stesse librerie caricate da index.html, precaricate in fase di install: alla
   primissima visita la pagina non è ancora controllata dal service worker, quindi le
   sue richieste non passerebbero da qui e offline mancherebbero grafici, mappa e login.
   Se cambi una versione in index.html aggiornala anche qui. */
const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
];
/* Oltre questo tempo si parte da quello che c'è in cache: l'aggiornamento
   scaricato in background si vedrà all'apertura successiva. */
const NET_TIMEOUT = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      // cache:"reload" ignora la cache HTTP del browser: senza questo GitHub Pages
      // (max-age=600 sull'HTML) può far installare una copia già vecchia.
      try { await c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))); } catch (_) {}
      // Le librerie esterne vanno prese in "no-cors" (danno risposte opache, che
      // addAll rifiuterebbe) e messe in cache una per una, senza far fallire
      // l'installazione se una non risponde.
      await Promise.all(CDN_ASSETS.map(async (u) => {
        try {
          const res = await fetch(u, { mode: "no-cors", cache: "reload" });
          await c.put(u, res);
        } catch (_) {}
      }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (req.mode === "navigate") {
    // Rete per prima (senza cache HTTP) così un aggiornamento pubblicato si vede
    // subito, ma con un tetto di tempo: se la connessione è lenta si parte dalla
    // copia in cache invece di lasciare l'app in attesa. Uso req.url (non req)
    // perché una Request in modalità "navigate" non è ricostruibile; l'URL
    // preserva anche la query (callback OAuth).
    const fromNet = fetch(req.url, { cache: "reload", credentials: "same-origin" }).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
      }
      return res;
    });
    e.respondWith(
      (async () => {
        const cached = await caches.match("./index.html");
        if (!cached) return fromNet;
        const timeout = new Promise((r) => setTimeout(() => r(null), NET_TIMEOUT));
        const winner = await Promise.race([fromNet.catch(() => null), timeout]);
        return winner || cached;
      })()
    );
    // Tiene vivo il download anche se abbiamo già risposto dalla cache.
    e.waitUntil(fromNet.catch(() => {}));
    return;
  }
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }
  // Librerie e font da CDN (Chart.js, Leaflet, Firebase, Fraunces/Inter): cache-first,
  // così dopo la prima visita l'app si apre subito e funziona anche offline.
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit)
      )
    );
  }
});

/* ---------- promemoria ---------- */
function idbGet(key) {
  return new Promise((resolve) => {
    const r = indexedDB.open("allenamento-rem", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); };
    r.onsuccess = () => {
      try {
        const g = r.result.transaction("kv", "readonly").objectStore("kv").get(key);
        g.onsuccess = () => resolve(g.result);
        g.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    };
    r.onerror = () => resolve(null);
  });
}
function idbSet(key, val) {
  return new Promise((resolve) => {
    const r = indexedDB.open("allenamento-rem", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("kv"); };
    r.onsuccess = () => {
      try {
        const tx = r.result.transaction("kv", "readwrite");
        tx.objectStore("kv").put(val, key);
        tx.oncomplete = () => resolve();
      } catch (_) { resolve(); }
    };
    r.onerror = () => resolve();
  });
}
function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
async function maybeNotify() {
  const cfg = await idbGet("config");
  if (!cfg || !cfg.enabled) return;
  const now = new Date();
  if (!Array.isArray(cfg.days) || !cfg.days.includes(now.getDay())) return;
  const [hh, mm] = String(cfg.time || "18:00").split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const target = hh * 60 + mm;
  if (minutesNow < target || minutesNow > target + 360) return;
  const tk = todayKeyLocal();
  if (cfg.lastNotified === tk) return;
  cfg.lastNotified = tk;
  await idbSet("config", cfg);
  await self.registration.showNotification("Allenamento", {
    body: cfg.body || "È ora del tuo allenamento.",
    icon: "./icon.svg", badge: "./icon.svg", tag: "allenamento-reminder", renotify: true,
  });
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "reminder-check") e.waitUntil(maybeNotify()); });
self.addEventListener("sync", (e) => { if (e.tag === "reminder-check") e.waitUntil(maybeNotify()); });
self.addEventListener("message", (e) => { if (e.data === "check-reminders") maybeNotify(); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
