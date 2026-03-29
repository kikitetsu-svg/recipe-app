# レシピ帖 — Vercel デプロイ手順

## 構成

```
recipe-app/
├── public/
│   └── index.html          # フロントエンド（全機能）
├── api/
│   └── recipes/
│       ├── index.js        # GET /api/recipes, POST /api/recipes
│       └── [id].js         # GET/PUT/DELETE /api/recipes/:id
├── package.json
└── vercel.json
```

---

## デプロイ手順

### Step 1 — GitHubにリポジトリを作成

1. https://github.com/new を開く
2. リポジトリ名: `recipe-app`（任意）
3. `Private` を選択 → **Create repository**
4. このフォルダの全ファイルをプッシュ:

```bash
cd recipe-app
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/recipe-app.git
git push -u origin main
```

---

### Step 2 — Vercelにプロジェクトを作成

1. https://vercel.com にログイン（GitHubアカウントで）
2. **Add New → Project**
3. GitHubリポジトリ `recipe-app` をインポート
4. **Framework Preset: Other**（自動検出のまま）
5. **Deploy** をクリック → 初回デプロイ完了

---

### Step 3 — 環境変数を追加（Anthropic APIキー）

1. Vercelダッシュボード → プロジェクト → **Settings → Environment Variables**
2. 以下を追加:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...`（AnthropicのAPIキー） |

3. **Save** をクリック

> APIキーは https://console.anthropic.com/settings/keys から取得できます

---

### Step 4 — Vercel KV（データベース）を追加（データベース）を追加

1. Vercelダッシュボードでプロジェクトを開く
2. **Storage** タブ → **Create Database**
3. **KV (Redis)** を選択
4. データベース名: `recipe-kv`（任意）
5. リージョン: **Tokyo (hnd1)** を選択
6. **Create & Continue** → **Connect**
   - 環境変数が自動で追加される:
     - `KV_URL`
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
     - `KV_REST_API_READ_ONLY_TOKEN`

---

### Step 5 — 再デプロイ

KV接続のため再デプロイが必要:

1. **Deployments** タブ → 最新のデプロイ → **Redeploy**
2. または `git commit --allow-empty -m "trigger redeploy" && git push`

---

### Step 6 — 動作確認

デプロイされたURL（例: `https://recipe-app-xxx.vercel.app`）を開いて:
- レシピを追加 → 別のブラウザ・スマホでも表示されれば成功

---

## データ保存の仕組み

| 項目 | 内容 |
|------|------|
| データベース | Vercel KV（Redis） |
| 画像 | Base64でKVに直接保存（最大1枚あたり約300KB） |
| 同期 | リアルタイム（全デバイスで共有） |
| オフライン | LocalStorageにフォールバック |

### KV無料プラン制限
- データ: 256MB
- リクエスト: 3万回/月
- 帯域: 無制限
→ 個人利用には十分

---

## 環境変数（ローカル開発時）

`.env.local` を作成:

```env
KV_URL=rediss://...（Vercelダッシュボードからコピー）
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
ANTHROPIC_API_KEY=sk-ant-...
```

ローカル起動:
```bash
npm install
npx vercel dev
```

---

## トラブルシューティング

**「オフライン」と表示される場合**
- KVの環境変数が設定されているか確認
- Vercel KVダッシュボードでリクエストログを確認

**画像が保存できない場合**
- KVの1つのvalueは最大1MB（Base64画像は圧縮済みで通常問題なし）
- 画像枚数が多い場合は削減してください
