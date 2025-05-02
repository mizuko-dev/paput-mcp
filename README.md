# PaPut MCP サーバー

[PaPut](https://paput.io) と連携する Model Context Protocol (MCP) サーバーです。
AI アシスタント（Windsurf、Cursor、Claude Desktop 等）から PaPut にメモを作成することができます。

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

API キーは PaPut の設定画面から取得できます。

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

### Cursor での設定

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

- 名前: `paput`
- コマンド: `npx`
- 引数: `-y paput-mcp`
- 環境変数: `PAPUT_API_KEY=あなたのAPIキー`

## 使用方法

設定が完了したら、AI アシスタントにリクエストできます。
以下推奨する方法です。

1. 登録すべきメモを提示してもらう（推奨）

```
ここまでの開発をメモとして残したいです。
一つのメモが大きくなりすぎないように、最小の粒度で、タイトル、内容、カテゴリー（複数可）を提示してください。
```

2. メモ確認し問題がなかったら、登録する

```
提案された内容で、PaPut にメモを作成してください。
```

いきなり 2 の方法を実施すると、意図しないメモが登録されてしまう可能性があるため、1 の方法を挟んでからメモを登録することを推奨します。
