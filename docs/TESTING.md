# TESTING

## 現況說明

**專案目前尚未設定任何測試框架。** `package.json` 沒有 `test` script，也沒有安裝 Vitest、`@nuxt/test-utils` 或其他測試相關依賴。本文件先記錄建議做法，待實際引入測試框架後，需回來補上「測試檔案表」「執行順序與依賴關係」等章節的實際內容。

## 建議測試框架

Nuxt 官方推薦組合，尚未安裝，第一次新增測試前需先引入：

```bash
pnpm add -D vitest @nuxt/test-utils @vue/test-utils happy-dom
```

並在 `package.json` 補上：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## 建議測試分層

依 [FEATURES.md](./FEATURES.md) 目前唯一規劃中的功能（幹員專精工作量計算）為例，優先順序建議如下：

1. **純函式單元測試（優先度最高）**：`app/utils/` 下的工作量計算公式（`RequiredWorkBase`、跨階段減半、`phase.work` 累加、完成條件判斷）不依賴 Vue 或 DOM，最容易撰寫也最該優先補齊，直接對照 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md) 第 7 節的範例驗算數字作為測試案例（該節已提供三個階段的完整期望值，可直接當作測資）。
2. **Composable 測試**：`app/composables/` 若封裝了響應式狀態，使用 `@vue/test-utils` 或 Vitest 搭配 Vue 的 reactivity API 測試。
3. **元件測試**：使用 `@nuxt/test-utils` 提供的 `mountSuspended` 等工具，測試互動與渲染結果。

## 撰寫新測試的步驟與範例

以領域文件第 7 節的範例驗算為例，未來 `app/utils/mastery.ts` 的測試可寫成：

```ts
// app/utils/mastery.test.ts
import { describe, expect, it } from 'vitest'
import { calcPhaseWork } from './mastery'

describe('calcPhaseWork', () => {
  it('依效率加成換算 phase 工作量', () => {
    // 對照 docs/domain/arknights_tools_init.md 第 7 節，專精一範例
    expect(calcPhaseWork(95.08 / 60, 60)).toBeCloseTo(152.14 / 60, 2)
  })
})
```

命名慣例：測試檔與被測檔同目錄、同名加 `.test.ts` 後綴（Vitest 預設會掃描 `**/*.test.ts`）。

## 常見陷阱

- **時間單位混用**：領域文件明確要求「內部計算一律使用小時的小數，只在顯示時才轉換成 hr/min」（見領域文件第 2 節備註）。撰寫測試時要注意範例驗算表格是用「分鐘」記錄，換算成小時時需自行除以 60，否則會誤判測試失敗。
- **浮點數誤差**：工作量計算涉及除以 1.05、除以 2 等運算，斷言時應使用 `toBeCloseTo` 而非 `toBe`，容許範例驗算表格中提到的「四捨五入誤差」。
- **減半規則的階段錯位**：`usedLogosOrElysium5hr(N)` 影響的是「下一階段」N+1，測試案例命名與斷言對象容易搞混當前階段與下一階段，撰寫測試時建議直接以領域文件的變數命名（`RequiredWorkBase`/`RequiredWork`）對應測試變數名稱，避免混淆。

## 測試檔案表 / 執行順序與依賴關係

**尚無測試檔案。** 待新增第一批測試後，於此列出檔案清單、彼此相依關係（例如是否需要特定 mock 資料、是否需要依序執行）。
