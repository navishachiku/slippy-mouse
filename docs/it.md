# Slippy Mouse

![Slippy Mouse](./images/banner.png)

Uno strumento di potenziamento del mouse per i player video online: il player viene diviso in tre zone e una rotazione della **rotella** dentro una zona regola volume, velocità di riproduzione, avanzamento e altro — con una fluidità assoluta. Nessuna scorciatoia da memorizzare, nessun pulsante da cercare; basta uno scorrimento. Un pannello di impostazioni permette di personalizzare ogni azione di rotella e clic.

## ✨ Funzionalità principali

* **Supporto multi-sito**: Funziona su **YouTube** e **Bilibili** (`www.bilibili.com`), con zone e azioni identiche su entrambi i siti.

* **Controlli rapidi**: Imposta zone di azione personalizzate sul player, associate ad azioni del mouse come clic e rotella, per regolare rapidamente volume, velocità, avanzamento ecc.

* **Zone di azione personalizzabili**: Supporta impostazioni delle zone altamente configurabili, con dimensioni e posizione liberamente regolabili (di default: zona sinistra, centrale e destra).

* **Interazione senza overlay**: Abbandona i tradizionali strati trasparenti in favore di calcoli di coordinate ad alte prestazioni, senza alcuna interferenza con i clic sull'interfaccia nativa come barra di avanzamento e pulsanti.

* **Rotella adattiva**: Uno scatto o uno scorrimento equivale esattamente a un'azione su qualsiasi dispositivo — rotelle, trackpad e software di scorrimento fluido (Mos, SmoothScroll, Logitech Options+) — senza alcuna taratura. Le code d'inerzia vengono soppresse e gli scorrimenti lunghi intenzionali restano proporzionali.

* **Pannello di impostazioni grafico**: Ogni parametro e ogni mappatura zona-azione si regolano in un pannello nella pagina — le modifiche si applicano all'istante e vengono salvate nel browser, gli aggiornamenti dello script non cancellano mai le tue personalizzazioni.

![DEMO](./images/demo.webp)

## 🎛️ Pannello di impostazioni

Nessuna modifica al codice — fai clic sull'icona del mouse nella barra di controllo del player per aprire il pannello:

![Accesso al pannello impostazioni](./images/settings-entry.png)

![Settings Panel](./images/settings-general.png)

* **Quattro schede**: Generale (rotella adattiva, scorciatoie, aspetto, OSD), Azioni di zona, Rotella (taratura adattiva e filtraggio manuale) e Avanzate (debug, dati impostazioni).
* **Mappatura zona-azione**: Scegli una zona colorata e assegna qualsiasi azione con il suo valore a ogni trigger (clic sinistro / destro / centrale, rotella su / giù):

![Zone Actions](./images/settings-zones.png)

* **Applicazione immediata e persistenza**: Le modifiche hanno effetto subito; «Salva» le scrive nello storage del browser — **gli aggiornamenti dello script non cancellano mai le impostazioni**; «Annulla» o Esc ripristina.
* **Scorciatoie**: La visualizzazione delle zone usa `Alt+Shift+Z` di default; la scorciatoia del pannello non è assegnata di default. Entrambe sono riassegnabili nel pannello con supporto ai modificatori (Esc annulla la cattura, Backspace cancella).
* **Esporta / Importa / Ripristina**: Salva le impostazioni come file JSON, trasferiscile su un altro browser o ripristina i valori di fabbrica con un clic.
* **Lingua dell'interfaccia**: Segue la lingua del browser, con l'inglese come ripiego; nel pannello è disponibile la scelta manuale.
* **Aspetto**: Chiaro / scuro / auto (segue la preferenza di sistema).

## ⚙️ Parametri personalizzabili

Ogni parametro può essere regolato nel pannello di impostazioni (consigliato). Puoi anche modificare direttamente i blocchi `SETTINGS` e `CONFIG` in cima allo script, ma tieni presente che le modifiche dirette vengono sovrascritte agli aggiornamenti dello script, mentre le impostazioni del pannello vengono conservate.

<details>
<summary><b>Avanzate: riferimento completo dei parametri</b> (clicca per espandere)</summary>

### Impostazioni globali

| Parametro | Descrizione | Default |
| :--- | :--- | :--- |
| `DEBUG` | Emette messaggi di debug nella console | `false` |
| `ZONE_TOGGLE_KEY` | Scorciatoia per mostrare/nascondere le zone (combinazioni di modificatori supportate) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Scorciatoia per aprire il pannello impostazioni (accesso principale: pulsante nella barra di controllo) | Non impostata |
| `OSD_DURATION` | Durata di permanenza dei messaggi OSD (ms) | `800` |
| `OSD_FADE_OUT` | Durata dell'animazione di dissolvenza dell'OSD (ms) | `150` |
| `OSD_FONT_SIZE` | Dimensione del testo OSD (px, em, rem, ecc.) | `28px` |
| `ADAPTIVE_WHEEL` | Filtraggio adattivo: uno scatto/scorrimento = un'azione su qualsiasi dispositivo. Imposta `false` per usare il filtraggio manuale qui sotto | `true` |
| `WHEEL_STEP` | Modalità adattiva: scorrimento cumulato (px) per azione; più basso per risposta più fine | `100` |
| `GESTURE_GAP` | Adattiva: silenzio (ms) oltre il quale l'input conta come nuovo gesto | `150` |
| `MIN_ACTION_INTERVAL` | Adattiva: ms minimi tra due azioni; limita le raffiche | `80` |
| `IMPULSE_MIN` | Adattiva: corsa minima dell'impulso (px) per confermare un'azione; filtra gli sfioramenti | `20` |
| `REACCEL_FACTOR` | Adattiva: rapporto di salto d'ampiezza che segna un nuovo scatto in una coda in decadimento | `1.5` |
| `DISCRETE_SETTLE` | Adattiva: ritardo di conferma (ms) per scatti singoli a evento unico | `60` |
| `USE_WHEEL_COUNT_FIXED` | Solo modalità manuale: attiva il filtraggio a conteggio fisso | `false` |
| `WHEEL_DELAY` | Solo modalità manuale: ritardo di debounce degli eventi rotella (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Soglia di conteggio: quanti eventi rotella cumulare prima di eseguire un'azione | `14` |

### Configurazione personalizzata delle zone

Puoi personalizzare completamente le zone di azione secondo le tue esigenze, regolandone dimensioni e posizione.

Di default: zona sinistra, centrale e destra:

| Zona | Clic sinistro | Clic destro | Azione rotella |
| ----- | ----- | ----- | ----- |
| **Sinistra (Volume)** | Volume massimo (100%) | Muto rapido (0%) | Volume +/- 5% |
| **Centro (Avanzamento)** | Pass-through (play/pausa nativo) | Pass-through (menu nativo) | Salto +/- 5s |
| **Destra (Velocità)** | Rapido 2.0x | Ritorno a 1.0x | Velocità +/- 0.25x |

### Elenco delle azioni supportate

In `mouse_action`, i tipi di `action` utilizzabili sono:

| Nome azione (action) | Descrizione | Parametro di esempio (value) |
| :--- | :--- | :--- |
| `volume_up` | Alza il volume | `5` (rappresenta +5%) |
| `volume_down` | Abbassa il volume | `5` (rappresenta -5%) |
| `volume_set` | Imposta un volume fisso | `0` (muto) o `100` (max) |
| `volume_mute` | Attiva/disattiva il muto | Nessun parametro |
| `seek` | Salta nell'avanzamento | `5` (avanti) o `-5` (indietro) |
| `toggle_play_pause` | Alterna riproduzione / pausa | Nessun parametro |
| `speed_up` | Aumenta la velocità di riproduzione | `0.25` |
| `speed_down` | Riduce la velocità di riproduzione | `0.25` |
| `speed_set` | Imposta una velocità fissa | `1.0`, `2.0`, ecc. |
| `none` | Nessuna azione | Lascia l'evento alla gestione nativa del sito |

</details>

## 📦 Installazione

**Metodo 1: Userscript con un clic (consigliato, funziona in tutti i principali browser)**

1. Installa l'estensione del browser [Tampermonkey](https://www.tampermonkey.net/).
2. Visita la **[pagina dello script su GreasyFork](https://greasyfork.org/scripts/566499)**.
3. Fai clic sul pulsante **«Installa questo script»**.

**Metodo 2: Estensione del browser**

La pubblicazione su Microsoft Edge Add-ons è in preparazione. Puoi anche scaricare la cartella `extension/` di questo repo e caricarla manualmente dalla pagina delle estensioni del browser con la modalità sviluppatore attiva.

**Metodo 3: Installazione manuale dello userscript**

1. Crea un «Nuovo script» in Tampermonkey.
2. Copia e incolla il contenuto di `SlippyMouse.user.js`.
3. Salva e buon divertimento!

---

*Filmato di sfondo della demo: [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (licenza Creative Commons Attribuzione).*
