# Kabutan CMS 交接

本地整合基於正式 main `5178d7eb8af9b5f0a0934d5b50d4d8fdd906b842`，保留 23 件作品、46 張原圖／縮圖、X 與原三平台、全部價目原文及已清理公開文案。未知幣種不補猜。

## 編輯模型

`content/artworks/*.json` 每件作品一檔，預設新增作品先隱藏。公開展示開關負責隱藏／恢復；排序數字小的排前。原圖／縮圖可從 repo-based media 上傳或替換；換圖上傳新檔名，並同步換掉或清空縮圖。未填縮圖就使用原圖。支援 PNG/JPG/WebP/GIF，最多 24 MiB，建置亦驗證檔案大小與實際圖片格式。

`content/settings.json` 保存分類及價目卡。分類與價目卡／服務列可拖曳；分類更名須同步修改作品。價格欄使用完整原文。新價目卡預設隱藏，空的服務列可省略。作品的刪除按鈕關閉，媒體刪除及改名由管理器阻擋；這是操作防呆，不是 API 細粒度權限保證。隱藏不代表私密保護，舊媒體 URL 與 Git 歷史仍可能被讀取。

`templates/index.html` 沿用原 HTML/CSS，建置時插入 JSON 內容。分類按鈕用 DOM textContent 呈現，防止分類文字被當 HTML 執行。公開頁讀取建置出的靜態內容，不要求訪客登入。

## 本地工作

Node 22.15+，執行 `npm ci`、`npx tsc --noEmit`、`npm test`、`npm run build:site`。`npm run dev` 啟動 Tina 本地 API 4001 與網站 4173，可用 `/admin/` 開發，這不是正式登入或正式編輯驗收。新作品的內部檔名須唯一；非英文標題可手動填入如 work-024。

## 已連線的服務

Tina 管理員為使用者已確認的 `kenzyakato / hanzawamiko@gmail.com`。專案 `kabutan-portfolio`，公開 client ID `413ed129-73d5-4372-b05b-bd9e3c0c3989`。Free 已核實為 $0、2 users、2 roles。GitHub App 安裝 ID 174780044，實際選擇 Only select repositories，僅 kenzyakato/kabutan-portfolio；metadata 唯讀，code／PR／hooks 讀寫，並保留使用者已接受的 GitHub public repositories read-only。提交身分為 bot，公開姓名電郵的共同署名關閉。

使用者自行建立的 cloudflare-pages-build-main 為 Content Read-only、僅 main；已經具體授權後安全存入此庫 Actions Secret TINA_TOKEN，沒有 secret 值寫入本地檔案。不要另建或重用預設 Search token。Cloudflare API token 與 Pages 專案由另一工作處理，本工作不讀秘密、不操作其瀏覽器。

## 發布及尚待驗收

採此庫 Actions 建置再 Direct Upload，完整待配置項見 [DEPLOYMENT.md](DEPLOYMENT.md)。不要復用先前 All repositories 的 Cloudflare GitHub App，也不要更動其權限。CMS／CI 尚未 push 或執行部署。畫師電郵未知，未邀請 Editor；未開付費、未改主站或 DNS。

正式驗收要確認 Tina schema 索引、正確 Pages 來源、正式 admin 登入、上傳／新增／隱藏恢復／排序／分類／價目保存，並確認保存提交觸發此庫 Actions、Pages 更新後才宣告可自行編輯發布。不要承諾免費 Editorial Workflow 或一鍵撤銷全部操作。維護者可用 Git 歷史人工恢復。
