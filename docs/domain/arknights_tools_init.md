# 明日方舟專精工作量模型

## 1. 基礎概念

幹員可以透過「專精」把已學會的技能升級，專精分成三個階段（專精一／二／三），每個階段所需時間依序遞增。

專精進行時可以安排其他幹員陪同來加速，陪同幹員提供的加速幅度依幹員與職業而定；這部分屬於「角色能力」資料，本文件不列舉實際數值，交由之後的幹員資料表／API 提供（見第 8 節）。

另外有兩位特殊幹員——**Logos** 與 **艾麗妮**——陪同滿一定時數會觸發「下一階段時間減半」的效果（見第 4 節），這是本文件要記錄的核心規則。

目前以 **技能一技能專精** 為例，並假設基建提供 **5% 專精速度加成**；這個 5% 加成跟陪同幹員的效率加成是用**相加**的方式合併（見第 5 節），不是分開的兩層乘法。

---

## 2. 變數定義

| 變數 | 說明 |
| --- | --- |
| `N` | 專精階段（1／2／3） |
| `Tbase(N)` | 該階段的遊戲原始專精時間 |
| `RequiredWorkBase(N)` | 尚未套用跨階段減半的基礎所需工作量，數值就是 `Tbase(N)` 本身（不套用任何加成，加成全部在 `phase.work` 換算時套用，見第 5 節） |
| `RequiredWork(N)` | 該階段**實際**所需工作量（已套用跨階段減半，見第 4 節） |
| `CompletedWork(N)` | 該階段目前已累積的工作量 |
| `phase` | 一段「陪同幹員維持不變」的時間區間；一個階段可以有多個 phase（更換陪同幹員時就是新的 phase） |
| `phase.duration` | 該 phase 實際經過的時間（分鐘） |
| `phase.efficiencyBonus` | 該 phase 陪同幹員提供的效率加成（%），實際數值由幹員資料表提供 |
| `BuildSpeedBonus` | 基地訓練室提供的 5% 基礎加成（見第 1 節），換算 `phase.work` 時跟 `phase.efficiencyBonus` **相加**在一起（見第 5 節） |
| `usedLogosOrElysium5hr(N)` | 該階段是否有陪同 Logos 或艾麗妮**累積滿 5 小時**（布林值），決定下一階段是否減半 |

> **內部計算一律使用「分鐘」（整數為主，效率加成換算後可能為小數），只在畫面顯示時才轉換成 `X 小時 Y 分`。**
>
> **2026-09-16 修正**：原本規劃用「小時的小數」當內部單位，但像「5 小時另加 5 分鐘操作緩衝」這種
> 組合，換算成小時是 `5 + 5/60`——`5/60` 是無限循環小數，浮點數表示一定有誤差，且這個誤差會沿著整條
> 計算鏈（`phase.work` 換算、跨階段減半、反推陪同時長）持續傳遞；使用者輸入「N 小時 M 分」時
> `N + M/60` 也是同樣的問題。改用「分鐘」為單位後，`Tbase(N)`、5 小時門檻、5 分鐘緩衝、使用者輸入的
> 時／分，都是整數，只有效率加成的除法（例如反推陪同時長時除以 `1 + BuildSpeedBonus + efficiencyBonus/100`）
> 才會產生小數——這是任何單位都無法避免的，不是小時制特有的問題。純屬內部單位的工程精度調整，
> **不改變任何公式或數值結果**，`Tbase(N)`／`BuildSpeedBonus`／跨階段減半規則等實際數值規則不變。

---

## 3. 基礎工作量（每階段）

`RequiredWorkBase(N)` 不套用任何加成，就是該階段的原始專精時間：

```
RequiredWorkBase(N) = Tbase(N)
```

> **2026-09-06 修正**：舊版文件曾把基建 5% 加成放在這一步（`Tbase(N) / 1.05`），跟陪同幹員的效率加成分開處理，等於是「相乘」合併兩種加成。經與 Google 試算表「方舟專精計時器」的對照組公式，以及使用者實際操作截圖（遊戲介面顯示的倒數時間）比對驗算後，證實這是錯的——5% 應該跟陪同幹員的效率加成**相加**後再一起套用（見第 5 節），不是分開的兩層乘法。詳細驗算數字見第 7 節。

三個階段的 `Tbase(N)`（即 `RequiredWorkBase(N)`），以下用 hr 表示方便閱讀，實際內部計算存分鐘（見第 2 節）：

| 專精階段 | `Tbase(N)`（hr） | `Tbase(N)`（分鐘，內部計算單位） |
| --- | ---: | ---: |
| 專精一 | 8 hr | 480 |
| 專精二 | 16 hr | 960 |
| 專精三 | 24 hr | 1440 |

---

## 4. 跨階段減半規則（核心規則）

**如果**在專精階段 `N` 期間，陪同 Logos 或艾麗妮累積滿 5 小時（即 `usedLogosOrElysium5hr(N) = true`），那麼**下一個階段** `N+1` 的所需工作量會減半：

```
RequiredWork(N) =
  RequiredWorkBase(N) / 2   如果 usedLogosOrElysium5hr(N-1) = true
  RequiredWorkBase(N)       其他情況（包含 N = 1，因為沒有「上一階段」）
```

重點：

- 每個階段**各自獨立判斷**，減半**不會累加**——即使連續兩個階段都陪滿 5 小時，第三階段也只會是原始值的 1/2，不是 1/4。
- 減半只發生在**下一個**階段，不影響陪同 Logos／艾麗妮的**當下**這個階段。
- 專精一沒有「上一階段」，永遠是 `RequiredWorkBase(1)`，不會被減半。

---

## 5. 階段內的工作量累加

一個階段內可以更換不同的陪同幹員，每次更換就是新的一個 phase。每個 phase 依當下陪同幹員的效率加成**加上** `BuildSpeedBonus`（5% 基地加成），把經過的時間換算成工作量：

```
phase.work = phase.duration × (1 + BuildSpeedBonus + phase.efficiencyBonus / 100)

CompletedWork(N) = Σ phase.work   （所有屬於階段 N 的 phase 加總）
```

`BuildSpeedBonus` 固定是 0.05（見第 1 節），每個 phase 都會套用，不管陪同幹員是誰；`phase.efficiencyBonus` 的實際數值取決於選用的幹員（例如陪同幹員的職業是否與被訓練幹員相符），本文件不列舉對照表，見第 8 節。

> 這裡把所有 phase 的工作量**相加**——舊版文件曾誤寫成用「陪同 Logos／艾麗妮的固定時段」減去「一般效率時段」，方向是錯的，已在較早的改版修正。**2026-09-06 再次修正**：5% 基地加成原本沒有出現在這個公式裡（而是單獨套用在第 3 節的 `RequiredWorkBase`），這次改成跟 `phase.efficiencyBonus` 相加在一起，見第 3 節的修正說明與第 7 節的驗算數字。

---

## 6. 完成條件

```
階段 N 完成  當且僅當  CompletedWork(N) ≥ RequiredWork(N)
```

---

## 7. 範例驗算

**2026-09-06 改版**：舊版範例驗算是自己假設一組陪同時長，代入舊公式（相乘模型）反推，屬於自我一致驗算，並不能證明公式本身對不對。這次改用使用者實際操作 `專精一` 時，遊戲介面顯示的倒數時間截圖，直接驗證新公式（相加模型）：

**已知條件**

- `Tbase(1)` = 8 hr = 480 min，`RequiredWorkBase(1)` = 480 min（見第 3 節）
- 陪同幹員：先陪「水陳」（效率加成 95%），後切換「艾麗妮」（效率加成 30%）
- `BuildSpeedBonus` = 5%
- 水陳 phase 的 rate = `1 + 0.05 + 0.95 = 2.00`；艾麗妮 phase 的 rate = `1 + 0.05 + 0.30 = 1.35`
- 玩家自己計時的水陳 phase 實際經過時間（`phase.duration`）：33 分 9 秒 ≈ 33.15 min

**三個檢查點：新公式 vs. 遊戲實際畫面**

| 檢查點 | 新公式（相加模型）算出 | 遊戲實際畫面 | 差距 |
| --- | ---: | ---: | ---: |
| 開始陪水陳時，畫面顯示的倒數（`RequiredWorkBase(1) / rate水陳` = 480 / 2.00） | 4:00:00 | 3:59:56 | 4 秒 |
| 陪水陳 33 分 9 秒後，切換前畫面顯示的剩餘（先扣掉 `33.15 × 2.00` 的已完成工作量，剩餘工作量再除以 rate水陳） | 3:27:51 | 3:26:29 | 1 分 22 秒 |
| 切換成艾麗妮那一刻，畫面重新顯示的倒數（同一份剩餘工作量改除以 rate艾麗妮 = 1.35） | 5:05:54 | 5:05:43 | 11 秒 |

三個檢查點誤差都在 1 分半以內，落在玩家手動計時的合理誤差範圍。作為對照，若照舊版的相乘模型（`RequiredWorkBase(1) = 480/1.05 = 457.14`，rate 不含 `BuildSpeedBonus`）重算同一組數字，結果分別是 3:54:26、3:21:17、5:09:43——跟實際畫面穩定偏差 4～5.5 分鐘，方向一致、不是隨機誤差。這組真實資料證實新公式（相加模型）才是對的。

---

## 8. 目前資料模型

```js
const masteryLevels = {
  mastery1: { Tbase: 8 },
  mastery2: { Tbase: 16 },
  mastery3: { Tbase: 24 },
}

// RequiredWorkBase(N) = Tbase(N)（不套用任何加成，5% 基地加成已併入
// phase.work 的加成係數，見第 5 節），實際所需工作量還要再依
// usedLogosOrElysium5hr(N-1) 決定是否除以 2（見第 4 節）。

// 陪同幹員的效率加成（phase.efficiencyBonus）目前沒有寫死在這裡，
// 資料現況見下方說明。
```

**陪同幹員效率加成資料現況**：20 筆輔訓幹員資料（謄寫自 Google Sheet「方舟專精計時器」`附件:訓練幹員` 分頁）已落地於 `server/utils/support-operators.data.ts`，型別定義在 `shared/types/support-operator.ts`，透過 `GET /api/support-operators`（支援 `class`／`fromSkill` query 篩選）提供給前端。這份資料本身刻意不寫進本文件（維持「角色能力資料」與「業務規則公式」分離的立場，見下方第 9 節），本文件只記錄公式規則；實際數值請以程式碼中的資料為準。

**已實作**：本節公式（`RequiredWorkBase`／跨階段減半／`phase.work`）已落地於 `app/utils/mastery.ts`（純函式，附 `tests/unit/mastery.test.ts` 單元測試，直接對照第 7 節範例驗算），並已串接進 `/mastery` 頁面：「手動模擬排程」（`ManualPlanTab.vue`）採「critical 幹員＋另一位陪練幹員」的預設策略——專精一、二各安排一位 critical 幹員陪滿 ≥5hr 觸發下一階段減半，反推另一位陪練幹員需要陪同多久才能補滿 `RequiredWork(N)`；專精三沒有下一階段可減半，不安排 critical 幹員，直接反推單一陪練幹員的所需時長。「自動建議排程」（`AutoPlanTab.vue`）採相同預設策略，差別是候選幹員不用手動選，改成自動挑各分類（critical／其他）裡效率最高的。見 [FEATURES.md](../FEATURES.md) 的實作範圍說明。

---

## 9. 尚未收斂的部分

- ~~陪同幹員各自的效率加成資料來源未定~~ **已解決**：資料表結構與來源見上方第 8 節。
- **跳階模擬**：
  - **`AutoPlanTab.vue`（已解決）**：`suggestStagePlans` 把「使用者選擇的起始階段」（`phases[0]`）視為宣告式的假設起點，永遠當作未減半；之後的階段依序視為都套用了 critical 幹員策略而觸發減半（`getRequiredWork(phase, phase > startPhase)`，不是寫死的 `phase > 1`）。例如起始階段選專精二：專精二視為未減半（顯示完整 `RequiredWorkBase(2)`），專精三則視為專精二已觸發減半。這不是從使用者實際填的資料推測，純粹是「選了哪一階段當起點，那一階段就定義為未減半」的宣告式規則。
  - **`ManualPlanTab.vue`（已解決）**：改採「逐階段即時計算」流程——「起始階段」下拉選單改回只代表排程從哪裡開始（宣告式視為未減半，跟 `AutoPlanTab.vue` 一致），實際編輯中的階段是獨立的 `currentStage` 狀態，靠「前往下一階段」按鈕前進；下一階段的 `RequiredWork(N)` 改用「上一階段實際鎖定的 `triggersNextHalving`」（依使用者真實填的 critical 幹員陪同時長是否 `≥ 5hr` 判斷），取代原本 `getRequiredWorkUnderDefaultStrategy` 寫死一定減半的假設。改動「起始階段」或幹員職業都會清空已鎖定的階段、整個重新開始。已完成階段目前是唯讀摘要卡片（排版參考 `AutoPlanTab.vue`），**尚未支援回頭編輯**——之後要支援「點卡片調整已完成階段」時，只有 critical 幹員陪同時長跨過 5hr 門檻、使 `triggersNextHalving` 改變時才需要連動清空/重算後面已鎖定的階段（調整陪練幹員只影響該階段自己的建議陪同時間，不影響其他階段）。
- `usedLogosOrElysium5hr(N)` 目前定義是「該階段陪同時間累積滿 5 小時」；如果陪同時間不連續（分好幾段陪同），累積算法是否有例外，尚未和實際遊戲行為交叉驗證，未來如果發現有出入需要再更新本文件。程式碼中對應的判斷邏輯是直接比較「critical 幹員這段陪同時長」是否 `≥ HALVING_THRESHOLD_HOURS`（5 小時）（`app/utils/mastery.ts` 的 `generalCompanionStage`／`criticalCompanionStage`），因為目前的預設策略下 critical 幹員本來就是單一一段陪同，尚未涉及「多段陪同時間加總」的情境。
- **critical 幹員的職業篩選**：`category === 'critical'` 的幹員（Logos／艾麗妮）不受職業篩選限制，任何職業都會出現在候選名單裡；`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入 `realEfficiency`，未命中則只有 `baseEfficiency`（目前兩者皆為 0，因此未命中職業時 `realEfficiency = 0`，但陪滿 5hr 一樣觸發下一階段減半）。已於 `server/utils/support-operator-candidates.ts` 的 `resolveCriticalCandidates` 實作。
- **specific／general／skill 三類的職業與階段篩選資格（2026-09-15 解決）**：這是上面「category 三類完整商業邏輯尚未定案」的一部分，這次先解決「篩選資格」子問題：
  - `specific` 類別（目前資料裡只有烏爾比安一筆）**不受職業（targetClass）篩選限制**，任何職業都會列入候選；但跟 `critical` 一樣，`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入 `realEfficiency`，未命中則只有 `baseEfficiency`（烏爾比安 `targetProfession` 是近衛／輔助：基礎 50%，命中才加到 80%）。備注描述的情境條件（「宿舍要帶 3+1 睡覺幹員」）是否實際達成目前不由程式判斷，只要職業命中就視為恆生效（維持既有簡化）——這點初版實作漏掉了職業命中的條件判斷，一律回傳 80%，已修正。
  - 附帶發現：`docs/plans/archive/2026-08-31-support-operator-data-model.md` 記錄的焰影葦草（cN-04）`category` 是 `specific`、`baseEfficiency`/`conditionEfficiency` 是 `0`/`45`，但即時 Google Sheets 資料目前是 `category: 'general'`、`45`/`0`——該筆資料在該文件建立後已變動，該份歸檔文件對 cN-04 這一列已過時，程式邏輯請以即時資料（`GET /api/support-operators`）為準，不要照該文件的 cN-04 數字使用。
  - `general`／`skill` 兩類仍依 `targetClass` 篩選（未帶 `targetClass` 時不篩）。
  - 所有類別的「階段資格」統一改用 `targetPhase` 通用判斷：`targetPhase === 0` 代表不限階段，任一組都會出現；為 1/2/3 時只在對應該 phase 的那組出現。目前只有 `skill` 類別的資料有非 0 的 `targetPhase`，但邏輯不再寫死綁定 `category === 'skill'`。
  - 已於 `server/utils/support-operator-candidates.ts` 的 `resolveCandidatesByPhase` 實作。
- **`baseEfficiency`／`conditionEfficiency` 何時各自生效的完整規則（2026-09-20 解決）**：
  - **產品定位**：`specific` 備注描述的情境條件（例如烏爾比安「宿舍要帶 3+1 睡覺幹員」）維持恆視為已達成的簡化，不做成使用者可手動勾選/調整的模型——這個服務的定位是「幫使用者算出選定候選幹員能達到的最優解」，幹員本身是否真的滿足情境條件由使用者自行判斷，日後若有實際需求再評估是否開放手動調整。
  - **`general`／`skill` 的 `conditionEfficiency` 生效條件**：修正前無條件套用 `baseEfficiency + conditionEfficiency`（未帶 `targetClass` 時因為篩選不生效、所有 `general`／`skill` 都會列入候選，但 `realEfficiency` 仍拿到全額加成，跟 `critical`／`specific` 未帶 `targetClass` 時退回只剩 `baseEfficiency` 的規則不一致）。前端實際流程一定先選職業才會觸發查詢，`targetClass` 為 `undefined` 只會發生在後端的防呆情境（例如直接呼叫 API 不帶 `class` 參數），但既然要防呆就要跟其他類別一致：改成一律呼叫 `resolveConditionalEfficiency`，未帶 `targetClass`（或職業不命中）時退回只剩 `baseEfficiency`，四個類別（`critical`／`specific`／`general`／`skill`）的計算規則完全統一。
