# 設計規範 — 羅德島訓練終端

`ya-arknights-tools` 的視覺系統。

設計稿是 `docs/design/arknight_tool.pen`（Pencil 檔，加密二進位格式，只能用 Pencil 開啟）。它**不進版控**——無法 diff、無法 code review，進版控只會讓 repo 長肥而看不出改了什麼（見 `.gitignore`）。**本文件才是設計的唯一真實來源**，設計稿改動後要回來同步這裡。

## 概念

風格基準是 `.claude/skills/casper-design-cyberpunk`。該 skill 原本是為音樂節單頁寫的，區塊構圖（lineup / schedule / tickets / sponsors）完全對不上工具站，因此**只沿用它的 design token、切角規則與 HUD 語彙，構圖從本專案的內容重新推導**。

整站要讀起來像一台**羅德島訓練室排程終端** — 操作面板，不是霓虹招牌。

### 焦點配置

- **主視覺區（面積最大）**：階段卡序列。這是使用者真正在讀的內容。
- **唯一的發光焦點**：完成時間卡。整頁只有它帶 neon glow。

「把大膽用在一個地方」用發光而非面積表達。職業磚未選取時一律暗底細邊，只有選取那塊亮 `data`，避免 8 塊磚變彩虹搶戲。

---

## Design tokens

實作落在 `app/assets/css/main.css` 的 Tailwind v4 `@theme`（不是 `:root`）。`@theme` 會自動產出 `bg-surface-1`、`text-data`、`shadow-glow-data` 等 utility，現有的純 utility-class 寫法可以原樣保留；用 `:root` 就得把每個 class 改寫成 `bg-[var(--x)]`，要改的字串量會暴增。

| token | hex | 用途 | 取代現有 class | skill 對應 |
| --- | --- | --- | --- | --- |
| `surface-0` | `#050111` | 頁底 | `bg-white` | `--cp-bg` |
| `surface-1` | `#0c0822` | 面板底 | `bg-white` | `--cp-bg-2` |
| `surface-2` | `#1a1140` | 輸入框／hover 底 | `bg-gray-50` | `--cp-bg-3` |
| `ink` | `#e0e0ff` | 主文字 | 預設黑 | `--cp-fg` |
| `ink-soft` | `#9090b0` | 次要說明 | `text-gray-500` | `--cp-fg-soft` |
| `ink-mute` | `#5a5a78` | disabled、分隔符 | `text-gray-300` / `text-gray-400` | `--cp-fg-mute` |
| `data` | `#00fff5` | 資料強調、active tab、focus ring | `text-blue-600` | `--cp-cyan` |
| `ok` | `#00ff85` | 減半生效 | `text-green-600` / `border-green-600` | `--cp-green` |
| `warn` | `#ffeb00` | 備註、輸入防呆 | `text-amber-600` | `--cp-yellow` |
| `danger` | `#ff003c` | 錯誤、移除鈕 | `text-red-*` / `border-red-*` | `--cp-red` |
| `brand` | `#ff2a87` | **全站唯一**的主要動作、品牌標記 | `bg-blue-600`（按鈕） | `--cp-pink` |
| `rule` | `#00fff540` | HUD 分隔線、tab 底線 | `border-gray-200` | — |
| `grid` | `#00fff51f` | 背景網格線 | — | `--cp-grid` |

### 語意分工

刻意的：**cyan 是資料強調，pink 只留給唯一的主要動作**。skill 要求「至少 3 種霓虹色」，這裡 cyan / green / yellow / pink 四色各有明確語意，不是隨機撒色。

**霓虹色只上在邊框、數字與狀態上，段落文字一律用 `ink`。** 這是 skill 自己的 Don't（霓虹當 body 文字太刺眼）。`ink` 在 `surface-0` 上的對比約 15:1。

### 發光

| 效果 | 值 | 用在 |
| --- | --- | --- |
| glow-data | `0 0 20px #00fff54d` | 完成時間卡、選取中的職業磚、active tab 光條 |
| glow-ok | `0 0 18px #00ff8547` | 減半生效的階段卡／表單 |
| glow-brand | `0 0 14px #ff2a8759` | 主要按鈕 |

實際頁面上**同時只會出現一到兩處 glow**。設計系統總覽頁把三種並排是為了展示，不是使用範例。

---

## 字型與字級

走 `nuxt.config.ts` 的 `app.head.link` 載 Google Fonts，**不新增 npm 依賴**。

| 角色 | 字體 | 用途 |
| --- | --- | --- |
| `font-display` | **Chakra Petch** → Noto Sans TC | 標題、職業磚、區塊標 |
| `font-body` | **Noto Sans TC** | 中文說明文字 |
| `font-mono` | **JetBrains Mono** → Menlo | HUD 標籤、所有時刻與工時數字 |

- **不用 skill 指定的 Impact**：沒有 CJK 字符、web 上不可靠，而且是最俗的選擇。Chakra Petch 是 techno 風但比 Orbitron 內斂，有真正的 600/700 重量；中文字交給瀏覽器 per-glyph fallback 到 Noto Sans TC。
- **時刻與工時一律用 mono**：JetBrains Mono 的等寬數字（tabular figures）讓 `CompletionTimeCard` 的時鐘在 refresh 時數字寬度不會跳。

| 級距 | 設定 | 用途 |
| --- | --- | --- |
| display | `34 / 1.15 / 700 / +0.06em` | 頁面標題 |
| readout | `19 mono / 700 / data` | 完成時間讀數 |
| section | `18 / 1.2 / 700 / +0.08em` | 卡片標題、區塊標 |
| hud | `11 mono / 700 / +0.2em` | HUD 標籤 |
| body | `14 / 1.65 / 400` | 段落 |
| data | `13–16 mono / 500–700` | 工時、百分比、效率 |

砍掉 skill 的 100px display 級距 — 這是工具，不是 landing page。

---

## 版面

- 頁面外框滿版，**內容欄 1024px**。不用 skill 的 1280：只有 3 張階段卡，1280 會空，中文行長也會超過 80 字元。（目前程式是 960。）
- 內容欄左右留白 128px（1280 − 1024 ÷ 2）。
- 區塊間距 38–48px，面板內距 20px。
- 圓角一律 **0**，只有 HUD 圓形元素（移除鈕、狀態燈）例外。

```
╔═══════════════════════════════════════════════════════════════╗
║ ◆ YA // ARKNIGHTS TOOLS      ロドス島     ● LINK ESTABLISHED  ║
╚═══════════════════════════════════════════════════════════════╝
  幹員專精試算                                     [ OP_MASTERY ]

  [ MODULE_01 / 幹員職業 ]
  ┌先鋒┐┌近衛┐┌重裝┐┌狙擊┐┌術師┐┌醫療┐┌輔助┐┌特種┐

  [ MODULE_02 / 排程模式 ]
  ╱自動建議排程╲ ╱手動模擬排程╲
  ━━━━━━━━━━━━━━

  起始階段 ▾ 專精一          ╭ NOW 14:32 ▸ ETA 06:15  [↻] ╮
                             ╰ 全頁唯一 glow 面板          ╯

  [ MODULE_03 / 建議排程 ]
  ╭─ 01 ─ 專精一 ─── 階段所需工時 20:00 ────────── +2.4% ──╮
  ╭─ 02 ─ 專精二 ─── 20:00 ◆工作量減半 ─────────── −1.1% ──╮
  ╭─ 03 ─ 專精三 ─── 24:00 ──────────────────────  +0.3% ──╮
```

### 切角

| 尺寸 | 用在 |
| --- | --- |
| 16px | 面板、卡片 |
| 8px | 按鈕、輸入框、職業磚、tab |

一律切**右上角**。實作：

```css
clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
```

---

## 元件規範

| 元件 | 規則 |
| --- | --- |
| **HudTag** | `[ MODULE_01 / 幹員職業 ]`。括號是元件的一部分（CSS 用 `::before` / `::after`）。**必須帶真實資訊**（模組編號＋中文區塊名），不做純裝飾的 eyebrow label。 |
| **ProfessionTile** | 取代原生 `<select>`。未選取＝`surface-1` 底 + `ink-mute` 細邊 + `ink-soft` 字；選取＝`surface-2` 底 + `data` 邊 + `data` 字 + glow。實作需 `role="radiogroup"` + 方向鍵導覽。 |
| **ModeTab** | 切角 tab + 底部 2px 光條。active 才有 `data` 邊框與光條。 |
| **SelectControl / NumberInput** | 保留原生 `<select>` / `<input>`，只改觸發器樣式：`surface-2` 底、`ink-mute` 邊、8px 切角。focus 時邊框與 ring 轉 `data`。 |
| **PrimaryButton** | `brand` 粉色 2px 邊 + glow，**全站只有「前往下一階段」用它**。 |
| **MinusButton** | 圓形 22px，`danger` 邊與字。 |
| **CompletionCard** | `data` 邊 + glow，**全頁唯一發光面板**。維持現有尺寸與位置（起始階段 select 的右側）。`--:--` 佔位符保留。 |
| **StageCard** | 序號 `01/02/03` + 標題 + 階段所需工時 + 左右兩位幹員 + 右側落差百分比。減半時整張轉 `ok`（邊框、序號框、工時值、百分比）並顯示「◆ 工作量減半」badge。 |
| **StageForm** | 與 StageCard 同一套外殼，右上加 `[ EDITING / 編輯中 ]` 標籤。「編輯中」與「減半」是兩個獨立訊號，分別用 `data` 標籤與 `ok` 邊框表達，不要混用同一個顏色。 |

### 序號

`01 / 02 / 03` **只給專精階段**，因為它真的是序列（`ManualPlanTab` 就是階段狀態機）。職業磚、模組標籤都不編號。

### 片假名

只在 topbar 出現一次（`ロドス島`，遊戲內真實用詞）。不到處撒當裝飾。

### 動態

只留兩處：時鐘 refresh 時數字閃一下、減半觸發時綠框淡入。hover 只換色，不做位移。`prefers-reduced-motion: reduce` 全部關閉。

---

## Pencil ↔ CSS 的落差

設計稿受 Pencil 格式限制，以下幾點**設計稿的做法不等於實作做法**，以本文件的 CSS 為準：

| 項目 | 設計稿做法 | 實作做法 |
| --- | --- | --- |
| 切角 | 用底色三角形遮住右上角，再補一條 1px 斜線當邊 | `clip-path: polygon(...)` |
| 發光 | frame 的 `effect: shadow / outer` | 面板用 `box-shadow`，文字用 `text-shadow` |
| 背景網格 | 未繪製 | `body::before` + `repeating-linear-gradient`，加角落霓虹光暈，`pointer-events: none` |
| 虛線框 | Pencil 不支援虛線；「＋ 新增幹員」佔位格畫成兩位幹員都已選的狀態（無框） | 未選滿時 `border border-dashed border-ink-mute` |

另外：設計稿的切角只切右上角。實作可依 skill 的原始寫法同時切右上與左下，但**先以右上單切為準**，確認視覺後再決定要不要加。

---

## 設計稿導覽

`docs/design/arknight_tool.pen` 裡有四個頂層 frame（此檔不進版控，只在本機）：

| Frame | 座標 | 尺寸 | 內容 |
| --- | --- | --- | --- |
| 設計系統總覽 / Design System | `(0, 0)` | 1280 × 2272 | 色票、字級、元件各狀態、切角規則 |
| /mastery — 自動建議排程 | `(0, 2432)` | 1280 × 1121 | 三張唯讀階段卡，其中一張為減半狀態 |
| /mastery — 手動模擬排程 | `(0, 3713)` | 1280 × 1149 | 可編輯的 StageForm ＋ 已鎖定階段卡 |
| COMPONENTS / 元件庫 | `(1400, 0)` | 1360 × 969 | 所有 reusable component 的定義，不是交付畫面 |

> 設計稿裡的幹員名稱、效率百分比與工時**都是排版用的假資料**，沒有對照 `docs/domain/arknights_tools_init.md` 驗證過。實作時的數值一律以領域文件為準。

---

## 尚未涵蓋

- 首頁 `/`（目前還是 `<NuxtWelcome />`）
- 手機版（375px）版面
- loading / empty / error 三態的視覺
