# Allenamento
live at: https://doublef35.github.io/allenamento/
App per tracciare allenamento di calisthenics, bici e corsa. **PWA** installabile, mobile-first, design editoriale carta/inchiostro (Fraunces + Inter). Single-file (`index.html`, HTML/CSS/JS vanilla); Chart.js, Leaflet e Firebase da CDN.

Funziona **offline** sul dispositivo (`localStorage`); con l'accesso (gratuito) i dati si sincronizzano nel **cloud** in tempo reale e ti seguono su ogni dispositivo. È **multi-utente**: ogni persona accede col proprio account e ha i propri dati e il proprio piano.

## Funzioni
- **Oggi** — cosa è in programma oggi in base al piano (una scheda calisthenics, con o senza uscita annessa, oppure corsa, bici o riposo), con checkbox, serie/ripetizioni o durata/km e il **timer della durata** in ogni giornata di allenamento.
- **Percorso su misura** — nei giorni di bici/corsa: dai la posizione, scegli i km e l'app genera un **anello ad-hoc su strada** (motore gratuito BRouter): partenza e arrivo coincidono e l'algoritmo confronta più anelli candidati in parallelo scegliendo quello che **minimizza i tratti ripetuti** avanti-e-indietro, oltre a centrare i km voluti. Mappa (Leaflet + OpenStreetMap), dislivello, tempo stimato e % di strade ripetute. Esporta in **GPX** (Strava/Komoot/Garmin) o apri in **Google Maps**.
- **Storico** — calendario a celle piene: **verde = completato, giallo = parziale, rosso = saltato**, grigio = riposo, col numero del giorno. Tocca un giorno per modificarlo.
- **Statistiche** — totali, completamento settimana, km/min cardio, grafico peso e progressione per esercizio.
- **Consigliato oggi** — sotto ogni esercizio l'app propone le ripetizioni in base ai tuoi allenamenti passati: sale di una **dopo due volte di fila** chiuse con le stesse ripetizioni (contano tutte le serie, si guarda la peggiore), e riparte dalla media se hai un calo.
- **Peso** — log del peso corporeo con grafico.
- **Profilo** — account/login, **collegamento Strava**, **editor del piano**, promemoria, backup JSON e **Aggiorna app** (svuota la cache e ricarica, se una modifica pubblicata non compare).
- **Promemoria** — notifiche nei giorni/orario scelti + export **.ics** (promemoria ricorrente nel calendario del telefono, affidabile anche ad app chiusa).

## Piano predefinito
Calisthenics a giorni alterni con obiettivo **handstand push-up, front lever e planche**: tre sedute di forza (martedì, giovedì, sabato) da 8 esercizi, una skill per giornata, e tre uscite di corsa nei giorni in mezzo. I giorni di corsa non hanno lavoro a corpo libero, così la parte alta recupera fra le sedute.

| Giorno | Attività |
|---|---|
| Lunedì | Corsa (≈ 5 km) |
| Martedì | A · Verticale & Spinta (skill HSPU) |
| Mercoledì | Corsa (≈ 5 km) |
| Giovedì | B · Front Lever & Trazione (skill front lever) |
| Venerdì | Corsa (≈ 5 km) |
| Sabato | C · Planche & Petto (skill planche) |
| Domenica | Riposo · mobilità polsi e spalle |

Ogni utente può cambiarlo da **Profilo → Personalizza il piano**: tipo di ogni giorno (forza, bici, corsa, riposo), km/durata, esercizi delle schede e — sui giorni di forza — un'uscita di corsa o bici annessa alla seduta.

Oltre alle tre schede del piano c'è **Ez · Full body facile** (australian pull-up, push-up, pike push-up, negative pull-up, diamond push-up, plank): fuori dal calendario, si assegna a un giorno dall'editor quando serve una seduta più leggera.

## Login multi-utente (Firebase, gratis)
La sync usa **Firebase** (Auth con Google + Firestore), gratuito per questo uso. La config è già nel codice (progetto `workout-e9380`). Per far funzionare l'accesso **a tutti** servono due cose nella console Firebase:

### 1. Regole Firestore — ognuno accede SOLO ai propri dati
In **Firestore → Regole**, incolla e pubblica (queste sostituiscono la vecchia regola ristretta a una sola email):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
> Senza questo passo gli altri utenti riceverebbero "permission denied".

### 2. Domini autorizzati
In **Authentication → Settings → Authorized domains** aggiungi il dominio di pubblicazione, es. `doublef35.github.io` (`localhost` è già presente per i test). Senza questo, il login Google dà errore `unauthorized-domain`.

> Le chiavi in `FIREBASE_CONFIG` sono pubbliche per natura (vivono nel client): la sicurezza è garantita dalle regole Firestore, non dal nasconderle. Per cambiare progetto Firebase, sostituisci `FIREBASE_CONFIG` in cima allo `<script>` di `index.html`.

## Strava (importa le attività, gratis)
Collega il tuo account Strava da **Profilo → Strava** e le uscite di **bici e corsa** degli ultimi 30 giorni riempiono da sole le giornate dell'app (durata e km), segnandole come completate. L'importazione avviene in automatico all'apertura dell'app (al massimo una volta all'ora) oppure col pulsante **Sincronizza ora**. I valori inseriti a mano **non vengono mai sovrascritti**; più uscite dello stesso tipo nello stesso giorno si sommano.

Per lo scambio dei token OAuth serve un piccolo servizio esterno: il *client secret* di Strava non può stare nel codice pubblico di un sito statico. Si usa un **Cloudflare Worker** (piano Free, senza carta di credito) — il codice è già pronto in `strava-worker/worker.js`.

### 1. Crea l'app API su Strava
Vai su [strava.com/settings/api](https://www.strava.com/settings/api) e crea un'applicazione:
- **Nome/categoria**: a piacere (es. "Allenamento").
- **Website**: `https://doublef35.github.io`
- **Authorization Callback Domain**: `doublef35.github.io` (solo il dominio: senza `https://` e senza percorso).

Annota **Client ID** e **Client Secret**.

### 2. Crea il Worker su Cloudflare (dalla dashboard, senza terminale)
1. Registrati gratis su [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Worker**, dai un nome (es. `allenamento-strava`) e fai **Deploy**.
3. **Edit code** → cancella il contenuto e incolla quello di `strava-worker/worker.js` → **Deploy**.
4. **Settings → Variables and Secrets** → aggiungi `STRAVA_CLIENT_ID` (tipo *Text*) e `STRAVA_CLIENT_SECRET` (tipo *Secret*) con i valori del passo 1.
5. Copia l'URL del Worker, es. `https://allenamento-strava.TUONOME.workers.dev`.

> In alternativa, da terminale: `cd strava-worker && npx wrangler deploy`, poi `npx wrangler secret put STRAVA_CLIENT_ID` e `npx wrangler secret put STRAVA_CLIENT_SECRET`.

### 3. Configura l'app
In cima allo `<script>` di `index.html` compila `STRAVA_CONFIG` con il **Client ID** e l'**URL del Worker**, poi pubblica su Pages. Fatto: da **Profilo → Strava → Connetti Strava** parte l'autorizzazione (lascia spuntata la voce sulle attività private, serve per vederle).

> Note: il permesso richiesto è di **sola lettura** delle attività. I token sono salvati nei tuoi dati (localStorage e, con l'accesso, nel tuo documento Firestore), quindi il collegamento ti segue sui dispositivi. **Disconnetti** revoca l'accesso (revocabile comunque da [strava.com/settings/apps](https://www.strava.com/settings/apps)); "Cancella tutti i dati" scollega anche Strava.

## Pubblicazione (GitHub Pages)
Repo → **Settings → Pages → Source: Deploy from a branch → `main` / root**. URL: `https://doublef35.github.io/allenamento/`.

## File
- `index.html` — l'app.
- `manifest.webmanifest`, `icon.svg` — installabilità PWA.
- `sw.js` — service worker: offline + notifiche promemoria.
- `strava-worker/` — Cloudflare Worker per l'OAuth di Strava (scambio/refresh token; il client secret vive solo lì).

## Crediti
Routing © [BRouter](https://brouter.de) · mappe © [OpenStreetMap](https://www.openstreetmap.org/copyright) · grafici [Chart.js](https://www.chartjs.org) · mappa [Leaflet](https://leafletjs.com) · sync [Firebase](https://firebase.google.com) · attività [Strava](https://www.strava.com).
