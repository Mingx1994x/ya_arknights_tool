# TESTING

## 現況說明

**已安裝 Vitest**（`pnpm add -D vitest`），`package.json` 已有 `test`（`vitest run`）／`test:watch`（`vitest`）script。測試檔案獨立於 `tests/` 目錄管理，不與被測程式碼放在同一個資料夾（見下方「測試目錄結構」）。目前只有 `app/utils/mastery.ts` 的純函式單元測試（`tests/unit/mastery.test.ts`），尚未安裝 `@nuxt/test-utils`／`@vue/test-utils`／`happy-dom`，composable／元件測試仍是規劃中，需要時再引入。

## 測試目錄結構

測試檔案一律放在專案根目錄的 `tests/` 底下，依測試類型分子目錄，不與 `app/`／`server/` 下的原始碼混在一起：

```
tests/
├── unit/          # 純函式單元測試（不依賴 Vue／DOM），例如 tests/unit/mastery.test.ts
├── composables/   # Composable 測試（尚未開始）
└── components/    # 元件測試（尚未開始）
```

檔名與被測檔同名、加 `.test.ts` 後綴（例如 `app/utils/mastery.ts` → `tests/unit/mastery.test.ts`），內部再用相對路徑 `import` 回原始碼（Vitest 預設會掃描專案內所有 `**/*.test.ts`，不需額外設定 `include`）。

## 建議測試框架

Composable／元件測試仍待引入時，補裝：

```bash
pnpm add -D @nuxt/test-utils @vue/test-utils happy-dom
```

## 建議測試分層

依 [FEATURES.md](./FEATURES.md) 目前唯一規劃中的功能（幹員專精工作量計算）為例，優先順序建議如下：

1. **純函式單元測試（已完成第一批）**：`app/utils/mastery.ts` 的工作量計算公式（`RequiredWorkBase`、跨階段減半、`phase.work` 換算、`planCriticalCompanionStage` 的 critical＋陪練幹員配對、`suggestStagePlans` 的自動排程反推）不依賴 Vue 或 DOM，對照 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md) 第 7 節的範例驗算數字作為測試案例，見 `tests/unit/mastery.test.ts`。
2. **Composable 測試（尚未開始）**：`app/composables/` 若封裝了響應式狀態，使用 `@vue/test-utils` 或 Vitest 搭配 Vue 的 reactivity API 測試，放在 `tests/composables/`。
3. **元件測試（尚未開始）**：使用 `@nuxt/test-utils` 提供的 `mountSuspended` 等工具，測試互動與渲染結果，放在 `tests/components/`。

## 撰寫新測試的步驟與範例

以領域文件第 7 節的範例驗算為例，`app/utils/mastery.ts` 的測試寫法（節錄自 `tests/unit/mastery.test.ts`）：

```ts
// tests/unit/mastery.test.ts
import { describe, expect, it } from 'vitest'
import { calcPhaseWork } from '../../app/utils/mastery'

describe('calcPhaseWork', () => {
  it('依效率加成（含 5% 基地加成）換算 phase 工作量', () => {
    // 對照 docs/domain/arknights_tools_init.md 第 7 節，專精一水陳（95% 加成）33 分 9 秒範例
    // rate = 1 + 0.05 + 0.95 = 2.00
    expect(calcPhaseWork(33.15 / 60, 95)).toBeCloseTo(66.3 / 60, 2)
  })
})
```

命名慣例：測試檔放在 `tests/<測試類型>/` 底下、與被測檔同名並加 `.test.ts` 後綴，用相對路徑 import 回 `app/`／`server/` 下的原始碼（見上方「測試目錄結構」）。

## 常見陷阱

- **時間單位混用**：領域文件明確要求「內部計算一律使用小時的小數，只在顯示時才轉換成 hr/min」（見領域文件第 2 節備註）。撰寫測試時要注意範例驗算表格是用「分鐘」記錄，換算成小時時需自行除以 60，否則會誤判測試失敗。
- **浮點數誤差**：工作量計算涉及除以 2（跨階段減半）等運算，斷言時應使用 `toBeCloseTo` 而非 `toBe`，容許範例驗算表格中提到的「四捨五入誤差」。
- **減半規則的階段錯位**：`usedLogosOrElysium5hr(N)` 影響的是「下一階段」N+1，測試案例命名與斷言對象容易搞混當前階段與下一階段，撰寫測試時建議直接以領域文件的變數命名（`RequiredWorkBase`/`RequiredWork`）對應測試變數名稱，避免混淆。

## 測試檔案表 / 執行順序與依賴關係

| 檔案 | 依賴 | 說明 |
| --- | --- | --- |
| `tests/unit/mastery.test.ts` | `app/utils/mastery.ts`（無 mock，不需特定執行順序） | 對照 `docs/domain/arknights_tools_init.md` 第 7 節範例驗算，涵蓋 `getRequiredWorkBase`／`getRequiredWork`／`calcPhaseWork`／`calcDurationForWork`／`planCriticalCompanionStage`／`suggestStagePlans`／`formatHoursAsHm` |
