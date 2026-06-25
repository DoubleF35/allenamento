# Allenamento

App personale per tracciare allenamento di calisthenics + bici. Sito statico (solo HTML/CSS/JS vanilla, Chart.js da CDN), mobile-first, dark mode. Nessun login: i dati restano in `localStorage` del browser.

## Funzioni
- **Oggi** — mostra in automatico cosa è in programma in base al giorno della settimana (forza A/B, bici o riposo), con checkbox e campi serie/ripetizioni o durata/km.
- **Storico** — calendario mensile colorato (verde = completato, giallo = parziale, rosso = saltato, grigio = riposo); tocca un giorno per rivederlo e modificarlo.
- **Statistiche** — allenamenti totali, completamento settimana, minuti/km bici, grafico peso e progressione per esercizio.
- **Peso** — log del peso corporeo con grafico dell'andamento.
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
Apri `index.html` nel browser, oppure visita il sito pubblicato su GitHub Pages. Per non perdere lo storico cambiando dispositivo, esporta ogni tanto un backup JSON dalla sezione **Backup**.
