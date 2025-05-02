# PaPut MCP サーバー

PaPut サービスと連携する Model Context Protocol (MCP) サーバーです。AI アシスタント（Windsurf、Cursor、Claude Desktop 等）から PaPut にメモを作成することができます。

## 機能

- AI アシスタントから PaPut にメモを作成
- メモにカテゴリを設定
- メモの公開/非公開設定

## インストール

npm を使用してグローバルにインストールする場合:

```bash
npm install -g paput-mcp
```

または、npx を使用して直接実行することもできます:

```bash
npx paput-mcp
```

## 設定方法

### Windsurf での設定

`~/.codeium/windsurf/mcp_config.json` に以下を追加します:

```json
"mcpServers": {
  "paput": {
    "command": "npx",
    "args": ["-y", "paput-mcp"],
    "env": {
      "PAPUT_API_KEY": "あなたのAPIキー"
    }
  }
}
```

API キーは PaPut の設定画面から取得できます。

### Cursor での設定

設定（⚙️）から「Settings」を開き、「AI: MCP Servers」の項目を編集します:

```json
"ai.mcpServers": [
  {
    "name": "paput",
    "command": "npx",
    "args": ["-y", "paput-mcp"],
    "env": {
      "PAPUT_API_KEY": "あなたのAPIキー"
    }
  }
]
```

### Claude Desktop での設定

設定から「拡張機能」→「MCP サーバー」を選択し、以下の情報を入力:

- 名前: `paput`
- コマンド: `npx`
- 引数: `-y paput-mcp`
- 環境変数: `PAPUT_API_KEY=あなたのAPIキー`

## 使用方法

設定が完了すると、AI アシスタントに以下のようにリクエストできます:

```
このメモをpaputに保存してください：
タイトル：テストメモ
内容：これはテスト用のメモです
カテゴリ：テスト
```
