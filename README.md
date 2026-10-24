# Kabutan portfolio

Artwork and commission menu by Kabutan. Artwork rights remain with their respective owners; no blanket reuse license is granted.

作品集沿用原本可愛視覺，以 TinaCMS 編輯 JSON，支援新增／換圖、隱藏恢復、排序、分類與價目。公開網站由 `templates/index.html` 建置為靜態 `dist/`；不再以根目錄舊 index 作為發布輸出。

本地：Node 22.15+，`npm ci` → `npm run dev`，開啟 `http://127.0.0.1:4173/admin/`。本地模式不需憑據，不能當作正式帳號驗收。`npm test` 與 `npx tsc --noEmit` 執行驗證，`npm run build:site` 可無憑據建置公開頁。

正式管線採此庫 main 的 GitHub Actions 建置 `npm run build`，再以 Wrangler Direct Upload `dist` 至經核對的 Pages 專案。正式站為 https://kabutan-portfolio.pages.dev/，管理入口 https://kabutan-portfolio.pages.dev/admin/。

[編輯與服務交接](docs/CMS-HANDOFF.md) · [部署設定清單](docs/DEPLOYMENT.md) · [驗證結果](docs/VALIDATION.md)
