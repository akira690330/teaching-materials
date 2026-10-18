# 互動教材

課堂用的互動動畫教材。純 HTML / CSS / JavaScript，不需要安裝或建置。

## 使用方式

- **本機**：直接雙擊各單元資料夾裡的 `index.html` 即可開啟（離線可用）。
- **線上**：開啟 GitHub Pages 後，從根目錄的 `index.html` 進入單元列表。

## 目錄結構

```
├── index.html                      # 單元列表
├── shared/                         # 各單元共用
│   ├── base.css                    # 色票、版面、時間軸、控制列、解說卡
│   └── vendor/three.min.js         # Three.js r149（MIT，未修改）
└── physics/mechanics/flying-roadster/
    ├── index.html                  # 頁面結構
    ├── style.css                   # 單元專用樣式（受力顏色、HUD、畫布）
    ├── sim.js                      # 物理常數與逐格模擬 → F（每格狀態）、stops（關鍵點）
    ├── cards.js                    # 解說卡內容（改文字只需動這裡）
    ├── draw2d.js                   # 2D 畫布繪圖
    ├── scene3d.js                  # 3D 場景
    └── ui.js                       # HUD、時間軸、播放控制、啟動
```

## 開發注意事項

- 各 JS 檔是一般的 `<script>`（不是 ES modules），最外層宣告的變數彼此共用。
  這樣雙擊 `file://` 開啟時也能執行；改成 `type="module"` 會在本機被瀏覽器擋下。
- **載入順序有依賴關係**：`three.min.js → sim.js → cards.js → draw2d.js → scene3d.js → ui.js`。
- 每個單元是獨立頁面，彼此的全域變數不會互相影響。

## 新增單元

1. 在對應學科資料夾下建立新資料夾，例如 `physics/mechanics/<單元英文名>/`。
2. `index.html` 引用 `../../../shared/base.css`（相對路徑依層數調整）。
3. 到根目錄 `index.html` 加一張單元卡片。

> 第二個單元完成後，再評估是否把 `ui.js` 中的時間軸／關鍵點／解說卡播放邏輯抽成 `shared/player.js`。

## 授權

- Three.js：MIT License © 2010-2023 Three.js Authors（授權聲明保留於 `shared/vendor/three.min.js` 檔頭）。
