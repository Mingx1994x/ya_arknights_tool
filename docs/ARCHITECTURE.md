# ARCHITECTURE

## 現況說明

本專案原為 Nuxt 4 官方最小起始模板；「幹員專精試算」功能開始實作後，已新增 `app/pages/`、`app/components/`、`app/composables/` 等前端目錄，以及 `server/`、`shared/` 目錄——後端已串接 Google Sheets API v4 讀取真實支援幹員資料（取代先前的 mock 資料）。本文件記錄**現有結構**，尚未建立的部分（資料庫、認證等）仍標註「尚未建立」，待實際新增時必須回來更新本文件（見 [DEVELOPMENT.md](./DEVELOPMENT.md) 的關鍵規則）。

> ⚠️ **已知待處理事項**：前端 `/mastery` 頁面（`app/composables/useSupportOperators.ts`、`app/components/mastery/ManualPlanTab.vue`）與後端 `server/api/support-operators.get.ts` 是在兩條不同分支上分別開發、於本次 rebase 合併的，**資料形狀目前不一致**——前端仍假設舊版 `SupportOperator` 型別並依賴 API 的 `class`/`skill` query 篩選，但後端已改為不篩選、直接回傳新版 `SupportOperatorRecord[]`（欄位與命名皆不同）。詳見下方「各檔案用途」表中 `shared/types/support-operator.ts` 一列與「API 路由總覽表」的說明。**續接此次 rebase（`git rebase --continue`）前需先決定如何調整前端**，否則 `/mastery` 頁面會壞掉。

## 目錄結構

```
ya-arknights-tools/
├── app/
│   ├── app.vue                       # Nuxt 4 應用程式進入點，render <NuxtPage />
│   ├── pages/
│   │   ├── index.vue                 # 首頁（目前僅 render <NuxtWelcome /> 佔位）
│   │   └── mastery/
│   │       └── index.vue             # /mastery，幹員專精試算頁面殼
│   ├── components/mastery/
│   │   ├── ClassSkillSelect.vue      # <MasteryClassSkillSelect> 職業/技能編號選擇
│   │   ├── AutoPlanTab.vue           # <MasteryAutoPlanTab> Tab A 自動建議排程
│   │   └── ManualPlanTab.vue         # <MasteryManualPlanTab> Tab B 手動模擬排程
│   └── composables/
│       └── useSupportOperators.ts    # 包裝 /api/support-operators 的 useFetch（⚠️ 資料形狀待與後端同步，見上方已知待處理事項）
├── server/
│   ├── api/
│   │   └── support-operators.get.ts  # GET /api/support-operators
│   └── utils/
│       ├── google-sheets.ts          # 通用 Google Sheets API v4 讀取 client（server-only，Nitro 自動匯入）
│       └── support-operators.data.ts # 支援幹員資料解析與快取（server-only，Nitro 自動匯入）
├── shared/
│   └── types/
│       └── support-operator.ts       # SupportOperatorRecord（現用）與 SupportOperator（舊版，待清理）等型別，client/server 共用
├── public/
│   ├── favicon.ico          # 網站 favicon
│   └── robots.txt           # 允許所有 User-Agent 爬取（見下方內容）
├── .env.example              # 環境變數範例（不含真實密鑰）
├── docs/
│   ├── README.md             # 項目介紹
│   ├── ARCHITECTURE.md       # 本文件
│   ├── DEVELOPMENT.md        # 開發規範
│   ├── FEATURES.md           # 功能清單
│   ├── TESTING.md            # 測試規範
│   ├── CHANGELOG.md          # 更新日誌
│   ├── domain/
│   │   └── arknights_tools_init.md   # 專精工作量計算領域規則（既有文件）
│   └── plans/
│       ├── draft/            # 開發中計畫（不進版控）
│       └── archive/          # 已完成計畫歸檔（不進版控）
├── nuxt.config.ts            # Nuxt 設定檔
├── tsconfig.json             # TypeScript 設定，引用 .nuxt/ 底下自動產生的 project references
├── package.json              # 依賴與 scripts
└── pnpm-lock.yaml            # pnpm lockfile
```

### 各檔案用途

| 路徑 | 用途 |
| --- | --- |
| `app/app.vue` | Vue root component，render `<NuxtRouteAnnouncer />`（無障礙路由播報）與 `<NuxtPage />`（依 `app/pages/` 路由渲染對應頁面） |
| `app/pages/mastery/index.vue` | 幹員專精試算頁面殼：共用「幹員職業／技能編號」選擇狀態，切換 Tab A（自動建議）／Tab B（手動模擬） |
| `app/composables/useSupportOperators.ts` | 包裝 `GET /api/support-operators` 的 `useFetch`；⚠️ 目前仍傳送 `class`/`skill` query 並預期舊版 `SupportOperator[]`，與實際 API 不相容，見上方已知待處理事項 |
| `server/api/support-operators.get.ts` | 回傳完整支援幹員資料 `{ data: SupportOperatorRecord[] }`（見下方 API 路由總覽表），不篩選 |
| `server/utils/google-sheets.ts` | 用 Service Account（`google-auth-library` 的 `JWT`）驗證後，呼叫 Sheets API v4 `values.get` 讀取指定分頁範圍，回傳原始字串二維陣列 |
| `server/utils/support-operators.data.ts` | 把 `google-sheets.ts` 讀到的原始列資料解析/驗證成 `SupportOperatorRecord[]`，並用 Nitro `defineCachedFunction` 快取 5 分鐘 |
| `shared/types/support-operator.ts` | `SupportOperatorRecord`／`ArknightsClass`／`SupportOperatorCategory`（`critical`/`specific`/`general`/`skill`）為目前實際使用的型別，`app/` 與 `server/` 皆可透過 `#shared/...` 路徑 auto-import（對應 `tsconfig.shared.json`）；`SupportOperator`（舊版 mock 形狀）仍保留但已無資料實作，僅前端兩處引用，屬待清理項目 |
| `nuxt.config.ts` | `compatibilityDate: '2025-07-15'` 鎖定 Nuxt 相容行為版本；`devtools.enabled: true` 開啟 Nuxt DevTools；`runtimeConfig.googleSheets`（server-only）存放 Google Sheets Service Account 憑證 |
| `tsconfig.json` | 本身不含直接的 `compilerOptions`，而是透過 `references` 指向 `pnpm install`（`postinstall` → `nuxt prepare`）產生於 `.nuxt/` 的四個 project reference tsconfig（`tsconfig.app.json` / `tsconfig.server.json` / `tsconfig.shared.json` / `tsconfig.node.json`）。**這代表首次 clone 專案後必須先執行 `pnpm install` 才會有完整型別檢查**，否則編輯器可能報找不到參照的 tsconfig |
| `public/robots.txt` | `Disallow:` 留空即允許所有頁面被索引 |

## 啟動流程

1. `pnpm install` → 觸發 `postinstall` script 執行 `nuxt prepare`，產生 `.nuxt/`（型別、自動匯入清單等，已於 `.gitignore` 排除）。
2. `pnpm dev` → 執行 `nuxt dev`，啟動 Nitro 開發伺服器並監看檔案變更；Nuxt 依 [目錄慣例](https://nuxt.com/docs/guide/directory-structure) 掃描 `app/` 底下的 `pages/`、`layouts/`、`components/` 等目錄（目前皆不存在，故網站只會渲染 `app/app.vue` 本身)。
3. 瀏覽器開啟 `http://localhost:3000` 即看到 Nuxt 預設歡迎畫面。

## API 路由總覽表

| 前綴 | 檔案 | 認證 | 說明 |
| --- | --- | --- | --- |
| `GET /api/support-operators` | `server/api/support-operators.get.ts` | 無（對外）；伺服器端以 Google Service Account 存取 Sheets API | 回傳完整支援幹員資料（目前 20 筆），不帶 query 參數——`category` 如何套用效率加成的商業邏輯尚未定案，故不提前設計篩選參數語意。資料來源見下方「第三方整合」。⚠️ 前端 `useSupportOperators` composable 目前仍傳送 `class`/`skill` query（會被忽略）並預期舊版欄位形狀，見上方已知待處理事項 |

新增 server route 時的慣例：Nuxt 會自動將 `server/api/*.ts` 對應為 `/api/*` 端點（[Nuxt Server Directory 文件](https://nuxt.com/docs/guide/directory-structure/server)）。

## 統一回應格式

- **成功**：`{ data: T }`，例如 `GET /api/support-operators` 回傳 `{ data: SupportOperatorRecord[] }`。
- **錯誤**：一律用 Nitro 的 `createError({ statusCode, statusMessage })` 拋出，交由框架轉成標準 HTTP 錯誤回應（不額外自訂 `{ error }` 包裝）。`support-operators.get.ts` 目前會出現的錯誤情境：
  - 缺少/格式錯誤的 Google Sheets 服務帳戶憑證 → `500`
  - Google Sheets API 呼叫失敗（未分享權限、網路錯誤等）→ `502`
  - 試算表資料列解析失敗（欄位不合法）→ `502`

## 認證與授權機制

**尚未建立。** 目前沒有 middleware、JWT 或任何「終端使用者」登入機制（`GET /api/support-operators` 對外不需認證）。若之後加入，需在此記錄：
- Nuxt route middleware 的行為（`app/middleware/` 目錄、`definePageMeta({ middleware })` 的使用方式）
- JWT 的簽發參數與有效期
- 授權判斷邏輯位置

> 注意：伺服器對 Google Sheets API 的 Service Account 驗證屬於「第三方整合」範疇，不算這裡的終端使用者認證機制，記錄在下方章節。

## 資料庫 Schema

**尚未建立。** 目前沒有資料庫；「幹員陪同效率加成」資料改為即時從 Google Sheets 讀取（見下方「第三方整合」與 `server/utils/support-operators.data.ts`），非靜態檔案也非資料庫。若之後加入真正的資料庫，需在此列出每張表的欄位、型別、約束（如同 [DEVELOPMENT.md](./DEVELOPMENT.md) 表格風格）。

## 第三方整合

**Google Sheets API v4**（唯讀）——供「幹員專精試算」功能讀取支援幹員資料，取代先前的手動謄寫 mock 資料。

- **驗證方式**：Service Account + JWT（`google-auth-library` 的 `JWT` class），scope 為 `https://www.googleapis.com/auth/spreadsheets.readonly`。憑證（`client_email`／`private_key`）透過 `runtimeConfig.googleSheets`（server-only）讀取，對應環境變數見 [DEVELOPMENT.md 環境變數表](./DEVELOPMENT.md#環境變數表)。
- **資料來源**：試算表「方舟專精計時器」（`spreadsheetId = 18F_W-TFndGOEGCVH2cpal0CAdjnQujp9Qp3H3IM9QPU`），分頁 `資料表:陪練幹員`（20 筆，權威來源）。
- **前置條件**：該試算表需分享給服務帳戶的 `client_email`（至少檢視者權限），否則呼叫會回傳 403（對外表現為 `502`）。
- **快取**：`server/utils/support-operators.data.ts` 用 Nitro `defineCachedFunction` 快取 5 分鐘，避免每次請求都打 Google API；部分 serverless 部署環境下快取不保證跨執行個體持久，屬已知限制，非本次需解決的範圍。
