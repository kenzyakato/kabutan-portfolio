# 最終本地整合驗證（2026-10-24）

基線已比對遠端 main：5178d7eb8af9b5f0a0934d5b50d4d8fdd906b842。所有工作在 task-5 隔離目錄完成，未修改生產工作區，未使用共享瀏覽器，未讀取任何實際 secret，未 push 或部署。

## 通過項目

- 乾淨基線副本執行 npm ci 成功。
- npx tsc --noEmit 通過。
- npm test：9/9 通過，包括 23 件作品／9-6-8 分類／46 個原檔 SHA256、未知幣種原文、隱藏恢復／新增／排序／換圖／分類／價目／空圖庫；Tina 省略空服務列的保存邊界；分類名稱安全文字輸出；實際圖片格式及路徑／24 MiB 限制；CI 單庫 main 隔離、固定 actions SHA 與分步憑據範圍；開發後台或憑據洩漏的發布阻擋。
- npm run build:site 成功，23/23 作品與 4 價目卡。四個社交入口保留，全部價目文字與基線逐項一致，CSS 與原站完全相同，Character Design 原陰影色亦保留。
- 本地 tinacms dev 索引與 API 啟動成功。smoke-local 經 GraphQL 保存完整文件：隱藏後網站顯示 22 件，恢復為 23；價目保存後公開輸出更新；所有測試改動最後恢復。Admin HTML／Vite main 模組 HTTP 200。開發服務已停止。
- tinacms build --content=local --skip-cloud-checks --skip-search-index 成功編譯目前完整 schema 與 production admin。只使用公開 client ID 及明確非憑據測試字串，沒有取用實際 token。產生的 client 指向正式 https://content.tinajs.io/4.0/content/413ed129-73d5-4372-b05b-bd9e3c0c3989/github/main。
- 靜態發布 guard 通過：Admin 入口不載入 localhost，無剩餘 CMS 標記、無建置測試字串洩漏、單檔不超過 Pages 25 MiB。正式 npm run build 已串接相同輸出 guard。

## 實際修正的乾淨 checkout 問題

本地 dev 原先監看不會被 Git 保存的空 assets/uploads 資料夾，乾淨 checkout 會啟動失敗；已改為監看既有 assets，重新啟動及保存測試通過。Tina 空服務列可被省略，建置已將其正規化為空清單。分類按鈕不再把分類文字插入 innerHTML。

## 尚未驗證／待配置

Cloudflare account ID、精確 Direct Upload project name、正式 Pages host 尚待另一工作提供。CLOUDFLARE_API_TOKEN 由該工作處理，本工作未讀取／建立／儲存。

上述 production bundle 編譯明確跳過雲端資格與索引檢查，不能代替真實 TINA_TOKEN 的正式 build、Tina 主線索引、GitHub Actions 執行、Pages 部署或正式 Editor 保存驗收。CI 正式路徑沒有使用 skip-cloud-checks。畫師電郵未知，未發邀請。

此機 Node 22.14，而相依套件提示最低 22.15；CI 選 Node 22 最新次版本。Tina 的間接 react-final-form 仍宣告較舊 React peer，npm 有 override 警告；目前索引、TypeScript、九組測試與 production bundle 均成功。正式瀏覽器表單仍列在連線後驗收。
