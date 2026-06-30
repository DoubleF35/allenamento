/* Allenamento — service worker
   - cache offline dell'app shell (cache-first per file locali)
   - notifiche promemoria via periodicSync (best-effort) + notificationclick
   La config promemoria è scritta dalla pagina in IndexedDB (db "allenamento-rem", store "kv", chiave "config"). */

const CACHE = "allenamento-v6";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
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
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
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
