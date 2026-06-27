# Allenamento

App per tracciare allenamento di calisthenics, bici e corsa. **PWA** installabile, mobile-first, interfaccia chiara (bianco e verde), font Helvetica. Single-file (`index.html`, HTML/CSS/JS vanilla); Chart.js, Leaflet e Firebase da CDN.

Funziona **offline** sul dispositivo (`localStorage`); con l'accesso (gratuito) i dati si sincronizzano nel **cloud** in tempo reale e ti seguono su ogni dispositivo. È **multi-utente**: ogni persona accede col proprio account e ha i propri dati e il proprio piano.

## Funzioni
- **Oggi** — cosa è in programma oggi in base al piano (una scheda calisthenics A/B/C/D, bici, corsa o riposo), con checkbox, serie/ripetizioni o durata/km.
- **Percorso su misura** — nei giorni di bici/corsa: dai la posizione, scegli i km e l'app genera un **anello ad-hoc su strada** (motore gratuito BRouter), con mappa (Leaflet + OpenStreetMap), dislivello e tempo stimato. Esporta in **GPX** (Strava/Komoot/Garmin) o apri in **Google Maps**.
- **Storico** — calendario a celle piene: **verde = completato, giallo = parziale, rosso = saltato**, grigio = riposo, col numero del giorno. Tocca un giorno per modificarlo.
- **Statistiche** — totali, completamento settimana, km/min cardio, grafico peso e progressione per esercizio.
- **Peso** — log del peso corporeo con grafico.
- **Profilo** — account/login, **editor del piano**, promemoria e backup JSON.
- **Promemoria** — notifiche nei giorni/orario scelti + export **.ics** (promemoria ricorrente nel calendario del telefono, affidabile anche ad app chiusa).

## Piano predefinito
4 allenamenti calisthenics + 2 uscite in bici + domenica di riposo.

| Giorno | Attività |
|---|---|
| Lunedì | A · Spinta (push) |
| Martedì | B · Trazione (pull) |
| Mercoledì | Bici media (≈ 10 km) |
| Giovedì | C · Gambe & Core |
| Venerdì | D · Full body & condizionamento |
| Sabato | Bici lunga (≈ 10 km) |
| Domenica | Riposo |

Ogni utente può cambiarlo da **Profilo → Personalizza il piano**: tipo di ogni giorno (forza A/B/C/D, bici, corsa, riposo), km/durata ed esercizi delle schede.

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

## Pubblicazione (GitHub Pages)
Repo → **Settings → Pages → Source: Deploy from a branch → `main` / root**. URL: `https://doublef35.github.io/allenamento/`.

## File
- `index.html` — l'app.
- `manifest.webmanifest`, `icon.svg` — installabilità PWA.
- `sw.js` — service worker: offline + notifiche promemoria.

## Crediti
Routing © [BRouter](https://brouter.de) · mappe © [OpenStreetMap](https://www.openstreetmap.org/copyright) · grafici [Chart.js](https://www.chartjs.org) · mappa [Leaflet](https://leafletjs.com) · sync [Firebase](https://firebase.google.com).
