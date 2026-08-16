# YouTube Mouse Master

Script de melhoria de interação para o player do YouTube projetado para usuários avançados. Este é um script Tampermonkey altamente otimizado, sem sobreposição (Zero-Overlay) e altamente personalizável.

## ✨ Principais Características

* **Suporte Multi-Site**: Funciona tanto no **YouTube** quanto no **Bilibili** (`www.bilibili.com`), com zonas e ações idênticas em ambos os sites.

* **Controles Rápidos**: Defina zonas de ação personalizadas no player que correspondem a ações do mouse, como cliques e rolagem da roda, para ajustar rapidamente volume, velocidade, progresso, etc.

* **Zonas de Ação Personalizadas**: Suporta configurações de zonas sensoras altamente personalizáveis, permitindo ajustar livremente o tamanho e a posição da zona (o padrão fornece as configurações de zonas Esquerda, Centro e Direita).

* **Interação Sem Sobreposição (Zero-Overlay)**: Abandona as tradicionais camadas transparentes e utiliza cálculos de coordenadas de alto desempenho, garantindo que não haja interferência nos cliques da interface nativa.

* **Roda Adaptativa**: Um clique físico da roda ou um deslize equivale exatamente a uma ação em qualquer dispositivo — rodas de mouse, trackpads e softwares de rolagem suave (Mos, SmoothScroll, Logitech Options+) — sem necessidade de ajustes. Caudas de inércia são suprimidas e deslizes longos deliberados mantêm resposta proporcional.

* **Painel de Configurações Gráfico**: Todos os parâmetros e mapeamentos de ações de zona podem ser ajustados em um painel na página — as alterações se aplicam na hora e ficam salvas no navegador, então atualizações do script nunca apagam suas personalizações.

![DEMO SCREENSHOT](./images/demo.jpeg)

## 🎛️ Painel de Configurações

Sem edição de código — clique no ícone de mouse na barra de controles do player para abrir o painel (disponível no YouTube e no Bilibili):

![Settings Panel](./images/settings-general.png)

* **Quatro abas**: Geral (roda adaptativa, atalhos, aparência, OSD), Ações de Zona, Roda (ajuste adaptativo e filtragem manual) e Avançado (depuração, dados de configuração).
* **Mapeamento de ações de zona**: Selecione uma zona colorida e atribua qualquer ação com seu valor a cada gatilho (clique esquerdo / direito / do meio, roda para cima / baixo):

![Zone Actions](./images/settings-zones.png)

* **Aplicação instantânea e persistência**: As mudanças valem na hora; "Salvar" grava no armazenamento do navegador — **atualizações do script nunca apagam suas configurações**; "Cancelar" ou Esc reverte.
* **Atalhos**: A exibição de zonas usa `Alt+Shift+Z` por padrão; o atalho do painel vem desativado. Ambos podem ser reatribuídos no painel, com suporte a combinações de modificadores (Esc cancela a captura, Backspace limpa).
* **Exportar / Importar / Redefinir**: Faça backup das configurações em JSON, leve-as para outro navegador ou restaure os padrões de fábrica com um clique.
* **Idioma da interface**: Segue o idioma do navegador (inglês, chinês tradicional/simplificado, japonês, coreano, português, espanhol), com inglês como padrão.
* **Aparência**: Claro / escuro / automático (segue o sistema).

## ⚙️ Parâmetros Personalizáveis

Todos os parâmetros podem ser ajustados no painel de configurações (recomendado). Você também pode editar diretamente os blocos `SETTINGS` e `CONFIG` no topo do script, mas note: edições diretas são sobrescritas nas atualizações do script, enquanto as configurações do painel são preservadas.

<details>
<summary><b>Avançado: referência completa de parâmetros</b> (clique para expandir)</summary>

### Configurações Globais (Global Settings)

| Parâmetro | Descrição | Padrão |
| :--- | :--- | :--- |
| `DEBUG` | Se deve exibir mensagens de depuração no Console | `false` |
| `ZONE_TOGGLE_KEY` | Tecla de atalho para alternar a visibilidad das zonas (suporta combinações de modificadores) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Atalho para abrir o painel de configurações (a entrada principal é o botão da barra de controles) | Não definido |
| `OSD_DURATION` | Tempo que os avisos OSD permanecem na tela (ms) | `800` |
| `OSD_FADE_OUT` | Duração da animação de fade-out do OSD (ms) | `150` |
| `OSD_FONT_SIZE` | Tamanho da fonte do texto OSD (suporta px, em, rem, etc.) | `28px` |
| `ADAPTIVE_WHEEL` | Roda adaptativa: um clique/deslize = uma ação em qualquer dispositivo. Defina como `false` para usar as configurações manuais abaixo | `true` |
| `WHEEL_STEP` | Modo adaptativo: rolagem acumulada (px) por ação; diminua para resposta mais fina | `100` |
| `GESTURE_GAP` | Adaptativo: silêncio (ms) após o qual a entrada conta como novo gesto | `150` |
| `MIN_ACTION_INTERVAL` | Adaptativo: intervalo mínimo (ms) entre ações; limita rajadas | `80` |
| `IMPULSE_MIN` | Adaptativo: deslocamento mínimo (px) para liquidar como uma ação; filtra toques acidentais | `20` |
| `REACCEL_FACTOR` | Adaptativo: razão de salto de magnitude que marca um novo clique dentro de uma cauda em decaimento | `1.5` |
| `DISCRETE_SETTLE` | Adaptativo: atraso de liquidação (ms) para cliques de evento único (roda sem suavização) | `60` |
| `USE_WHEEL_COUNT_FIXED` | Apenas modo manual: se deve ativar a filtragem de contagem de roda fixa | `false` |
| `WHEEL_DELAY` | Apenas modo manual: tempo de atraso de debounce para eventos de roda (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Limite de acionamento: quantos eventos de roda acumular antes de agir | `14` |

### Configuração de Zonas (Custom Zone Configuration)

Você pode personalizar totalmente as zonas de ação conforme suas necessidades, ajustando o tamanho e a posição.

O padrão fornece configurações para as zonas Esquerda, Centro e Direita:

| Zona | Clique Esquerdo | Clique Direito | Ação da Roda |
| ----- | ----- | ----- | ----- |
| **Esquerda (Volume)** | Volume Máximo (100%) | Mudo Rápido (0%) | Passo de Volume +/- 5% |
| **Centro (Progresso)** | Nativo (Reproduzir/Pausar) | Nativo (Menu) | Salto de Progresso +/- 5s |
| **Direita (Velocidade)** | Rápido 2.0x | Redefinir 1.0x | Passo de Velocidade +/- 0.25x |

### Lista de Ações Suportadas (Supported Actions List)

Em `mouse_action`, os tipos de `action` que você pode usar são:

| Nome da Ação (action) | Descrição | Exemplo de Parâmetro (value) |
| :--- | :--- | :--- |
| `volume_up` | Aumentar volume | `5` (+5%) |
| `volume_down` | Diminuir volume | `5` (-5%) |
| `volume_set` | Definir volume fixo | `0` (Mudo) ou `100` (Máximo) |
| `volume_mute` | Alternar mudo | Sem parâmetro necessário |
| `seek` | Pular progresso | `5` (frente) ou `-5` (trás) |
| `toggle_play_pause` | Alternar estado de reprodução/pausa | Sem parâmetro necessário |
| `speed_up` | Aumentar velocidade | `0.25` |
| `speed_down` | Diminuir velocidade | `0.25` |
| `speed_set` | Definir velocidade fixa | `1.0`, `2.0`, etc. |
| `none` | Nenhuma ação | Passa o evento para o tratamento nativo do YouTube |

</details>

## 📦 Instalação

**Método 1: Instalação com um clique (Recomendado)**

1. Instale a extensão do navegador [Tampermonkey](https://www.tampermonkey.net/).
2. Visite a **[Página do Script no GreasyFork](https://greasyfork.org/en/scripts/566499-youtube-mouse-master)**.
3. Clique no botão **"Instalar este script"**.

**Método 2: Instalação manual**

1. Crie um "Novo script" no Tampermonkey.
2. Copie e cole o conteúdo de `YouTubeMouseMaster.user.js`.
3. Salve e aproveite!
