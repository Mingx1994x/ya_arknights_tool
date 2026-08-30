# README

## 項目介紹

**ya-arknights-tools** 是一個明日方舟（Arknights）玩家輔助工具站。專案目前處於初始建置階段，尚未實作任何工具頁面，但已有第一個規劃中的功能——**幹員專精工作量計算**，其完整規則記錄於 [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md)。

## 技術棧

| 分類 | 使用技術 | 版本 |
| --- | --- | --- |
| 前端框架 | [Nuxt](https://nuxt.com/) | ^4.5.2 |
| 核心函式庫 | [Vue](https://vuejs.org/) | ^3.5.41 |
| 路由 | [vue-router](https://router.vuejs.org/) | ^5.2.0 |
| 套件管理 | [pnpm](https://pnpm.io/) | 依 `pnpm-lock.yaml` |
| 語言 | TypeScript（Nuxt 內建，設定見 `tsconfig.json`） | — |

目前尚未加入：狀態管理套件（Pinia 等）、UI 元件庫、ESLint / Prettier、測試框架。新增這些依賴時請同步更新本表。

## 快速開始

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器（http://localhost:3000）
pnpm dev
```

其他常用流程：

```bash
# 建置生產版本（SSR）
pnpm build

# 產生靜態網站（SSG）
pnpm generate

# 本地預覽建置結果
pnpm preview
```

## 常用指令表

| 指令 | 對應 script | 說明 |
| --- | --- | --- |
| `pnpm dev` | `nuxt dev` | 啟動開發伺服器，具熱重載 |
| `pnpm build` | `nuxt build` | 建置 SSR 生產版本至 `.output/` |
| `pnpm generate` | `nuxt generate` | 建置 SSG 靜態版本至 `.output/public/` |
| `pnpm preview` | `nuxt preview` | 預覽 `pnpm build` 或 `pnpm generate` 的產物 |
| `pnpm install` | — | 安裝依賴，會觸發 `postinstall` 執行 `nuxt prepare` 產生 `.nuxt/` 型別檔 |

## 文件索引表

| 文件 | 內容 |
| --- | --- |
| [CLAUDE.md](../CLAUDE.md) | 專案總覽，供 Claude Code 快速掌握專案脈絡 |
| [docs/README.md](./README.md)（本文件） | 項目介紹、快速開始、技術棧 |
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、啟動流程、未來的 API/資料庫規劃位置 |
| [docs/DEVELOPMENT.md](./DEVELOPMENT.md) | 命名規則、新增頁面/元件步驟、環境變數、計畫歸檔流程 |
| [docs/FEATURES.md](./FEATURES.md) | 功能清單與完成狀態 |
| [docs/TESTING.md](./TESTING.md) | 測試規範與指南（含目前尚未設定測試框架的現況） |
| [docs/CHANGELOG.md](./CHANGELOG.md) | 更新日誌 |
| [docs/domain/arknights_tools_init.md](./domain/arknights_tools_init.md) | 專精工作量計算的完整領域規則（既有文件） |
| [docs/plans/](./plans/) | 開發計畫（draft/archive，僅本機保存，不進版控） |
