/* ============================================================
   Worker Cloudflare per l'integrazione Strava dell'app Allenamento.
   Custodisce il client secret (che non può stare nel sito statico)
   e inoltra a Strava lo scambio/refresh dei token.

   Variabili da configurare sul Worker (Settings → Variables):
     STRAVA_CLIENT_ID      (testo)
     STRAVA_CLIENT_SECRET  (secret)

   Rotte (tutte POST con body JSON):
     /token       {code}          → scambia l'authorization code
     /refresh     {refresh_token} → rinnova l'access token
     /deauthorize {access_token}  → revoca l'accesso dell'app
   ============================================================ */

const ALLOWED = [
  "https://doublef35.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response('{"error":"method_not_allowed"}', { status: 405, headers: cors });

    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    const body = await req.json().catch(() => ({}));

    let upstream, payload;
    if (path === "/token") {
      upstream = "https://www.strava.com/oauth/token";
      payload = { client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, grant_type: "authorization_code", code: body.code };
    } else if (path === "/refresh") {
      upstream = "https://www.strava.com/oauth/token";
      payload = { client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: body.refresh_token };
    } else if (path === "/deauthorize") {
      upstream = "https://www.strava.com/oauth/deauthorize";
      payload = { access_token: body.access_token };
    } else {
      return new Response('{"error":"not_found"}', { status: 404, headers: cors });
    }

    // Lo status di Strava passa al client così com'è: serve a distinguere
    // un token revocato (400/401) da un errore di rete.
    const r = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return new Response(await r.text(), { status: r.status, headers: cors });
  },
};
