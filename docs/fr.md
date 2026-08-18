# Slippy Mouse

![Slippy Mouse](./images/banner.png)

Un outil d'amélioration de la souris pour les lecteurs vidéo en ligne : le lecteur est divisé en trois zones, et un coup de **molette** dans une zone ajuste le volume, la vitesse de lecture, la progression et plus encore — avec une fluidité parfaite. Aucun raccourci à mémoriser, aucun bouton à chercher ; un simple défilement suffit. Un panneau de réglages permet de personnaliser chaque action de molette et de clic.

## ✨ Fonctionnalités clés

* **Multi-sites** : Fonctionne sur **YouTube** et **Bilibili** (`www.bilibili.com`), avec des zones et des actions identiques sur chaque site.

* **Contrôles rapides** : Définissez des zones d'action personnalisées sur le lecteur, associées aux actions de la souris (clics, molette) pour ajuster rapidement le volume, la vitesse, la progression, etc.

* **Zones d'action personnalisables** : Prend en charge une configuration très flexible des zones sensibles, avec taille et position librement ajustables (par défaut : zones gauche, centrale et droite).

* **Interaction sans calque** : Abandonne les calques transparents traditionnels au profit de calculs de coordonnées haute performance, sans aucune interférence avec les clics sur l'interface native (barre de progression, boutons).

* **Molette adaptative** : Un cran ou un glissement équivaut exactement à une action sur tout appareil — molette, pavé tactile, logiciels de défilement fluide (Mos, SmoothScroll, Logitech Options+) — sans aucun réglage. Les queues d'inertie sont supprimées et les longs glissements volontaires restent proportionnels.

* **Panneau de réglages graphique** : Chaque paramètre et chaque association zone-action s'ajustent dans un panneau intégré à la page — les changements s'appliquent instantanément et sont stockés dans le navigateur, les mises à jour du script n'effacent jamais vos personnalisations.

![DEMO](./images/demo.webp)

## 🎛️ Panneau de réglages

Aucune modification de code nécessaire — cliquez sur l'icône de souris dans la barre de contrôle du lecteur pour ouvrir le panneau :

![Entrée du panneau de réglages](./images/settings-entry.png)

![Settings Panel](./images/settings-general.png)

* **Quatre onglets** : Général (molette adaptative, raccourcis, apparence, OSD), Actions de zone, Molette (réglage adaptatif et filtrage manuel) et Avancé (débogage, données de réglages).
* **Association zone-action** : Choisissez une zone colorée et assignez n'importe quelle action avec sa valeur à chaque déclencheur (clic gauche / droit / molette, molette haut / bas) :

![Zone Actions](./images/settings-zones.png)

* **Application instantanée et persistance** : Les modifications prennent effet immédiatement ; « Enregistrer » les écrit dans le stockage du navigateur — **les mises à jour du script n'effacent jamais vos réglages** ; « Annuler » ou Échap annule.
* **Raccourcis** : L'affichage des zones utilise `Alt+Shift+Z` par défaut ; le raccourci du panneau n'est pas assigné par défaut. Les deux sont réassignables dans le panneau avec prise en charge des combinaisons de modificateurs (Échap annule la capture, Retour arrière efface).
* **Exporter / Importer / Réinitialiser** : Sauvegardez les réglages en fichier JSON, transférez-les vers un autre navigateur ou rétablissez les valeurs d'usine en un clic.
* **Langue de l'interface** : Suit la langue du navigateur, avec l'anglais par défaut ; un choix manuel est disponible dans le panneau.
* **Apparence** : Clair / sombre / auto (suit la préférence du système).

## ⚙️ Paramètres personnalisables

Chaque paramètre peut être ajusté dans le panneau de réglages (recommandé). Vous pouvez aussi modifier directement les blocs `SETTINGS` et `CONFIG` en tête du script, mais notez que ces modifications directes sont écrasées lors des mises à jour du script, tandis que les réglages du panneau sont conservés.

<details>
<summary><b>Avancé : référence complète des paramètres</b> (cliquer pour développer)</summary>

### Réglages globaux

| Paramètre | Description | Défaut |
| :--- | :--- | :--- |
| `DEBUG` | Sortie des messages de débogage dans la console | `false` |
| `ZONE_TOGGLE_KEY` | Raccourci d'affichage des zones (combinaisons de modificateurs prises en charge) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Raccourci d'ouverture du panneau de réglages (entrée principale : bouton de la barre de contrôle) | Non défini |
| `OSD_DURATION` | Durée d'affichage des messages OSD (ms) | `800` |
| `OSD_FADE_OUT` | Durée de l'animation de fondu de l'OSD (ms) | `150` |
| `OSD_FONT_SIZE` | Taille du texte OSD (px, em, rem, etc.) | `28px` |
| `ADAPTIVE_WHEEL` | Filtrage adaptatif : un cran/glissement = une action sur tout appareil. Mettre à `false` pour utiliser le filtrage manuel ci-dessous | `true` |
| `WHEEL_STEP` | Mode adaptatif : défilement cumulé (px) par action ; plus bas pour une réponse plus fine | `100` |
| `GESTURE_GAP` | Adaptatif : silence (ms) au-delà duquel l'entrée compte comme un nouveau geste | `150` |
| `MIN_ACTION_INTERVAL` | Adaptatif : ms minimum entre deux actions ; limite les rafales | `80` |
| `IMPULSE_MIN` | Adaptatif : course minimale d'impulsion (px) pour valider une action ; filtre les effleurements | `20` |
| `REACCEL_FACTOR` | Adaptatif : ratio de saut d'amplitude marquant un nouveau cran dans une queue décroissante | `1.5` |
| `DISCRETE_SETTLE` | Adaptatif : délai de validation (ms) pour les crans isolés à événement unique | `60` |
| `USE_WHEEL_COUNT_FIXED` | Mode manuel uniquement : activer le filtrage par comptage fixe | `false` |
| `WHEEL_DELAY` | Mode manuel uniquement : délai d'anti-rebond des événements de molette (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Seuil de comptage : nombre d'événements de molette à cumuler avant d'exécuter une action | `14` |

### Configuration personnalisée des zones

Vous pouvez personnaliser entièrement les zones d'action selon vos besoins, en ajustant leur taille et leur position.

Par défaut : zones gauche, centrale et droite :

| Zone | Clic gauche | Clic droit | Action molette |
| ----- | ----- | ----- | ----- |
| **Gauche (Volume)** | Volume max (100%) | Muet rapide (0%) | Volume +/- 5% |
| **Centre (Progression)** | Transparent (lecture/pause native) | Transparent (menu natif) | Saut +/- 5s |
| **Droite (Vitesse)** | 2.0x rapide | Retour à 1.0x | Vitesse +/- 0.25x |

### Liste des actions prises en charge

Dans `mouse_action`, les types d'`action` utilisables sont :

| Nom de l'action (action) | Description | Exemple de paramètre (value) |
| :--- | :--- | :--- |
| `volume_up` | Augmenter le volume | `5` (représente +5%) |
| `volume_down` | Baisser le volume | `5` (représente -5%) |
| `volume_set` | Définir un volume fixe | `0` (muet) ou `100` (max) |
| `volume_mute` | Basculer muet / son | Aucun paramètre |
| `seek` | Sauter dans la progression | `5` (avant) ou `-5` (arrière) |
| `toggle_play_pause` | Basculer lecture / pause | Aucun paramètre |
| `speed_up` | Augmenter la vitesse de lecture | `0.25` |
| `speed_down` | Baisser la vitesse de lecture | `0.25` |
| `speed_set` | Définir une vitesse fixe | `1.0`, `2.0`, etc. |
| `none` | Aucune action | Laisse l'événement au traitement natif du site |

</details>

## 📦 Installation

**Méthode 1 : Userscript en un clic (recommandé, fonctionne dans tous les principaux navigateurs)**

1. Installez l'extension de navigateur [Tampermonkey](https://www.tampermonkey.net/).
2. Visitez la **[page du script sur GreasyFork](https://greasyfork.org/scripts/566499)**.
3. Cliquez sur le bouton **« Installer ce script »**.

**Méthode 2 : Extension de navigateur**

La publication sur Microsoft Edge Add-ons est en préparation. Vous pouvez aussi télécharger le répertoire `extension/` de ce dépôt et le charger manuellement depuis la page des extensions de votre navigateur avec le mode développeur activé.

**Méthode 3 : Installation manuelle du userscript**

1. Créez un « Nouveau script » dans Tampermonkey.
2. Copiez-collez le contenu de `SlippyMouse.user.js`.
3. Enregistrez et profitez !

---

*Vidéo de fond de la démo : [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (licence Creative Commons Attribution).*
