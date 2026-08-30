# CLAUDE.md

## 專案概述

ya-arknights-tools — 明日方舟（Arknights）玩家輔助工具站，使用 **Nuxt 4 + Vue 3** 建立。

目前專案處於**初始 scaffold 階段**：程式碼僅有 Nuxt 官方最小起始模板（`app/app.vue` 顯示預設歡迎畫面），尚未實作任何實際功能。已確定的第一個功能是「幹員專精工作量計算」，其完整領域邏輯規劃記錄於 `docs/domain/arknights_tools_init.md`，尚待轉換為程式碼。

## 常用指令

套件管理工具為 **pnpm**（見 `pnpm-lock.yaml`）。

| 指令 | 說明 |
| --- | --- |
| `pnpm install` | 安裝依賴 |
| `pnpm dev` | 啟動開發伺服器（http://localhost:3000） |
| `pnpm build` | 建置生產版本（SSR） |
| `pnpm generate` | 產生靜態網站（SSG） |
| `pnpm preview` | 本地預覽建置結果 |

> 目前未設定 lint / test script，見 [docs/TESTING.md](./docs/TESTING.md) 中的現況說明。

## 關鍵規則

- 專案採用 Nuxt 4 的檔案系統路由與自動匯入（auto-import）慣例，新增頁面/元件/composable 前請先閱讀 [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) 的命名規則。
- 涉及遊戲數值/規則的功能（例如專精工作量計算），必須以 `docs/domain/` 下的領域文件為準；若程式邏輯與文件不一致，先確認文件是否過時，不可憑印象直接改動數值規則。
- 功能開發前先在 `docs/plans/draft/` 記錄計畫；完成後移至 `docs/plans/archive/`（此兩個目錄僅本機保存，不進版控，見 `.gitignore`）。
- 目前沒有後端 API（無 `server/` 目錄）、沒有資料庫、沒有身份驗證機制；新增這些機制前，先在 `docs/ARCHITECTURE.md` 補上對應章節。
- `.claude/` 目錄（Claude Code 本機設定與 skills）不進版控，僅供本機使用。

## 詳細文件

- [./docs/README.md](./docs/README.md) — 項目介紹與快速開始
- [./docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [./docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、計畫歸檔流程
- [./docs/FEATURES.md](./docs/FEATURES.md) — 功能列表與完成狀態
- [./docs/TESTING.md](./docs/TESTING.md) — 測試規範與指南
- [./docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌
- [./docs/domain/arknights_tools_init.md](./docs/domain/arknights_tools_init.md) — 專精工作量計算領域規則（既有文件，先於本次初始化建立）
