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
- 「手動模擬排程」（`ManualPlanTab.vue`）串接計算引擎，採「critical 幹員＋另一位陪練幹員」預設策略：專精一、二各安排一位 critical 幹員（Logos／艾麗妮）陪同（下限 5hr、預設 5hr5min 含操作緩衝）觸發下一階段減半，反推另一位陪練幹員需要陪同多久才能補滿所需工作量；專精三不安排 critical 幹員，直接反推單一陪練幹員的所需時長。
- 「自動建議排程」（`AutoPlanTab.vue`）改採跟「手動模擬排程」相同的「critical 幹員＋另一位陪練幹員」預設策略（`app/utils/mastery.ts` 新增 `getRequiredWorkUnderDefaultStrategy`、`suggestStagePlans` 重寫為接受候選幹員 `Map` 而非回呼函式），差別是候選幹員自動挑各分類效率最高者，不需手動選擇；舊版「整階段單一候選幹員」模型保留為註解供參考。
- 修正 `server/utils/support-operator-candidates.ts`：新增 `resolveCriticalCandidates()`，讓 `category === 'critical'`（Logos／艾麗妮）不再受職業篩選排除在候選名單外——原本的篩選邏輯會讓沒有對應職業（例如重裝）完全查無 critical 候選幹員，導致「陪滿 5hr 觸發減半」這個核心策略無法使用；現在 `conditionEfficiency` 依職業是否命中決定是否計入，未命中時仍會出現、只是 `realEfficiency` 較低。
- 新增 `app/types/mastery.ts`，把 `app/utils/mastery.ts` 裡僅前端使用的型別（`CriticalCompanionPlan`／`MasteryTopCandidate`／`MasteryStageCandidates`／`MasteryStageAutoPlan`）獨立管理，對齊 `docs/DEVELOPMENT.md` 既有的命名規則（型別與運算邏輯分開存放）。
- 修正「自動建議排程」（`AutoPlanTab.vue`）跨階段減半的假設錯誤：`suggestStagePlans` 原本寫死「專精一未減半、二／三一定減半」，導致起始階段選專精二時，專精二仍被誤判成已減半。改成把使用者選擇的起始階段（`phases[0]`）視為宣告式的假設起點、永遠未減半，之後的階段依序視為套用 critical 幹員策略而觸發減半（`getRequiredWork(phase, phase > startPhase)`）。這個修正目前只套用在「自動建議排程」；「手動模擬排程」仍是舊版邏輯，兩個分頁的設計已分岔，待後續一併處理。
- 「手動模擬排程」（`ManualPlanTab.vue`）改採「逐階段即時計算」流程：拆分「起始階段」（`startStage`）與目前編輯階段（`currentStage`）兩個狀態，完成一階段（選好 critical 幹員與陪練幹員）後點「前往下一階段」才把該階段鎖定成唯讀摘要卡片並前進；下一階段的所需工作量改用「上一階段實際鎖定的 `triggersNextHalving`」（依使用者真實填的 critical 幹員陪同時長是否 `≥5hr` 判斷），取代原本 `getRequiredWorkUnderDefaultStrategy` 寫死一定觸發減半的假設（已移除該函式），修正了前一則條目提到的「手動模擬排程仍是舊版邏輯」問題；改動起始階段或幹員職業會清空已鎖定階段、整個重新開始。已完成階段目前尚未支援回頭編輯，見 [FEATURES.md](./FEATURES.md) 待辦。
