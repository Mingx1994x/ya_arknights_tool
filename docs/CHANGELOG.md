# CHANGELOG

本文件記錄本專案的重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

## [Unreleased]

### Added
- 建立 Nuxt 4 最小起始專案（`app/app.vue`、`nuxt.config.ts`、`tsconfig.json`）。
- 建立專案文件結構：`CLAUDE.md` 與 `docs/`（README、ARCHITECTURE、DEVELOPMENT、FEATURES、TESTING、CHANGELOG）。
- 建立幹員專精工作量計算的領域規則文件 `docs/domain/arknights_tools_init.md`（規劃階段，尚未實作程式碼）。
- 新增支援幹員資料層，串接 Google Sheets API v4（Service Account 驗證，`google-auth-library`）讀取「方舟專精計時器」試算表：`shared/types/support-operator.ts`、`server/utils/google-sheets.ts`、`server/utils/support-operators.data.ts`、`server/api/support-operators.get.ts`（`GET /api/support-operators`）、`.env.example`。
