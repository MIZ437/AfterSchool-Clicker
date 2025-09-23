# AfterSchool Clicker ゲーム設計書

## 1. プロジェクト概要

### 1.1 ゲームコンセプト
- **ジャンル**: インクリメンタル・クリッカーゲーム
- **テーマ**: 放課後のヒロインをテーマとしたコレクション型クリッカー
- **ターゲット**: アニメ・ゲーム好きのユーザー
- **プラットフォーム**: Web ブラウザ（HTML5/CSS3/JavaScript）

### 1.2 コアゲームループ
1. ヒロイン画像をクリックしてポイント獲得
2. ポイントでアップグレード購入・ガチャ実行
3. 新しいヒロイン画像の獲得と強化
4. ステージ解放とストーリー進行
5. コレクション要素の充実

## 2. 技術仕様

### 2.1 開発環境
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **ゲームエンジン**: Vanilla JavaScript または Phaser.js
- **データ管理**: LocalStorage（セーブデータ）、CSV（素材管理）
- **音声**: Web Audio API
- **画像**: PNG/JPG形式
- **動画**: MP4形式

### 2.2 ファイル構成
```
AfterSchool Clicker/
├── index.html
├── css/
│   ├── main.css
│   ├── title.css
│   └── game.css
├── js/
│   ├── main.js
│   ├── gameManager.js
│   ├── clickHandler.js
│   ├── shopSystem.js
│   ├── gachaSystem.js
│   ├── stageManager.js
│   ├── albumManager.js
│   ├── saveManager.js
│   └── assetManager.js
├── assets/
│   ├── images/
│   │   ├── heroines/
│   │   ├── ui/
│   │   └── title/
│   ├── videos/
│   ├── audio/
│   │   ├── bgm/
│   │   └── se/
│   └── data/
│       ├── images.csv
│       ├── audio.csv
│       ├── videos.csv
│       ├── text.csv
│       └── stages.csv
└── README.md
```

## 3. ゲームシステム設計

### 3.1 ポイントシステム
```javascript
// ポイント関連の数値設計
const POINT_SYSTEM = {
    baseClickValue: 1,          // 基本クリック値
    clickMultiplier: 1.0,       // クリック倍率
    passivePointsPerSecond: 0,  // 自動獲得ポイント/秒
    totalPoints: 0,             // 総獲得ポイント
    currentPoints: 0            // 現在所持ポイント
};
```

### 3.2 ステージシステム
```javascript
const STAGE_CONFIG = {
    stage1: {
        id: 1,
        name: "教室",
        unlockCost: 0,
        theme: "school_classroom",
        heroineCount: 8,
        description: "放課後の教室で出会うヒロインたち"
    },
    stage2: {
        id: 2,
        name: "図書館",
        unlockCost: 1000,
        theme: "library",
        heroineCount: 8,
        description: "静かな図書館の美しいヒロインたち"
    },
    stage3: {
        id: 3,
        name: "屋上",
        unlockCost: 5000,
        theme: "rooftop",
        heroineCount: 8,
        description: "青空の下で輝くヒロインたち"
    },
    stage4: {
        id: 4,
        name: "体育館",
        unlockCost: 15000,
        theme: "gymnasium",
        heroineCount: 8,
        description: "スポーティなヒロインたちとの出会い"
    }
};
```

### 3.3 ショップシステム
```javascript
const SHOP_ITEMS = {
    clickUpgrades: [
        {
            id: "click_1",
            name: "鉛筆",
            description: "クリック効率が2倍になる",
            baseCost: 15,
            costMultiplier: 1.15,
            effect: { clickMultiplier: 2.0 }
        },
        {
            id: "click_2",
            name: "ペン",
            description: "クリック効率が3倍になる",
            baseCost: 100,
            costMultiplier: 1.15,
            effect: { clickMultiplier: 3.0 }
        }
    ],
    passiveUpgrades: [
        {
            id: "passive_1",
            name: "友達",
            description: "1秒間に1ポイント自動獲得",
            baseCost: 50,
            costMultiplier: 1.10,
            effect: { passivePoints: 1 }
        },
        {
            id: "passive_2",
            name: "クラスメイト",
            description: "1秒間に5ポイント自動獲得",
            baseCost: 300,
            costMultiplier: 1.10,
            effect: { passivePoints: 5 }
        }
    ]
};
```

### 3.4 ガチャシステム
```javascript
const GACHA_CONFIG = {
    stage1: {
        cost: 100,
        images: [
            "heroine_1_1.png", "heroine_1_2.png",
            "heroine_1_3.png", "heroine_1_4.png",
            "heroine_1_5.png", "heroine_1_6.png",
            "heroine_1_7.png", "heroine_1_8.png"
        ]
    },
    stage2: {
        cost: 200,
        images: [
            "heroine_2_1.png", "heroine_2_2.png",
            "heroine_2_3.png", "heroine_2_4.png",
            "heroine_2_5.png", "heroine_2_6.png",
            "heroine_2_7.png", "heroine_2_8.png"
        ]
    }
    // stage3, stage4も同様
};
```

## 4. UI/UX設計

### 4.1 画面レイアウト

#### タイトル画面
```
+--------------------------------+
|        タイトルロゴ              |
|                                |
|    メインキャラクター立ち絵        |
|                                |
|      [ゲーム開始]               |
|      [設定]                    |
|      [ゲーム終了]               |
+--------------------------------+
```

#### ゲーム画面
```
+--------------------------------+
| ポイント: 999  PPS: 10  Stage: 1|
| 次のステージ: 1000ポイント        |
+--------------------------------+
| [Stage1] [Stage2] [Stage3] ... |
+--------------------------------+
|                |              |
|   ヒロイン画像   |   [ショップ]   |
|    (クリック)   |              |
|                |   [ガチャ]    |
|                |              |
+--------------------------------+
| [アルバム] [設定] [ゲーム終了]   |
+--------------------------------+
```

### 4.2 インタラクション設計

#### クリック効果
- クリック箇所に獲得ポイント数とハートエフェクトを表示
- クリック箇所が光るアニメーション（0.2秒間）
- SE再生

#### ホバー効果
- ボタンにマウスオーバーで色変化
- カーソル変更（pointer）

#### トランジション
- ページ遷移: フェードイン/フェードアウト（0.3秒）
- モーダル表示: スケールアニメーション（0.2秒）

## 5. データ管理設計

### 5.1 セーブデータ構造
```javascript
const SAVE_DATA = {
    version: "1.0.0",
    gameProgress: {
        currentStage: 1,
        unlockedStages: [1],
        totalPoints: 0,
        currentPoints: 0,
        clickMultiplier: 1.0,
        passivePointsPerSecond: 0
    },
    collection: {
        unlockedImages: ["heroine_1_1.png"],
        currentDisplayImage: "heroine_1_1.png",
        unlockedVideos: []
    },
    purchases: {
        shopItems: {},
        gachaHistory: []
    },
    settings: {
        bgmVolume: 0.7,
        seVolume: 0.8
    },
    lastSaved: "2024-01-01T00:00:00.000Z"
};
```

### 5.2 CSV データ構造

#### images.csv
```csv
id,filename,category,stage,rarity,description
heroine_1_1,heroine_1_1.png,heroine,1,common,教室のヒロイン1
heroine_1_2,heroine_1_2.png,heroine,1,common,教室のヒロイン2
title_logo,title_logo.png,ui,0,system,タイトルロゴ
```

#### audio.csv
```csv
id,filename,category,loop,volume,description
title_bgm,title_theme.mp3,bgm,true,0.7,タイトル画面BGM
game_bgm_1,stage1_theme.mp3,bgm,true,0.6,ステージ1BGM
click_se,click.wav,se,false,0.8,クリック効果音
```

#### text.csv
```csv
id,category,japanese,context
game_start,button,ゲーム開始,タイトル画面
game_quit,button,ゲーム終了,タイトル画面
current_points,ui,現在のポイント,ゲーム画面
```

## 6. パフォーマンス設計

### 6.1 最適化方針
- 画像の事前読み込み（プリロード）
- CSS Sprite による画像最適化
- イベントリスナーの適切な管理
- requestAnimationFrame によるアニメーション最適化

### 6.2 メモリ管理
- 未使用画像の適切な破棄
- イベントリスナーのクリーンアップ
- セーブデータの定期的な最適化

## 7. セキュリティ・品質

### 7.1 データ整合性
- セーブデータのバリデーション
- 不正な値の検出と修正
- バックアップ機能

### 7.2 エラーハンドリング
- ファイル読み込み失敗時の代替処理
- LocalStorage 容量不足への対応
- ブラウザ互換性問題への対処

## 8. 今後の拡張計画

### 8.1 Phase 1 (基本実装)
- 基本的なクリッカー機能
- ショップ・ガチャシステム
- 4ステージの実装

### 8.2 Phase 2 (機能拡張)
- イベントシステム
- ランキング機能
- ソーシャル要素

### 8.3 Phase 3 (コンテンツ拡張)
- 追加ステージ
- 季節イベント
- ミニゲーム要素

## 9. 品質保証

### 9.1 テスト項目
- 基本ゲームプレイのテスト
- セーブ/ロード機能のテスト
- 各ブラウザでの動作確認
- パフォーマンステスト

### 9.2 ユーザビリティ
- 直感的な操作性
- レスポンシブデザイン対応
- アクセシビリティ配慮