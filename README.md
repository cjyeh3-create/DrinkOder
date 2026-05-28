# 🥤 辦公室下午茶點單系統 (Office Afternoon Tea Ordering System)

這是一個精美、現代化且極簡的辦公室飲料點單系統，基於 **React + Vite + TypeScript + Tailwind CSS v4** 開發。
支援即時菜單讀取、今日點單統計報表、防斷線本地快取備份，並支援直連 **Google Sheets (Google Apps Script)** 作為後端資料庫。

---

## ✨ 核心特色
*   **Bento Grid 現代化版面**：精美和諧的配色與流暢微動畫，為同仁帶來極佳的點餐體驗。
*   **雙重運行模式**：連線時自動與 Google Sheets 雲端同步；斷線或離線時，自動切換至本機 `localStorage` 離線保險機制，數據不遺失。
*   **即時統計報表**：自動彙整今日點購杯數、累計金額以及發起人名單，支援一鍵匯出 **CSV 報表**，方便下午茶主揪訂購。
*   **API 金鑰安全保護**：API 連線網址採用環境變數配置，防止原始碼儲存庫洩漏。

---

## 🛠️ 本地開發與測試步驟

### 1. 安裝相依套件
在專案根目錄下執行以下指令安裝依賴：
```bash
npm install
```

### 2. 配置本地環境變數
在專案根目錄下建立 `.env.local` 檔案（此檔案已列入 `.gitignore`，安全不外洩），並填入您的 Google Apps Script API 網址：
```env
VITE_API_URL="您的_GOOGLE_APPS_SCRIPT_WEB_APP_網址"
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:3000/` 即可進行本地端測試。

---

## 🚀 部署至 Vercel

本專案支援一鍵部署至 **Vercel**，請依照以下步驟操作以確保 API 安全性：

### 1. 建立 GitHub 儲存庫
*   將此專案推送（Push）至您的個人 GitHub 儲存庫。
*   **重要：** 由於我們已將 `.env.local` 列入 `.gitignore`，您的真實 API 網址將**不會**被推送至 GitHub，完全免除洩漏風險。

### 2. 在 Vercel 中導入專案
*   登入 [Vercel 控制台](https://vercel.com/)。
*   點選 **"Add New"** > **"Project"**，並選擇您的 GitHub 專案進行導入（Import）。

### 3. 設定環境變數 (Environment Variables) ⚠️ **最關鍵步驟**
*   在 Vercel 部署頁面的 **"Environment Variables"** 欄位中，新增以下鍵值對：
    *   **Key:** `VITE_API_URL`
    *   **Value:** `https://script.google.com/macros/s/AKfycbyC1vivpkTpNaEFE-tVRYxhlrRjT56dPqrJTyrGSueUACqhpFKL2xeBVupyGhclheTS/exec` (即您的 Google Apps Script Web App 連結)
*   新增完成後，點擊下方 **"Deploy"** 按鈕進行部署。

### 4. 完成部署
*   Vercel 將自動為您建立 HTTPS 生產環境網址，並且安全地將 `VITE_API_URL` 注入到前端打包程式中。
