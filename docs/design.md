# 放課後クリッカー 技術設計書

## 1. プロジェクト概要

### 1.1 ゲームコンセプト
- **ジャンル**: インクリメンタル・クリッカーゲーム（クッキークリッカー風）
- **テーマ**: 美少女キャラクターコレクション
- **ターゲット**: アニメ・ゲーム好きのユーザー
- **プラットフォーム**: Electron デスクトップアプリケーション
- **想定プレイ時間**: 約2時間でコンプリート可能

### 1.2 コアゲームループ
1. 美少女画像をクリックしてポイント獲得（初期値: 1クリック = 1ポイント）
2. ショップでアイテム購入 → クリック効率向上・自動ポイント獲得
3. ガチャでキャラクター獲得 → アルバム収集
4. ステージ解放 → 新しいキャラクター・ご褒美ムービー解放
5. コンプリート → 全画像・動画収集達成

## 2. 技術仕様

### 2.1 開発環境
- **フレームワーク**: Electron (メインプロセス + レンダラープロセス)
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **データ管理**: Electron userData ディレクトリ（セーブデータ）、CSV（素材管理）
- **音声**: Web Audio API
- **画像**: PNG/JPG形式
- **動画**: MP4形式
- **ビルド**: electron-builder (ASAR パッケージング)

### 2.2 ファイル構成
```
放課後クリッカー/
├── src/
│   ├── main.js          # Electron メインプロセス
│   ├── preload.js       # セキュアなIPC通信
│   └── index.html       # レンダラープロセス（ゲームUI）
├── assets/
│   ├── scenes/          # シーン定義JSON
│   │   ├── title.json
│   │   ├── tutorial.json
│   │   ├── game.json
│   │   ├── album.json
│   │   └── settings.json
│   ├── data/            # CSV設定ファイル
│   │   ├── stages.csv
│   │   ├── items.csv
│   │   ├── images.csv
│   │   ├── audio.csv
│   │   ├── videos.csv
│   │   └── text.csv
│   ├── images/          # 画像素材
│   │   ├── heroines/    # ステージ別キャラクター画像
│   │   │   ├── stage1/
│   │   │   ├── stage2/
│   │   │   ├── stage3/
│   │   │   └── stage4/
│   │   └── ui/          # UI素材・エフェクト
│   ├── videos/          # ご褒美ムービー
│   │   └── thumbs/      # 動画サムネイル
│   └── audio/           # BGM・SE
│       ├── bgm/
│       └── se/
├── package.json
└── README.md
```

## 3. ゲームシステム設計

### 3.1 ポイントシステム
```javascript
const POINT_SYSTEM = {
    baseClickValue: 1,          // 基本クリック値
    totalClickBoost: 0,         // クリック加算値合計
    totalCPS: 0,                // 自動獲得ポイント/秒
    totalPoints: 0,             // 総獲得ポイント
    currentPoints: 0            // 現在所持ポイント
};
```

### 3.2 ステージシステム
```javascript
const STAGE_CONFIG = {
    stage1: {
        id: 1,
        name: "ステージ1",
        unlockCost: 0,              // 初期解放済み
        gachaCost: 100,
        heroineCount: 10,
        description: "最初のステージ（解放済み）"
    },
    stage2: {
        id: 2,
        name: "ステージ2",
        unlockCost: 2000,
        gachaCost: 200,
        heroineCount: 30,
        description: "中級ステージへの入り口"
    },
    stage3: {
        id: 3,
        name: "ステージ3",
        unlockCost: 15000,
        gachaCost: 300,
        heroineCount: 50,
        description: "上級ステージの挑戦"
    },
    stage4: {
        id: 4,
        name: "ステージ4",
        unlockCost: 100000,
        gachaCost: 500,
        heroineCount: 70,
        description: "最終ステージの到達"
    }
};
```

### 3.3 アイテムシステム
```javascript
const SHOP_ITEMS = {
    clickUpgrades: [
        {
            id: "ITM_CLICK_1",
            name: "CLICK_1",
            cost: 50,
            effect: "click",
            value: 1,
            description: "クリックごとに+1ポイント"
        },
        {
            id: "ITM_CLICK_2",
            name: "CLICK_2",
            cost: 500,
            effect: "click",
            value: 5,
            description: "クリックごとに+5ポイント"
        },
        {
            id: "ITM_CLICK_3",
            name: "CLICK_3",
            cost: 5000,
            effect: "click",
            value: 20,
            description: "クリックごとに+20ポイント"
        },
        {
            id: "ITM_CLICK_4",
            name: "CLICK_4",
            cost: 50000,
            effect: "click",
            value: 75,
            description: "クリックごとに+75ポイント"
        },
        {
            id: "ITM_CLICK_5",
            name: "CLICK_5",
            cost: 500000,
            effect: "click",
            value: 300,
            description: "クリックごとに+300ポイント"
        }
    ],
    cpsUpgrades: [
        {
            id: "ITM_CPS_1",
            name: "CPS_1",
            cost: 60,
            effect: "cps",
            value: 1,
            description: "毎秒+1ポイント"
        },
        {
            id: "ITM_CPS_2",
            name: "CPS_2",
            cost: 900,
            effect: "cps",
            value: 5,
            description: "毎秒+5ポイント"
        },
        {
            id: "ITM_CPS_3",
            name: "CPS_3",
            cost: 12000,
            effect: "cps",
            value: 20,
            description: "毎秒+20ポイント"
        },
        {
            id: "ITM_CPS_4",
            name: "CPS_4",
            cost: 112500,
            effect: "cps",
            value: 75,
            description: "毎秒+75ポイント"
        },
        {
            id: "ITM_CPS_5",
            name: "CPS_5",
            cost: 900000,
            effect: "cps",
            value: 300,
            description: "毎秒+300ポイント"
        }
    ]
};
```

### 3.4 ガチャシステム
```javascript
const GACHA_CONFIG = {
    stage1: {
        cost: 100,
        maxImages: 10,
        imagePath: "heroines/stage1/",
        images: [
            "heroine_1_1.png", "heroine_1_2.png", "heroine_1_3.png",
            "heroine_1_4.png", "heroine_1_5.png", "heroine_1_6.png",
            "heroine_1_7.png", "heroine_1_8.png", "heroine_1_9.png",
            "heroine_1_10.png"
        ]
    },
    stage2: {
        cost: 200,
        maxImages: 30,
        imagePath: "heroines/stage2/"
        // 30枚の画像定義
    },
    stage3: {
        cost: 300,
        maxImages: 50,
        imagePath: "heroines/stage3/"
        // 50枚の画像定義
    },
    stage4: {
        cost: 500,
        maxImages: 70,
        imagePath: "heroines/stage4/"
        // 70枚の画像定義
    }
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
+--------------------------------------------------+
| ポイント: 999,999  PPS: 123  ステージ: 2         |
+--------------------------------------------------+
| [ステージ1] [ステージ2] [ステージ3] [ステージ4]     |
+--------------------------------------------------+
|                    |                            |
|    ヒロイン画像     |        [ショップ]           |
|    (クリック対象)   |        [ガチャ]             |
|                    |                            |
|                    |   アイテム一覧・ガチャ操作     |
|                    |                            |
+--------------------------------------------------+
| [アルバム] [設定] [ゲーム終了]                     |
+--------------------------------------------------+
```

#### アルバム画面
```
+--------------------------------------------------+
|              キャラクターアルバム                  |
| [ステージ1] [ステージ2] [ステージ3] [ステージ4] [動画] |
+--------------------------------------------------+
| [img] [img] [img] [img] [img] [img] [img] [img] |
| [img] [???] [???] [???] [???] [???] [???] [???] |
| [???] [???] [???] [???] [???] [???] [???] [???] |
| [???] [???] [???] [???] [???] [???] [???] [???] |
| [???] [???] [???] [???] [???] [???] [???] [???] |
+--------------------------------------------------+
|                [戻る]           [拡大表示]        |
+--------------------------------------------------+
```

### 4.2 インタラクション設計

#### クリック効果
- クリック箇所にハートエフェクトアニメーション
- 獲得ポイント数表示（フローティングテキスト）
- クリック箇所の発光エフェクト（0.2秒間）
- SE再生

#### トランジション
- シーン遷移: フェードイン/フェードアウト（0.3秒）
- ステージ切り替え: クロスフェード
- モーダル表示: スケールアニメーション（0.2秒）

## 5. データ管理設計

### 5.1 Electron セーブシステム
```javascript
const SAVE_DATA = {
    version: "1.0.0",
    gameProgress: {
        currentStage: 1,
        unlockedStages: [1],
        totalPoints: 0,
        currentPoints: 0,
        totalClickBoost: 0,
        totalCPS: 0
    },
    collection: {
        heroine: {
            stage1: ["heroine_1_1"],
            stage2: [],
            stage3: [],
            stage4: []
        },
        videos: [],
        currentDisplayImage: "heroine_1_1"
    },
    purchases: {
        items: {
            "ITM_CLICK_1": 1,
            "ITM_CPS_1": 2
        }
    },
    settings: {
        bgmVolume: 0.7,
        seVolume: 0.8
    },
    lastSaved: "2025-01-01T00:00:00.000Z"
};
```

### 5.2 CSV データ構造

#### stages.csv
```csv
id,name,unlock_cost,gacha_cost,description,heroine_count
STAGE_1,ステージ1,0,100,最初のステージ（解放済み）,10
STAGE_2,ステージ2,2000,200,中級ステージへの入り口,30
STAGE_3,ステージ3,15000,300,上級ステージの挑戦,50
STAGE_4,ステージ4,100000,500,最終ステージの到達,70
```

#### items.csv
```csv
id,name,cost,effect,value,desc
ITM_CLICK_1,CLICK_1,50,click,1,クリックごとに+1ポイント
ITM_CLICK_2,CLICK_2,500,click,5,クリックごとに+5ポイント
ITM_CPS_1,CPS_1,60,cps,1,毎秒+1ポイント
ITM_CPS_2,CPS_2,900,cps,5,毎秒+5ポイント
```

#### images.csv
```csv
id,filename,category,stage,scene,description
title_logo,ui/title_logo.png,ui,0,title,ゲームタイトルロゴ
heroine_1_1,heroines/stage1/heroine_1_1.png,heroine,1,game,ステージ1ヒロイン1
heart_effect,ui/effects/heart.png,effect,0,game,クリック時のハートエフェクト
```

#### audio.csv
```csv
id,filename,category,loop,volume,scene,description
title_bgm,bgm/title_theme.mp3,bgm,true,0.7,title,タイトル画面BGM
click_sound,se/click.wav,se,false,0.8,game,クリック効果音
gacha_sound,se/gacha_draw.wav,se,false,0.8,game,ガチャ演出音
```

#### videos.csv
```csv
id,filename,thumbnail,title,unlock_condition,duration,description
stage2_unlock,videos/stage2_reward.mp4,videos/thumbs/stage2_thumb.jpg,ステージ2解放記念,stage_2_unlock,30,ステージ2解放時の報酬動画
complete_ending,videos/ending_reward.mp4,videos/thumbs/ending_thumb.jpg,コンプリート記念エンディング,all_images_collected,90,全画像収集時のエンディング動画
```

#### text.csv
```csv
id,category,japanese,scene,context
game_start,button,ゲーム開始,title,タイトル画面
current_points,label,ポイント:,game,ゲーム画面ヘッダー
shop,tab,ショップ,game,サイドパネル
collection_counter,label,収集状況:,album,アルバム画面
```

## 6. Electron 固有設計

### 6.1 メインプロセス (main.js)
- アプリケーションライフサイクル管理
- セーブデータの読み書き（userData ディレクトリ）
- CSV ファイルの読み込み
- セキュアな IPC 通信

### 6.2 レンダラープロセス (index.html)
- ゲーム UI の描画
- ユーザーインタラクション処理
- アニメーション・エフェクト
- 音声再生

### 6.3 セキュリティ設定
- Context Isolation 有効
- Node Integration 無効
- Preload スクリプトによる安全な API 提供

### 6.4 ASAR パッケージング
- ソースコード保護
- アセット埋め込み
- 高速起動

## 7. パフォーマンス設計

### 7.1 最適化方針
- 画像プリロード & キャッシュシステム
- requestAnimationFrame によるスムーズアニメーション
- オブジェクトプーリング（エフェクト管理）
- CSS Transform3D ハードウェアアクセラレーション

### 7.2 メモリ管理
- 未使用アセットの適切な破棄
- イベントリスナーの自動クリーンアップ
- セーブデータの定期的な最適化（1分間隔 + イベント時）

## 8. セキュリティ・品質

### 8.1 データ整合性
- セーブデータのバリデーション
- 不正値の検出と修正
- 自動バックアップ機能

### 8.2 エラーハンドリング
- CSV ファイル読み込み失敗時の代替処理
- userData ディレクトリアクセス失敗への対応
- 画像・音声ファイル欠損時の処理

## 9. 品質保証

### 9.1 テスト項目
- 基本ゲームプレイのテスト（クリック・購入・ガチャ）
- セーブ/ロード機能の動作確認
- 各 OS での動作確認（Windows/macOS/Linux）
- パフォーマンステスト（メモリ使用量・起動時間）

### 9.2 ビルド・配布
- electron-builder による各プラットフォーム対応
- NSIS インストーラー（Windows）
- DMG パッケージ（macOS）
- AppImage（Linux）
- コード署名によるセキュリティ確保

## 10. 実装フェーズ

### Phase 1: 基本システム実装
- Electron アプリケーション基盤
- メインゲーム画面・クリックシステム
- ポイント管理・表示システム
- セーブ・ロードシステム

### Phase 2: コンテンツシステム
- ショップ・アイテムシステム
- ガチャ・コレクションシステム
- ステージ管理システム
- CSV データ管理システム

### Phase 3: UI/UXポリッシュ
- エフェクト・アニメーション実装
- アルバム・ギャラリー機能
- BGM・SE統合
- シーン遷移システム

### Phase 4: 最終調整・リリース準備
- ゲームバランス調整
- パフォーマンス最適化
- ASAR パッケージング・配布準備
- 各プラットフォーム動作確認