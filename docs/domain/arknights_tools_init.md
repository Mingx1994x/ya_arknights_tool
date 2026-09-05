# 明日方舟專精工作量模型

## 1. 基礎概念

幹員可以透過「專精」把已學會的技能升級，專精分成三個階段（專精一／二／三），每個階段所需時間依序遞增。

專精進行時可以安排其他幹員陪同來加速，陪同幹員提供的加速幅度依幹員與職業而定；這部分屬於「角色能力」資料，本文件不列舉實際數值，交由之後的幹員資料表／API 提供（見第 8 節）。

另外有兩位特殊幹員——**Logos** 與 **艾麗妮**——陪同滿一定時數會觸發「下一階段時間減半」的效果（見第 4 節），這是本文件要記錄的核心規則。

目前以 **技能一技能專精** 為例，並假設基建提供 **5% 專精速度加成**。

---

## 2. 變數定義

| 變數 | 說明 |
| --- | --- |
| `N` | 專精階段（1／2／3） |
| `Tbase(N)` | 該階段的遊戲原始專精時間 |
| `RequiredWorkBase(N)` | 只套用 5% 基建加成、尚未套用跨階段減半的基礎所需工作量 |
| `RequiredWork(N)` | 該階段**實際**所需工作量（已套用跨階段減半，見第 4 節） |
| `CompletedWork(N)` | 該階段目前已累積的工作量 |
| `phase` | 一段「陪同幹員維持不變」的時間區間；一個階段可以有多個 phase（更換陪同幹員時就是新的 phase） |
| `phase.duration` | 該 phase 實際經過的時間（小時） |
| `phase.efficiencyBonus` | 該 phase 陪同幹員提供的效率加成（%），實際數值由幹員資料表提供 |
| `usedLogosOrElysium5hr(N)` | 該階段是否有陪同 Logos 或艾麗妮**累積滿 5 小時**（布林值），決定下一階段是否減半 |

> 內部計算一律使用「小時的小數」，只在畫面顯示時才轉換成 `hr / min`，避免時間格式轉換造成誤差。

---

## 3. 基礎工作量（每階段）

基建提供 5% 專精速度加成，所以基礎所需工作量：

```
RequiredWorkBase(N) = Tbase(N) / 1.05
```

三個階段的基礎數據：

| 專精階段 | `Tbase(N)` | `RequiredWorkBase(N)` | 約略時間 |
| --- | ---: | ---: | ---: |
| 專精一 | 8 hr | ≈ 7.619 | 7 hr 37 min |
| 專精二 | 16 hr | ≈ 15.238 | 15 hr 14 min |
| 專精三 | 24 hr | ≈ 22.857 | 22 hr 51 min |

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

一個階段內可以更換不同的陪同幹員，每次更換就是新的一個 phase。每個 phase 依當下陪同幹員的效率加成，把經過的時間換算成工作量：

```
phase.work = phase.duration × (1 + phase.efficiencyBonus / 100)

CompletedWork(N) = Σ phase.work   （所有屬於階段 N 的 phase 加總）
```

`phase.efficiencyBonus` 的實際數值取決於選用的幹員（例如陪同幹員的職業是否與被訓練幹員相符），本文件不列舉對照表，見第 8 節。

> 這裡把所有 phase 的工作量**相加**——舊版文件曾誤寫成用「陪同 Logos／艾麗妮的固定時段」減去「一般效率時段」，方向是錯的，已在這次改版修正。

---

## 6. 完成條件

```
階段 N 完成  當且僅當  CompletedWork(N) ≥ RequiredWork(N)
```

---

## 7. 範例驗算

以下數字對照自「[專精試算] Google 試算表」的實際紀錄，用來驗證上面的公式：

假設專精一、專精二都有陪同 Logos 滿 5hr 5min（= 305 分鐘），因此專精二、專精三都會套用減半：

| 階段 | `RequiredWorkBase(N)`（分） | 是否套用減半 | `RequiredWork(N)`（分） | phase 組成 | `CompletedWork(N)`（分） |
| --- | ---: | --- | ---: | --- | ---: |
| 專精一 | 457.14 | 否（無上一階段） | 457.14 | 95.08 min × 1.60 + 305.00 min × 1.00 | 152.14 + 305.00 = **457.14** |
| 專精二 | 914.29 | 是（專精一有陪滿 5hr） | **457.14** | 86.93 min × 1.75 + 305.00 min × 1.00 | 152.13 + 305.00 = **457.13** |
| 專精三 | 1371.43 | 是（專精二有陪滿 5hr） | **685.71** | 428.57 min × 1.60（單一 phase，無 Logos） | **685.71** |

三個階段的 `CompletedWork(N)` 都剛好等於（或極接近，誤差來自四捨五入）對應的 `RequiredWork(N)`，跟試算表記錄的實際數字一致。

---

## 8. 目前資料模型

```js
const masteryLevels = {
  mastery1: { Tbase: 8 },
  mastery2: { Tbase: 16 },
  mastery3: { Tbase: 24 },
}

// RequiredWorkBase(N) = Tbase(N) / 1.05，實際所需工作量還要再依
// usedLogosOrElysium5hr(N-1) 決定是否除以 2（見第 4 節）。

// 陪同幹員的效率加成（phase.efficiencyBonus）目前沒有寫死在這裡，
// 資料現況見下方說明。
```

**陪同幹員效率加成資料現況**：20 筆輔訓幹員資料（謄寫自 Google Sheet「方舟專精計時器」`附件:訓練幹員` 分頁）已落地於 `server/utils/support-operators.data.ts`，型別定義在 `shared/types/support-operator.ts`，透過 `GET /api/support-operators`（支援 `class`／`fromSkill` query 篩選）提供給前端。這份資料本身刻意不寫進本文件（維持「角色能力資料」與「業務規則公式」分離的立場，見下方第 9 節），本文件只記錄公式規則；實際數值請以程式碼中的資料為準。

**已實作**：本節公式（`RequiredWorkBase`／跨階段減半／`phase.work`）已落地於 `app/utils/mastery.ts`（純函式，數值已對照第 7 節範例驗算），並已串接進 `/mastery` 頁面：「手動模擬排程」（`ManualPlanTab.vue`）採「critical 幹員＋另一位陪練幹員」的預設策略——專精一、二各安排一位 critical 幹員陪滿 ≥5hr 觸發下一階段減半，反推另一位陪練幹員需要陪同多久才能補滿 `RequiredWork(N)`；專精三沒有下一階段可減半，不安排 critical 幹員，直接反推單一陪練幹員的所需時長。「自動建議排程」（`AutoPlanTab.vue`）採相同預設策略，差別是候選幹員不用手動選，改成自動挑各分類（critical／其他）裡效率最高的。見 [FEATURES.md](../FEATURES.md) 的實作範圍說明。

---

## 9. 尚未收斂的部分

- ~~陪同幹員各自的效率加成資料來源未定~~ **已解決**：資料表結構與來源見上方第 8 節。
- **跳階模擬**：
  - **`AutoPlanTab.vue`（已解決）**：`suggestStagePlans` 把「使用者選擇的起始階段」（`phases[0]`）視為宣告式的假設起點，永遠當作未減半；之後的階段依序視為都套用了 critical 幹員策略而觸發減半（`getRequiredWork(phase, phase > startPhase)`，不是寫死的 `phase > 1`）。例如起始階段選專精二：專精二視為未減半（顯示完整 `RequiredWorkBase(2)`），專精三則視為專精二已觸發減半。這不是從使用者實際填的資料推測，純粹是「選了哪一階段當起點，那一階段就定義為未減半」的宣告式規則。
  - **`ManualPlanTab.vue`（尚未解決，暫緩）**：目前仍固定假設專精一、二都會安排 critical 幹員陪滿 ≥5hr（`getRequiredWorkUnderDefaultStrategy` 內部寫死 `phase > 1`），沒有套用上述「相對於起始階段」的規則，也還沒有 `AutoPlanTab.vue` 那種「一次列出起始階段→專精三所有階段」的排版（目前一次只顯示下拉選到的單一階段）。這兩個分頁的設計已經分岔，之後要重新設計 `ManualPlanTab.vue` 時再套用同樣的「相對起始階段」規則與排版方式。
- `usedLogosOrElysium5hr(N)` 目前定義是「該階段陪同時間累積滿 5 小時」；如果陪同時間不連續（分好幾段陪同），累積算法是否有例外，尚未和實際遊戲行為交叉驗證，未來如果發現有出入需要再更新本文件。程式碼中對應的判斷邏輯是直接比較「critical 幹員這段陪同時長」是否 `≥ HALVING_THRESHOLD_HOURS`（5 小時）（`app/utils/mastery.ts` 的 `planCriticalCompanionStage`），因為目前的預設策略下 critical 幹員本來就是單一一段陪同，尚未涉及「多段陪同時間加總」的情境。
- **critical 幹員的職業篩選**：`category === 'critical'` 的幹員（Logos／艾麗妮）不受職業篩選限制，任何職業都會出現在候選名單裡；`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入 `realEfficiency`，未命中則只有 `baseEfficiency`（目前兩者皆為 0，因此未命中職業時 `realEfficiency = 0`，但陪滿 5hr 一樣觸發下一階段減半）。已於 `server/utils/support-operator-candidates.ts` 的 `resolveCriticalCandidates` 實作。
