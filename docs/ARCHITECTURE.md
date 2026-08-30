# ARCHITECTURE

## 現況說明

本專案目前是 Nuxt 4 官方最小起始模板，尚未加入 `pages/`、`components/`、`composables/`、`server/` 等目錄。本文件記錄**現有結構**，並在對應章節標註「尚未建立」，待實際新增這些目錄/機制時，必須回來更新本文件（見 [DEVELOPMENT.md](./DEVELOPMENT.md) 的關鍵規則）。

## 目錄結構

```
ya-arknights-tools/
├── app/
│   └── app.vue              # Nuxt 4 應用程式進入點（root component）
├── public/
│   ├── favicon.ico          # 網站 favicon
│   └── robots.txt           # 允許所有 User-Agent 爬取（見下方內容）
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
| `app/app.vue` | 目前唯一的 Vue 元件，render `<NuxtRouteAnnouncer />`（無障礙路由播報）與 `<NuxtWelcome />`（Nuxt 預設歡迎畫面，佔位用途，之後應被實際首頁內容取代） |
| `nuxt.config.ts` | `compatibilityDate: '2025-07-15'` 鎖定 Nuxt 相容行為版本；`devtools.enabled: true` 開啟 Nuxt DevTools |
| `tsconfig.json` | 本身不含直接的 `compilerOptions`，而是透過 `references` 指向 `pnpm install`（`postinstall` → `nuxt prepare`）產生於 `.nuxt/` 的四個 project reference tsconfig（`tsconfig.app.json` / `tsconfig.server.json` / `tsconfig.shared.json` / `tsconfig.node.json`）。**這代表首次 clone 專案後必須先執行 `pnpm install` 才會有完整型別檢查**，否則編輯器可能報找不到參照的 tsconfig |
| `public/robots.txt` | `Disallow:` 留空即允許所有頁面被索引 |

## 啟動流程

1. `pnpm install` → 觸發 `postinstall` script 執行 `nuxt prepare`，產生 `.nuxt/`（型別、自動匯入清單等，已於 `.gitignore` 排除）。
2. `pnpm dev` → 執行 `nuxt dev`，啟動 Nitro 開發伺服器並監看檔案變更；Nuxt 依 [目錄慣例](https://nuxt.com/docs/guide/directory-structure) 掃描 `app/` 底下的 `pages/`、`layouts/`、`components/` 等目錄（目前皆不存在，故網站只會渲染 `app/app.vue` 本身)。
3. 瀏覽器開啟 `http://localhost:3000` 即看到 Nuxt 預設歡迎畫面。

## API 路由總覽表

**尚未建立。** 專案目前沒有 `server/` 目錄，因此沒有任何 server route 或 API endpoint。若之後新增後端 API，需在此建立如下表格並持續維護：

| 前綴 | 檔案 | 認證 | 說明 |
| --- | --- | --- | --- |
| _(尚無資料)_ | | | |

新增 server route 時的慣例：Nuxt 會自動將 `server/api/*.ts` 對應為 `/api/*` 端點（[Nuxt Server Directory 文件](https://nuxt.com/docs/guide/directory-structure/server)）。

## 統一回應格式

**尚未建立。** 目前沒有任何 API，因此沒有統一回應格式可記錄。新增第一支 API 時，應在此定義成功/錯誤回應的共同結構（例如 `{ data, error }`），並附上範例 JSON。

## 認證與授權機制

**尚未建立。** 目前沒有 middleware、JWT 或任何登入機制。若之後加入，需在此記錄：
- Nuxt route middleware 的行為（`app/middleware/` 目錄、`definePageMeta({ middleware })` 的使用方式）
- JWT 的簽發參數與有效期
- 授權判斷邏輯位置

## 資料庫 Schema

**尚未建立。** 目前沒有資料庫。若之後加入，需在此列出每張表的欄位、型別、約束（如同 [DEVELOPMENT.md](./DEVELOPMENT.md) 表格風格）。

目前已知會需要資料的領域是「幹員陪同效率加成」（見 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md) 第 8、9 節）——文件中明確指出這部分「資料結構待另外設計」，尚未決定要用靜態資料檔還是資料庫。

## 第三方整合

**尚未建立。** 目前沒有金流或任何第三方服務整合。
