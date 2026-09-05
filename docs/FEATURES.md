# FEATURES

## 狀態總覽

| 功能 | 狀態 | 說明 |
| --- | --- | --- |
| 幹員專精工作量計算 | 🚧 開發中（雙分頁 UI、支援幹員資料層／API、計算引擎皆已完成並串接；其他排程策略模式待補） | 見下方詳述 |
| 首頁 / 導覽 | 🔲 未開始 | 目前 `app/app.vue` 僅顯示 Nuxt 預設歡迎畫面（`<NuxtWelcome />`），尚無實際內容或導覽 |

狀態圖例：📝 規劃中　🚧 開發中　✅ 已完成　🔲 未開始

---

## 幹員專精工作量計算

**狀態：🚧 開發中**——完整業務規則已定案並記錄於 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md)。

### 目前實作範圍

已完成：
- `/mastery` 頁面：共用「職業／起始階段」選擇，切換「自動建議排程」（Tab A）／「手動模擬排程」（Tab B）兩個分頁。
- 支援幹員資料層／`GET /api/support-operators`：已改為即時讀取 Google Sheets（見 [ARCHITECTURE.md](./ARCHITECTURE.md#第三方整合)），取代先前的 mock 資料；依 `class`／`fromSkill`（起始階段）回傳「起始階段→專精三」分組候選資料。`category === 'critical'`（Logos／艾麗妮）不受職業篩選限制、每組都會出現，`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入（`server/utils/support-operator-candidates.ts` 的 `resolveCriticalCandidates`）；其餘三類仍依職業篩選。Tab A／Tab B 各自從同一份分組資料中，分別挑出 critical／非 critical 類別效率最高的候選。
- domain 文件第 3–6 節的基礎公式（`RequiredWorkBase`、跨階段減半、`phase.work`），純函式實作於 `app/utils/mastery.ts`，數值已對照 domain 文件第 7 節範例驗算無誤。
- Tab B（`ManualPlanTab.vue`）採用**逐階段即時計算**流程：選好職業後先排「起始階段」，一次只顯示、編輯一個階段（`currentStage`）；每階段安排一位 critical 幹員（Logos／艾麗妮）陪同（下限 5hr、預設 5hr5min 含操作緩衝，專精三沒有下一階段可減半故不安排 critical 幹員，直接反推單一陪練幹員的所需時長）與一位陪練幹員，補滿所需工作量後可點「前往下一階段」，把目前階段結果鎖定成唯讀摘要卡片並前進。下一階段的 `RequiredWork(N)` 採用「上一階段**實際**鎖定的 `triggersNextHalving`」（依使用者真實填的陪同時長是否 `≥5hr` 判斷），起始階段本身宣告式視為未減半（跟 Tab A 一致）；改動「起始階段」或幹員職業會清空已鎖定階段、整個重新開始。已完成階段目前**尚未支援回頭編輯**（見下方「刻意尚未實作」）。
- Tab A（`AutoPlanTab.vue`）採用跟 Tab B 概念上相同的策略（critical 幹員＋另一位陪練幹員），差別是候選幹員不用手動選：專精一、二自動挑該階段 `critical` 類別效率最高的當 critical 幹員（固定陪同 `CRITICAL_DEFAULT_DURATION_HOURS`）、非 `critical` 類別效率最高的當另一位陪練幹員；專精三自動挑整體效率最高的候選幹員。`suggestStagePlans` 把使用者選擇的起始階段（`phases[0]`）視為宣告式的假設起點，永遠當作未減半，之後的階段依序視為套用本策略而觸發減半（因為是「建議」而非使用者實際輸入，沒有 Tab B 那種逐階段鎖定機制）。

刻意**尚未實作**（下一階段工作）：
- **`ManualPlanTab.vue` 已鎖定階段尚未支援回頭編輯**：目前完成一階段並前進後，該階段變成唯讀摘要卡片，無法點擊調整。之後要支援時，只有 critical 幹員陪同時長跨過 5hr 門檻、使 `triggersNextHalving` 改變時才需要連動清空/重算後面已鎖定的階段（調整陪練幹員只影響該階段自己的建議陪同時間，不影響其他階段），見 [domain 文件第 9 節](./domain/arknights_tools_init.md#9-尚未收斂的部分)。
- 目前只有「critical 幹員 + 一位陪練幹員」這一種預設策略；其他排程策略（例如使用者自己安排多段不同幹員陪同）尚未設計。
- `category`（`specific`/`general`/`skill`）三類各自何時套用 `baseEfficiency` 與 `conditionEfficiency` 的完整商業邏輯尚未定案（見下方「尚未收斂的部分」）；`GET /api/support-operators` 對這三類仍是簡化版本，一律回傳 `realEfficiency = baseEfficiency + conditionEfficiency`。`critical` 類別（Logos／艾麗妮）已改為「不受職業篩選限制、`conditionEfficiency` 依職業命中與否決定是否計入」，「陪滿 5hr 才生效下一階段減半」的時間條件也已在 `planCriticalCompanionStage` 套用。

### 功能目的

讓玩家規劃幹員專精過程中的陪同排程，算出：
- 每個專精階段需要安排的陪同幹員陪同多久，才能剛好補滿所需工作量
- 是否觸發下一階段的工作量減半

### 核心業務邏輯

**基礎工作量（詳見領域文件第 3 節）**

```
RequiredWorkBase(N) = Tbase(N) / 1.05   // 基建 5% 專精速度加成
```

| 專精階段 | Tbase(N) | RequiredWorkBase(N) |
| --- | ---: | ---: |
| 專精一 | 8 hr | ≈ 7.619 hr |
| 專精二 | 16 hr | ≈ 15.238 hr |
| 專精三 | 24 hr | ≈ 22.857 hr |

**跨階段減半規則（核心規則，詳見領域文件第 4 節）**

若階段 N 期間陪同 Logos 或艾麗妮累積滿 5 小時，則下一階段 N+1 的所需工作量減半。此規則每階段各自獨立判斷、不會累加，且只影響下一階段、不影響當下階段。專精一因無上一階段，永遠不會被減半。

**階段內工作量累加（詳見領域文件第 5 節）**

一個階段可由多個「陪同幹員不變」的時間區間（phase）組成，每個 phase 依當下效率加成換算工作量後加總：

```
phase.work = phase.duration × (1 + phase.efficiencyBonus / 100)
CompletedWork(N) = Σ phase.work
```

**完成條件（領域文件第 6 節）**

```
階段 N 完成 ⇔ CompletedWork(N) ≥ RequiredWork(N)
```

### 輸入資料

- 陪同幹員的效率加成（`phase.efficiencyBonus`）：從 `GET /api/support-operators` 取得（即時讀取 Google Sheet「方舟專精計時器」，見 [ARCHITECTURE.md](./ARCHITECTURE.md#第三方整合)），型別為 `SupportOperatorRecord`（`shared/types/support-operator.ts`），API 已算好 `realEfficiency` 供計算引擎直接使用。`critical` 類別的職業命中判定已實作（見下方「尚未收斂的部分」）；**仍待確認**：`specific`／`general`／`skill` 三類各自何時套用 `baseEfficiency` 與 `conditionEfficiency` 的完整商業邏輯尚未定案。
- 使用者選擇的陪同幹員（critical 幹員／另一位陪練幹員）與 critical 幹員的陪同時長（可調整，下限 5hr）：Tab B 依此透過 `planCriticalCompanionStage` 反推另一位陪練幹員需要的陪同時長。

### 尚未收斂的部分（需求層面）

以下摘自領域文件第 9 節，實作前應先確認，避免規則理解錯誤導致重工：
- 陪同幹員的效率加成依幹員、依職業有不同數值（例如 Logos／艾麗妮平常 0%、對到專精職業 30%；烏爾比安不分職業 50%）。資料表結構已定案（`SupportOperatorRecord`）。**`critical` 已解決**：不受職業篩選限制（任何職業都會出現在候選名單裡），`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入 `realEfficiency`（`server/utils/support-operator-candidates.ts` 的 `resolveCriticalCandidates`）；陪滿 5hr 觸發下一階段減半的時間條件也已在 `planCriticalCompanionStage` 套用。`specific`／`general`／`skill` 三類完整的 `baseEfficiency`／`conditionEfficiency` 判定邏輯仍待設計，目前 API 對這三類仍先以「一律相加」簡化，`specific`（例如烏爾比安備註的宿舍搭配條件）尚未實作判定。
- 陪同時間不連續（分好幾段陪同）時，「累積滿 5 小時」的判定是否有例外，尚未和實際遊戲行為交叉驗證。

### 錯誤情境（規劃）

尚未設計輸入驗證與錯誤處理，實作時至少需考慮：
- 陪同時長為負數或 0。
- 效率加成資料缺失（幹員資料表尚未涵蓋某幹員）時的降級行為。

---

## 首頁 / 導覽

**狀態：🔲 未開始。** `app/app.vue` 已改為 render `<NuxtRouteAnnouncer />` 與 `<NuxtPage />`（因新增 `app/pages/` 而必須調整，見 [ARCHITECTURE.md](./ARCHITECTURE.md)），首頁內容移至 `app/pages/index.vue`，但目前仍只 render `<NuxtWelcome />` 佔位，尚無實際首頁內容或導覽選單（例如連到 `/mastery` 的連結）。待補上後應更新本節狀態。
