# 🎵 osu! Mobile Web Player

一個用於瀏覽和播放 osu! 譜面集合中音樂的 Web，目前前端看起來像給手機用的
<br>
早上太無聊從 Claude Code 十分鐘生出來小改的，內含有可能**大量 AI 程式碼**
<br>
### 請小心閱讀

要改的東西

1. public/app.js 把 API URL 改成外部的地址
```
const API_URL = 'https://osumusic.0950405.xyz/api';
```

下面的可以加減看就好


## Feature

- 你需要手動索引
- 慢速搜尋歌曲、藝術家或譜面名稱
- Cloudflare Tunnel 串流支援

## 安裝步驟

1. **安裝依賴套件**
   ```bash
   cd osu-music-player
   npm install
   ```

2. **掃描 osu! 歌曲資料夾**
   ```bash
   npm run scan "C:\osu!\Songs"
   ```

   第一次掃描可能需要 10-30 分鐘，沒耐心等的也得等

3. **啟動伺服器**
   ```bash
   npm start
   ```

4. **開啟瀏覽器**

   前往 http://localhost:3000

## 使用說明

### 掃描音樂

```bash
# 掃描預設路徑
npm run scan

# 掃描自訂路徑
npm run scan "D:\Games\osu!\Songs"
```

### 更新音樂資料庫

當你新增了新的譜面後，只需再次執行掃描指令：

```bash
npm run scan "C:\osu!\Songs"
```

程式會自動偵測新增或修改的檔案，不會重複處理未變動的檔案。

## 技術架構

### 後端
- Node.js + Express
- better-sqlite3（資料庫）
- music-metadata（讀取 MP3 元數據）

### 前端
- 原生 HTML/CSS/JavaScript
- 響應式設計
- 支援音訊串流

### 資料庫結構

```sql
songs (
  id INTEGER PRIMARY KEY,
  title TEXT,
  artist TEXT,
  file_path TEXT UNIQUE,
  duration REAL,
  file_size INTEGER,
  beatmap_folder TEXT,
  last_modified INTEGER
)
```

## API 端點

- `GET /api/songs?page=1&limit=50&search=keyword` - 取得歌曲列表
- `GET /api/stream/:id` - 串流播放歌曲
- `GET /api/stats` - 取得統計資訊

## 效能說明

- 資料庫使用索引加速查詢（artist, title, beatmap_folder）
- 音訊採用 HTTP Range 請求支援串流播放
- 增量掃描機制避免重複處理
- 分頁載入避免一次載入過多資料

## 常見問題

**Q: 掃描很慢怎麼辦？** 
<br>
A: 第一次掃描需要處理所有檔案的元數據，會比較慢。之後的掃描會使用增量更新，速度會快很多。

**Q: 可以修改每頁顯示的歌曲數量嗎？**
<br>
A: 可以，修改 `public/app.js` 中的 `limit=50` 參數。

**Q: 支援其他音訊格式嗎？**
<br>
A: 目前只支援 MP3。如需支援其他格式，需修改 scanner.js 中的檔案過濾條件。