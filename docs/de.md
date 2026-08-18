# Slippy Mouse

![Slippy Mouse](./images/banner.png)

Ein Maus-Erweiterungstool für Online-Videoplayer: Der Player wird in drei Zonen aufgeteilt, und ein Dreh am **Mausrad** innerhalb einer Zone regelt Lautstärke, Wiedergabetempo, Spulen und mehr — butterweich. Keine Tastenkürzel zu merken, keine Suche nach Buttons; ein müheloser Dreh genügt. Über ein Einstellungspanel lässt sich jede Rad- und Klickaktion anpassen.

## ✨ Hauptfunktionen

* **Multi-Site-Unterstützung**: Funktioniert auf **YouTube** und **Bilibili** (`www.bilibili.com`), mit identischen Zonen und Aktionen auf beiden Seiten.

* **Schnellsteuerung**: Legen Sie eigene Aktionszonen auf dem Player fest, die Mausaktionen wie Klicks und Raddrehungen zugeordnet sind, um Lautstärke, Tempo, Fortschritt usw. schnell anzupassen.

* **Anpassbare Aktionszonen**: Hochgradig konfigurierbare Sensorzonen mit frei einstellbarer Größe und Position (Standard: linke, mittlere und rechte Zone).

* **Interaktion ohne Overlay**: Verzichtet auf traditionelle transparente Überlagerungen und nutzt performante Koordinatenberechnung — ohne jede Beeinträchtigung nativer UI-Klicks wie Fortschrittsleiste und Buttons.

* **Adaptives Mausrad**: Eine Raste oder ein Wisch entspricht auf jedem Gerät genau einer Aktion — Mausräder, Trackpads und Smooth-Scrolling-Software (Mos, SmoothScroll, Logitech Options+) — ganz ohne Abstimmung. Trägheitsausläufer werden unterdrückt, bewusste lange Wische bleiben proportional.

* **Grafisches Einstellungspanel**: Jeder Parameter und jede Zonen-Aktions-Zuordnung lässt sich in einem Panel direkt auf der Seite anpassen — Änderungen wirken sofort und werden im Browser gespeichert, Script-Updates löschen Ihre Anpassungen nie.

![DEMO](./images/demo.webp)

## 🎛️ Einstellungspanel

Keine Codeänderungen nötig — klicken Sie auf das Maus-Symbol in der Steuerleiste des Players, um das Panel zu öffnen:

![Zugang zum Einstellungspanel](./images/settings-entry.png)

![Settings Panel](./images/settings-general.png)

* **Vier Tabs**: Allgemein (adaptives Mausrad, Hotkeys, Erscheinungsbild, OSD), Zonenaktionen, Mausrad (adaptive Abstimmung und manuelle Filterung) und Erweitert (Debug, Einstellungsdaten).
* **Zonen-Aktions-Zuordnung**: Wählen Sie eine farbige Zone und weisen Sie jedem Auslöser (Links-/Rechts-/Mittelklick, Rad hoch/runter) eine beliebige Aktion mit Wert zu:

![Zone Actions](./images/settings-zones.png)

* **Sofortige Wirkung & Persistenz**: Änderungen greifen sofort; „Speichern“ schreibt sie in den Browser-Speicher — **Script-Updates löschen Ihre Einstellungen nie**; „Abbrechen“ oder Esc macht rückgängig.
* **Hotkeys**: Die Zonenanzeige liegt standardmäßig auf `Alt+Shift+Z`; der Panel-Hotkey ist standardmäßig nicht belegt. Beide sind im Panel neu belegbar, Modifikator-Kombinationen werden unterstützt (Esc bricht die Aufnahme ab, Rücktaste löscht).
* **Export / Import / Zurücksetzen**: Sichern Sie Einstellungen als JSON-Datei, übertragen Sie sie in einen anderen Browser oder stellen Sie mit einem Klick die Werkswerte wieder her.
* **Sprache der Oberfläche**: Folgt der Browsersprache, mit Englisch als Rückfallwert; im Panel ist eine manuelle Auswahl verfügbar.
* **Erscheinungsbild**: Hell / dunkel / auto (folgt der Systemeinstellung).

## ⚙️ Anpassbare Parameter

Jeder Parameter lässt sich im Einstellungspanel anpassen (empfohlen). Sie können auch die Blöcke `SETTINGS` und `CONFIG` am Anfang des Scripts direkt bearbeiten — beachten Sie aber, dass direkte Änderungen bei Script-Updates überschrieben werden, während Panel-Einstellungen erhalten bleiben.

<details>
<summary><b>Erweitert: vollständige Parameterreferenz</b> (zum Aufklappen klicken)</summary>

### Globale Einstellungen

| Parameter | Beschreibung | Standard |
| :--- | :--- | :--- |
| `DEBUG` | Debug-Meldungen in der Konsole ausgeben | `false` |
| `ZONE_TOGGLE_KEY` | Hotkey zum Umschalten der Zonenanzeige (Modifikator-Kombinationen möglich) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Hotkey zum Öffnen des Einstellungspanels (Haupteinstieg: Button in der Steuerleiste) | Nicht belegt |
| `OSD_DURATION` | Anzeigedauer der OSD-Hinweise (ms) | `800` |
| `OSD_FADE_OUT` | Dauer der OSD-Ausblendanimation (ms) | `150` |
| `OSD_FONT_SIZE` | Schriftgröße des OSD-Texts (px, em, rem usw.) | `28px` |
| `ADAPTIVE_WHEEL` | Adaptive Filterung: eine Raste/ein Wisch = eine Aktion auf jedem Gerät. Auf `false` setzen, um die manuelle Filterung unten zu nutzen | `true` |
| `WHEEL_STEP` | Adaptiver Modus: kumulierter Scrollweg (px) pro Aktion; niedriger für feinere Reaktion | `100` |
| `GESTURE_GAP` | Adaptiv: Stille (ms), nach der Eingaben als neue Geste zählen | `150` |
| `MIN_ACTION_INTERVAL` | Adaptiv: minimale ms zwischen zwei Aktionen; begrenzt Schübe | `80` |
| `IMPULSE_MIN` | Adaptiv: minimaler Impulsweg (px) für eine Aktion; filtert Streifer | `20` |
| `REACCEL_FACTOR` | Adaptiv: Amplitudensprung-Verhältnis, das eine neue Raste im abklingenden Ausläufer markiert | `1.5` |
| `DISCRETE_SETTLE` | Adaptiv: Abklingverzögerung (ms) für einzelne Rad-Rasten | `60` |
| `USE_WHEEL_COUNT_FIXED` | Nur manueller Modus: Filterung mit fester Zählung aktivieren | `false` |
| `WHEEL_DELAY` | Nur manueller Modus: Entprellzeit für Radereignisse (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Zählschwelle: Anzahl der Radereignisse, die vor einer Aktion kumuliert werden | `14` |

### Benutzerdefinierte Zonenkonfiguration

Sie können die Aktionszonen nach Ihren Bedürfnissen vollständig anpassen, einschließlich Größe und Position.

Standard: linke, mittlere und rechte Zone:

| Zone | Linksklick | Rechtsklick | Radaktion |
| ----- | ----- | ----- | ----- |
| **Links (Lautstärke)** | Volle Lautstärke (100%) | Schnell stumm (0%) | Lautstärke +/- 5% |
| **Mitte (Fortschritt)** | Durchreichen (native Wiedergabe/Pause) | Durchreichen (natives Menü) | Spulen +/- 5s |
| **Rechts (Tempo)** | Schnell 2.0x | Zurück auf 1.0x | Tempo +/- 0.25x |

### Liste der unterstützten Aktionen

In `mouse_action` stehen folgende `action`-Typen zur Verfügung:

| Aktionsname (action) | Beschreibung | Beispielparameter (value) |
| :--- | :--- | :--- |
| `volume_up` | Lautstärke erhöhen | `5` (bedeutet +5%) |
| `volume_down` | Lautstärke senken | `5` (bedeutet -5%) |
| `volume_set` | Feste Lautstärke setzen | `0` (stumm) oder `100` (max.) |
| `volume_mute` | Stumm ein-/ausschalten | Kein Parameter nötig |
| `seek` | Im Fortschritt springen | `5` (vorwärts) oder `-5` (rückwärts) |
| `toggle_play_pause` | Wiedergabe / Pause umschalten | Kein Parameter nötig |
| `speed_up` | Wiedergabetempo erhöhen | `0.25` |
| `speed_down` | Wiedergabetempo senken | `0.25` |
| `speed_set` | Festes Wiedergabetempo setzen | `1.0`, `2.0` usw. |
| `none` | Keine Aktion | Reicht das Ereignis an die native Verarbeitung der Seite durch |

</details>

## 📦 Installation

**Methode 1: Userscript-Ein-Klick-Installation (empfohlen, funktioniert in allen gängigen Browsern)**

1. Installieren Sie die Browsererweiterung [Tampermonkey](https://www.tampermonkey.net/).
2. Besuchen Sie die **[GreasyFork-Scriptseite](https://greasyfork.org/scripts/566499)**.
3. Klicken Sie auf **„Dieses Script installieren“**.

**Methode 2: Browsererweiterung**

Der Eintrag bei Microsoft Edge Add-ons ist in Vorbereitung. Sie können auch das Verzeichnis `extension/` dieses Repos herunterladen und es mit aktiviertem Entwicklermodus manuell über die Erweiterungsseite Ihres Browsers laden.

**Methode 3: Manuelle Userscript-Installation**

1. Erstellen Sie in Tampermonkey ein „Neues Script“.
2. Kopieren Sie den Inhalt von `SlippyMouse.user.js` und fügen Sie ihn ein.
3. Speichern und genießen!

---

*Demo-Hintergrundmaterial: [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (Creative-Commons-Namensnennung-Lizenz).*
