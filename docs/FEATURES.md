# FEATURES

## 狀態總覽

| 功能 | 狀態 | 說明 |
| --- | --- | --- |
| 幹員專精工作量計算 | 🚧 開發中（雙分頁 UI、支援幹員資料層／API、計算引擎皆已完成並串接；跳階模擬情境待補） | 見下方詳述 |
| 首頁 / 導覽 | 🔲 未開始 | 目前 `app/app.vue` 僅顯示 Nuxt 預設歡迎畫面（`<NuxtWelcome />`），尚無實際內容或導覽 |

狀態圖例：📝 規劃中　🚧 開發中　✅ 已完成　🔲 未開始

---

## 幹員專精工作量計算

**狀態：🚧 開發中**——完整業務規則已定案並記錄於 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md)。

### 目前實作範圍

已完成：
- `/mastery` 頁面：共用「職業／起始階段」選擇，切換「自動建議排程」（Tab A）／「手動模擬排程」（Tab B）兩個分頁。
- 支援幹員資料層／`GET /api/support-operators`：已改為即時讀取 Google Sheets（見 [ARCHITECTURE.md](./ARCHITECTURE.md#第三方整合)），取代先前的 mock 資料；依 `class`／`fromSkill`（起始階段）回傳「起始階段→專精三」分組候選資料，Tab A 取各組最高效率候選，Tab B 依下拉選到的階段取整組已排序清單。
- domain 文件第 3–6 節的工作量計算引擎（`RequiredWorkBase`、跨階段減半、`phase.work` 累加、完成條件），純函式實作於 `app/utils/mastery.ts`，數值已對照 domain 文件第 7 節範例驗算無誤。
- Tab B（`ManualPlanTab.vue`）：每筆陪同幹員可輸入陪同時／分，即時算出目前階段的 `CompletedWork`／`RequiredWork`／是否達成完成條件／是否觸發下一階段減半，並顯示專精一～三的總覽表。
- Tab A（`AutoPlanTab.vue`）：依各階段目前最高效率候選幹員，反推「建議陪同時間」，並依序把減半結果帶入下一階段。

刻意**尚未實作**（下一階段工作）：
- 「跳階模擬」（例如不在本工具建立專精一紀錄、直接從專精二開始）時，上一階段是否已陪滿 5hr 觸發減半，目前無法手動指定，一律視為未觸發（保守估計），見 [domain 文件第 9 節](./domain/arknights_tools_init.md#9-尚未收斂的部分)。
- `category`（`critical`/`specific`/`general`/`skill`）四類各自何時套用 `baseEfficiency` 與 `conditionEfficiency` 的完整商業邏輯尚未定案（見下方「尚未收斂的部分」）；`GET /api/support-operators` 已先實作簡化版本，一律回傳 `realEfficiency = baseEfficiency + conditionEfficiency`，`critical` 類別（Logos／艾麗妮）「陪滿 5hr 才生效」的條件尚未套用，暫時視為恆生效。

### 功能目的

讓玩家輸入幹員專精過程中的陪同紀錄（陪同了哪些幹員、陪同多久），自動算出：
- 各專精階段（一/二/三）目前已完成的工作量
- 是否已達到完成該階段所需的工作量
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

- 陪同幹員的效率加成（`phase.efficiencyBonus`）：從 `GET /api/support-operators` 取得（即時讀取 Google Sheet「方舟專精計時器」，見 [ARCHITECTURE.md](./ARCHITECTURE.md#第三方整合)），型別為 `SupportOperatorRecord`（`shared/types/support-operator.ts`），API 已算好 `realEfficiency` 供計算引擎直接使用。**仍待確認**：`category`（`critical`/`specific`/`general`/`skill`）四類各自何時套用 `baseEfficiency` 與 `conditionEfficiency` 的完整商業邏輯尚未定案，見下方「尚未收斂的部分」。
- 每個專精階段的 phase 清單（陪同幹員、陪同時長）：Tab B 已可為每筆陪同幹員輸入「時／分」，交給 `evaluateStages` 換算工作量；phase 目前依加入順序排列，尚未支援拖曳排序或編輯後自動重排。

### 尚未收斂的部分（需求層面）

以下摘自領域文件第 9 節，實作前應先確認，避免規則理解錯誤導致重工：
- 陪同幹員的效率加成依幹員、依職業有不同數值（例如 Logos／艾麗妮平常 0%、對到專精職業 30%；烏爾比安不分職業 50%）。資料表結構已定案（`SupportOperatorRecord`），`category` 四類完整的 `baseEfficiency`／`conditionEfficiency` 判定邏輯仍待設計；目前 API 先以「一律相加」簡化，`critical` 的 5hr 條件已在計算引擎中依「該階段 `category === 'critical'` 的陪同時長總和」判定（`app/utils/mastery.ts` 的 `calcCriticalHours`），但 `specific`（例如烏爾比安備註的宿舍搭配條件）尚未實作判定。「跳階模擬」時上一階段是否已陪滿 5hr 的判定方式仍待實作（見上方「刻意尚未實作」）。
- 陪同時間不連續（分好幾段陪同）時，「累積滿 5 小時」的判定是否有例外，尚未和實際遊戲行為交叉驗證。

### 錯誤情境（規劃）

尚未設計輸入驗證與錯誤處理，實作時至少需考慮：
- 陪同時長為負數或 0。
- 效率加成資料缺失（幹員資料表尚未涵蓋某幹員）時的降級行為。

---

## 首頁 / 導覽

**狀態：🔲 未開始。** `app/app.vue` 已改為 render `<NuxtRouteAnnouncer />` 與 `<NuxtPage />`（因新增 `app/pages/` 而必須調整，見 [ARCHITECTURE.md](./ARCHITECTURE.md)），首頁內容移至 `app/pages/index.vue`，但目前仍只 render `<NuxtWelcome />` 佔位，尚無實際首頁內容或導覽選單（例如連到 `/mastery` 的連結）。待補上後應更新本節狀態。
