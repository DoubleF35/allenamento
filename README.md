# Allenamento

App personale per tracciare allenamento di calisthenics + bici. Sito statico (solo HTML/CSS/JS vanilla, Chart.js da CDN), mobile-first, dark mode. I dati restano in `localStorage` del browser e, se configuri la sincronizzazione, vengono replicati in cloud sul tuo account Google così da seguirti su tutti i dispositivi.

## Funzioni
- **Oggi** — mostra in automatico cosa è in programma in base al giorno della settimana (forza A/B, bici o riposo), con checkbox e campi serie/ripetizioni o durata/km.
- **Storico** — calendario mensile colorato (verde = completato, giallo = parziale, rosso = saltato, grigio = riposo); tocca un giorno per rivederlo e modificarlo.
- **Statistiche** — allenamenti totali, completamento settimana, minuti/km bici, grafico peso e progressione per esercizio.
- **Peso** — log del peso corporeo con grafico dell'andamento.
- **Sincronizzazione** — login col tuo account Google e i dati ti seguono su telefono, tablet e PC, in tempo reale (sezione **Backup**).
- **Backup** — esporta/importa tutti i dati in JSON.

## Scheda settimanale
| Giorno | Attività |
|---|---|
| Lunedì | Allenamento A |
| Martedì | Bici media (40–60 min) |
| Mercoledì | Allenamento B |
| Giovedì | Riposo / mobilità |
| Venerdì | Allenamento A o B (da alternare) |
| Sabato | Bici lunga (60–90 min) |
| Domenica | Riposo |

## Uso
Apri `index.html` nel browser, oppure visita il sito pubblicato su GitHub Pages. Senza sincronizzazione i dati restano nel singolo browser: esporta ogni tanto un backup JSON dalla sezione **Backup**. Con la sincronizzazione attiva (sotto) lo storico è sempre allineato su tutti i tuoi dispositivi.

## Sincronizzazione cross-device (account Google)
La sync usa **Firebase** (Auth con Google + Firestore). Configurazione una tantum, gratuita per uso personale. Solo il tuo account Google può accedere ai dati.

### 1. Crea il progetto Firebase
1. Vai su [console.firebase.google.com](https://console.firebase.google.com) → **Aggiungi progetto** (puoi disattivare Analytics).
2. **Build → Authentication → Get started → Sign-in method → Google → Abilita** (imposta email di supporto e salva).
3. **Build → Firestore Database → Crea database** → modalità *Production* → scegli una region (es. `eur3`).

### 2. Limita l'accesso al tuo solo account
In **Firestore → Regole**, incolla (sostituendo la tua email) e pubblica:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null
        && request.auth.token.email == "TUA_EMAIL@gmail.com";
    }
  }
}
```

### 3. Ottieni la config e incollala nel codice
1. In Firebase: **⚙ Impostazioni progetto → Le tue app → Web (`</>`)** → registra l'app → copia l'oggetto `firebaseConfig`.
2. In `index.html`, in cima allo `<script>`, compila `FIREBASE_CONFIG` con quei valori e imposta `OWNER_EMAIL` con la tua email Google.

### 4. Autorizza i domini
In **Authentication → Settings → Authorized domains** aggiungi il dominio dove pubblichi (es. `doublef35.github.io`). `localhost` è già autorizzato per i test.

### 5. Usa
Apri l'app → tab **Backup → Sincronizzazione → Accedi con Google**. Il primo dispositivo carica lo storico in cloud; gli altri lo scaricano e restano allineati in tempo reale.

> Le chiavi in `FIREBASE_CONFIG` sono pubbliche per natura (vivono nel client): la sicurezza è garantita dalle regole Firestore, non dal nascondere la config.
