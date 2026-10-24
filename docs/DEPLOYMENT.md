# Direct Upload 整合與待配置項

## 準備好的管線

`.github/workflows/deploy-pages.yml` 限 kenzyakato/kabutan-portfolio 的 main push 或 main 手動執行。GitHub 工作 token 只允許 contents:read，checkout 不保存寫入憑據，不接 PR、不要求 deployments:write。官方 actions 固定 commit SHA，Wrangler 固定 4.152.0。

步驟：核對非秘密目標變數 → npm ci → TypeScript → 測試 → npm run build（正式 Tina admin + 靜態網站 + 公開輸出檢查）→ Wrangler 上傳 dist。TINA_TOKEN 只注入建置步驟，CLOUDFLARE_API_TOKEN 只交給最後的部署步驟，不供 npm install／測試／建置使用。

目標 Pages 帳號／專案與協調上線指令已確認。推送 main 會立即觸發建置部署，不可把 workflow 更新當作純文件更新。

## 需要在此庫核對的設定

| 位置 | 名稱 | 值／狀態 |
| --- | --- | --- |
| Actions variable | TINA_PUBLIC_CLIENT_ID | 413ed129-73d5-4372-b05b-bd9e3c0c3989 |
| Actions variable | CLOUDFLARE_ACCOUNT_ID | 6f3b62ae168d61fecc158a0129de4f89（已核實） |
| Actions variable | CLOUDFLARE_PAGES_PROJECT_NAME | kabutan-portfolio（已核實） |
| Actions secret | TINA_TOKEN | 已保存；僅該 Tina 專案 Content Read-only／main；不讀值驗證 |
| Actions secret | CLOUDFLARE_API_TOKEN | 已由 Cloudflare 工作者保存，僅以 secret 名稱核對，不讀值 |

TINA_BRANCH 在 workflow 固定為 main，Pages 根路徑的 TINA_PUBLIC_BASE_PATH 留空。不需要 Cloudflare GitHub App、不在 Pages 平台再次建置 dist。Cloudflare token 的帳號級 Pages Edit 範圍不會被 project-name 參數縮小；該範圍已由使用者另行接受，仍不可擴至其他 GitHub 倉庫。

`check-ci-target.mjs` 在目標欄位缺失、倉庫／分支／Tina client ID 不符或目的地字串格式不合法時先失敗。它固定比對此次已核實的精確 account ID／project name，變數名稱統一為 CLOUDFLARE_PAGES_PROJECT_NAME。

## Pages 與 Tina

正式網址是 https://kabutan-portfolio.pages.dev/，管理入口 /admin/。此 Pages origin 已加入 Tina Site URLs，原有 https://kenzyakato.com 來源保留；不要點主站根目錄 /admin，不修改主站或 DNS。

確認 Pages production branch 為 main，CI 只上傳 dist。Tina schema 和 tina-lock.json 必須先合併入指定倉庫；Tina 尚未索引 schema 時，正式建置可能失敗，需等待索引完成再重跑，不繞過雲端檢查。

只有部署成功後公開頁才更新；不要把 Tina 保存成功或 localhost 編輯成功視為正式發布驗收。正式編輯驗收保存應使用可逆內容改動並恢復，核對實際 App 提交觸發 Actions。Direct Upload 專案無法原地切回 Git integration，若未來改方案須另建專案。

## 無憑據驗證

`npm run build:site` 驗證公開頁；`tinacms build --content=local --skip-cloud-checks --skip-search-index` 可在設定公開 client ID 後編譯 production API client 與 admin bundle，但刻意跳過雲端資格／索引檢查，不代表正式服務已可用。完整 CI 的 npm run build 仍要求 TINA_TOKEN 並執行正式雲端檢查，不會使用此離線捷徑部署。

官方依據：[Cloudflare CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Direct Upload 限制](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[Wrangler Action](https://github.com/cloudflare/wrangler-action)。

正式建置的 verify-output.mjs 會拒絕開發用 admin、未展開 CMS 標記、含建置憑據的公開輸出或超過 25 MiB 的檔案；錯誤訊息不列出秘密值。
