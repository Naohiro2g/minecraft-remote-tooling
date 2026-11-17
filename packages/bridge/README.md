# 中継（Bridge）

このパッケージは、ブラウザの Scratch エディターとマインクラフト側の McRemote プラグインをつなぎます。ブラウザ側の WebSocket と McRemote プラグインの TCP ポートの間で通信を中継します。[このリポジトリのコード地図](../../README.md)から、ほかの部品との関係を確認できます。

## 役割と境界

- 通常の WebSocket メッセージを、改行で区切る TCP メッセージへ変換します。認証前のペアリングに限り、`one-shot-v1` の中継用包みを外します。
- 接続元（Origin）と接続先のマインクラフトサーバー（Sandbox）の許可リストを確認します。
- 通常の命令、結果、認証の内容は解釈しません。命令の意味と応答は McRemote プラグインが決めます。

公開環境では、Bridge の前段が TLS を終端します。接続先の選択肢は、エディターの `mc-remote-runtime-config.json` と Bridge の設定で揃える必要があります。通信形式と配備上の判断は[knowledge の設計文書](https://github.com/Naohiro2g/mc-remote-knowledge)を参照してください。

## 手元で動かす

リポジトリのルートから実行します。

```sh
npm run build --workspace=packages/bridge
npm start --workspace=packages/bridge
```

`npm run dev --workspace=packages/bridge` は変更時に再ビルドします。テストは `npm test --workspace=packages/bridge` です。接続先と待ち受けの設定項目は [`src/config.ts`](src/config.ts) にあります。

| 設定項目                                             | 意味                                     |
| ---------------------------------------------------- | ---------------------------------------- |
| `BRIDGE_WS_HOST`、`BRIDGE_WS_PORT`                   | WebSocket の待ち受け                     |
| `BRIDGE_ORIGIN_ALLOWLIST`                            | 接続を許すエディターの配信元             |
| `BRIDGE_SANDBOX_ALLOWLIST`、`BRIDGE_DEFAULT_SANDBOX` | 接続を許すマインクラフトサーバーと既定値 |
| `BRIDGE_SANDBOX_PORT`                                | マインクラフト側 McRemote 接続先のポート |

このパッケージは非公開の作業単位（workspace）です。公開用のコンテナー画像は [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) がビルド済みの `dist/` から作ります。

## 接続先IDによるルーティング（実装案）

knowledge `2026-10-24-06`、`00-hub/bridge-connection-targets-instructions_ja.md`
（`33093890ba6968a74e94ad6c37b1afdc900049b1`）に対する案です。入力・生成・配備の実装はStackの範囲です。

一か所の入力を次のJSONとし、生成された同じ形のファイルを`BRIDGE_TARGETS_FILE`で指定します。
ファイル名の案は`connection-targets.json`です。Bridgeは起動時に読み、変更後は再起動します。

```json
{
  "schema_version": 1,
  "default_target_id": "minecraft",
  "targets": [
    { "id": "minecraft", "label": "Minecraft", "host": "127.0.0.1", "port": 25575 },
    { "id": "unity", "label": "Unity箱庭", "host": "127.0.0.1", "port": 25585 },
    { "id": "classroom", "label": "教室", "host": "server.example", "port": 25575 }
  ]
}
```

- `?sandbox=`の名前は維持し、値をIDにします。hostとportはブラウザから指定させません。
- IDは英数字で始まる64文字以内の英数字・`.`・`_`・`-`。IDは一意、既定は一覧の一件です。
- 同じhostの別portや、同じ接続先に対する別IDも登録できます。ラベルやendpointを変えてもIDは維持します。
- 新方式の一覧外ID、host名、host:portは拒否します。JSON-RPC payloadは変更しません。
- 旧環境変数だけの起動は従来のhost＋共通port方式です。旧変数と新ファイルの併用は起動エラーにします。
- 旧Scratchを新BridgeのID方式へ移す場合は、先に既存のhost名と同じIDを明示登録するか、
  Scratchとruntime configを同時に更新します。ID方式に任意hostへのfallbackはありません。
- 初回stableのBridgeのtag／配布物は変更しません。この機能を使う配布物は新しいBridge buildを固定する必要があります。
