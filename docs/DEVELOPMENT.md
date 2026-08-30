# DEVELOPMENT

## 命名規則對照表

Nuxt 4 依「目錄位置」自動決定行為，命名規則沿用 Nuxt 官方慣例（專案目前尚未建立這些目錄，新增時請依此表命名）：

| 類型 | 目錄 | 命名慣例 | 範例 |
| --- | --- | --- | --- |
| 頁面（路由） | `app/pages/` | kebab-case 檔名，`[param]` 為動態路由，`index.vue` 為該目錄的預設頁 | `app/pages/mastery/index.vue` → `/mastery`、`app/pages/mastery/[operatorId].vue` → `/mastery/:operatorId` |
| 元件 | `app/components/` | PascalCase 檔名；子目錄會自動併入元件名前綴 | `app/components/mastery/WorkloadCard.vue` → 使用時為 `<MasteryWorkloadCard />` |
| Composable | `app/composables/` | camelCase 檔名，且以 `use` 開頭 | `app/composables/useMasteryWorkload.ts` |
| 版面 | `app/layouts/` | kebab-case 檔名，`default.vue` 為預設版面 | `app/layouts/default.vue` |
| Route Middleware | `app/middleware/` | kebab-case 檔名 | `app/middleware/auth.ts` |
| Server API | `server/api/` | kebab-case 檔名，`.get.ts` / `.post.ts` 等後綴對應 HTTP method | `server/api/mastery.get.ts` → `GET /api/mastery` |
| 型別定義 | 建議集中於 `app/types/` 或與功能同目錄的 `*.types.ts` | camelCase 或 kebab-case 檔名，型別本身用 PascalCase | `MasteryPhase` |

> 上述目錄多數尚未在專案中建立；第一次新增某類型檔案時，直接依此表建立對應目錄即可，Nuxt 會自動掃描並套用慣例，不需額外註冊。

## 模組系統說明

- 專案使用 Nuxt 4 的 **auto-import** 機制：`app/components/`、`app/composables/`、`app/utils/` 底下的檔案會被自動匯入，元件/函式內**不需要手動 `import`**。
- `package.json` 標記 `"type": "module"`，所有原生 Node 腳本一律使用 ESM `import`/`export` 語法，不可使用 CommonJS 的 `require`。
- TypeScript 路徑與型別由 `nuxt prepare`（`postinstall` 自動執行）產生於 `.nuxt/`，修改 `nuxt.config.ts` 後若編輯器型別未更新，重新執行 `pnpm install` 或 `pnpm dev` 即可重新產生。

## 新增功能的步驟

### 新增頁面

1. 在 `app/pages/` 建立對應路徑的 `.vue` 檔（依上方命名規則）。
2. 若頁面需要獨立版面，於 `app/layouts/` 新增後在頁面內以 `definePageMeta({ layout: 'xxx' })` 指定。
3. 純顯示用途的子元件放到 `app/components/`，避免把邏輯全部塞在頁面檔案裡。

### 新增 Composable（跨頁共用邏輯）

1. 於 `app/composables/useXxx.ts` 建立，函式回傳需要暴露的 state 與方法。
2. 純運算邏輯（不依賴 Vue 響應式，例如 [docs/domain](./domain/) 描述的工作量計算公式）優先寫成 `app/utils/` 下的純函式並附單元測試，composable 只負責串接 Vue 響應式狀態，方便測試與重用。

### 新增 API（`server/`）

1. 建立 `server/api/<name>.<method>.ts`。
2. 使用 Nitro 提供的 `defineEventHandler` 包裹 handler。
3. 若專案日後有多支 API，先在 [ARCHITECTURE.md](./ARCHITECTURE.md) 的「統一回應格式」章節定義好共同回應結構，再開始撰寫，避免每支 API 格式不一致。
4. 完成後更新 [ARCHITECTURE.md](./ARCHITECTURE.md) 的「API 路由總覽表」。

### 新增 Middleware

1. 建立 `app/middleware/<name>.ts`，具名匯出的檔案需在頁面用 `definePageMeta({ middleware: ['<name>'] })` 引用；檔名為 `xxx.global.ts` 則會自動套用到所有頁面。
2. 涉及認證/授權的 middleware，需同步更新 [ARCHITECTURE.md](./ARCHITECTURE.md) 的「認證與授權機制」章節。

## Git 分支策略與 CI/CD

**現況：尚未接上 Vercel、尚未建立 GitHub Actions workflow。** 以下是預先定案的流程規範，接上部署服務時依「落地步驟」執行即可，不需重新討論策略。

### 分支策略：Trunk-based

- `main` 為唯一長駐分支，同時對應 Vercel 的 Production 環境，不另外維護常駐的 `develop` 分支（小專案多一層同步成本，效益有限）。
- 開發新功能／修 bug 一律從 `main` 拉短命的分支，命名沿用 kebab-case + 前綴：`feat/<name>`、`fix/<name>`、`chore/<name>`。
- 完成後開 PR 回 `main`，測試與 CI 皆通過才 merge；merge 後即可（視部署設定）刪除該分支。

### CI／CD 分工

CI 與 CD 由不同工具負責，兩者不衝突：

| 職責 | 工具 | 觸發時機 | 說明 |
| --- | --- | --- | --- |
| CD（部署） | Vercel Git Integration | push 到任何分支／開 PR／merge 到 `main` | 每個分支或 PR 自動產生獨立的 Preview Deployment 網址可供測試；merge 進 `main` 才觸發 Production 部署。這一層**不需要**額外寫 GitHub Actions。 |
| CI（品質把關） | GitHub Actions | PR 開啟／更新時 | 跑 `pnpm install` → `pnpm build`（之後補上 lint、[測試](./TESTING.md) 建立後的 `pnpm test`），作為 PR 是否允許 merge 的把關依據。 |

### 落地步驟（實際串接時）

1. 於 Vercel 建立專案並連接此 GitHub repo（Git Integration），確認 Production 分支設定為 `main`。
2. 新增 `.github/workflows/ci.yml`，於 `pull_request` 觸發時執行 `pnpm install` 與 `pnpm build`；待 [TESTING.md](./TESTING.md) 的測試框架建立後，補上測試指令。
3. 於 GitHub repo 設定 branch protection rule：`main` 需要 CI 檢查通過才能 merge PR。

## 環境變數表

| 變數 | 用途 | 必要性 | 預設值 |
| --- | --- | --- | --- |
| _(尚無環境變數)_ | | | |

目前專案未使用任何環境變數，`.gitignore` 已預先排除 `.env`、`.env.*`（`.env.example` 除外）供未來使用。新增環境變數時：

1. 於 `nuxt.config.ts` 的 `runtimeConfig` 註冊（區分 server-only 與 `public` 兩類）。
2. 建立/更新 `.env.example`，列出變數名稱與範例值（不可包含真實密鑰）。
3. 回來更新本表格。

## JSDoc 格式說明與範例

純函式（尤其是 `app/utils/` 下的領域邏輯運算）需以 JSDoc 標註輸入輸出，方便無型別呼叫端與未來測試撰寫者理解：

```ts
/**
 * 計算單一 phase 在陪同效率加成下實際產生的工作量。
 *
 * @param durationHours - 該 phase 實際經過的時間（小時，小數）
 * @param efficiencyBonusPercent - 陪同幹員提供的效率加成（百分比，例如 30 代表 +30%）
 * @returns 該 phase 換算後的工作量（小時，小數）
 */
export function calcPhaseWork(durationHours: number, efficiencyBonusPercent: number): number {
  return durationHours * (1 + efficiencyBonusPercent / 100)
}
```

規則：
- 只在函式簽章語意不夠自明時補充 `@param`/`@returns`；名稱已足夠清楚時不重複贅述型別（型別由 TypeScript 標註）。
- 涉及遊戲規則的公式，函式內或 JSDoc 需註明對應到 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md) 的章節編號，方便追溯規則來源。

## 計畫歸檔流程

1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`，開發前先存放於 `docs/plans/draft/`。
2. 計畫文件結構：`User Story` → `Spec` → `Tasks`。
3. 功能完成後：移至 `docs/plans/archive/`。
4. 更新 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`。

> `docs/plans/draft/` 與 `docs/plans/archive/` 已加入 `.gitignore`，僅本機保存、不進版控——多人協作時計畫本身不會同步，請以 `docs/FEATURES.md` 與 PR 描述作為對外可見的進度依據。
