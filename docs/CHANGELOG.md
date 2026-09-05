# CHANGELOG

本文件記錄本專案的重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

## [Unreleased]

### Added
- 建立 Nuxt 4 最小起始專案（`app/app.vue`、`nuxt.config.ts`、`tsconfig.json`）。
- 建立專案文件結構：`CLAUDE.md` 與 `docs/`（README、ARCHITECTURE、DEVELOPMENT、FEATURES、TESTING、CHANGELOG）。
- 建立幹員專精工作量計算的領域規則文件 `docs/domain/arknights_tools_init.md`（規劃階段，尚未實作程式碼）。
- 新增支援幹員資料層，串接 Google Sheets API v4（Service Account 驗證，`google-auth-library`）讀取「方舟專精計時器」試算表：`shared/types/support-operator.ts`、`server/utils/google-sheets.ts`、`server/utils/support-operators.data.ts`、`server/api/support-operators.get.ts`（`GET /api/support-operators`）、`.env.example`。
- `GET /api/support-operators` 改為依 `fromSkill`（起始階段，缺省為 1）回傳「起始階段→專精三」分組候選幹員資料（`server/utils/support-operator-candidates.ts`），取代原本只回傳單一階段扁平清單的行為；「自動建議排程」（`AutoPlanTab.vue`）改為各階段各自取最高效率候選（修正原本三個階段誤顯示同一建議幹員的問題），「手動模擬排程」（`ManualPlanTab.vue`）維持單階段切換體驗，但换階段時候選資料已隨同一次請求先行取回。
- 實作專精工作量計算引擎 `app/utils/mastery.ts`（`RequiredWorkBase`／跨階段減半／`phase.work` 累加／完成條件，對應領域文件第 3–6 節）。
- 「手動模擬排程」（`ManualPlanTab.vue`）串接計算引擎：每筆陪同幹員可輸入陪同時／分，即時顯示各階段已完成工作量、是否達成、是否觸發下一階段減半，並新增專精一～三總覽表。
- 「自動建議排程」（`AutoPlanTab.vue`）串接計算引擎：依各階段最高效率候選反推建議陪同時長，並依序帶入跨階段減半判斷。
