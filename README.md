# マイクラリモコン共通ツール

> [!NOTE]
> ドキュメントは日本語を正本とします。[言語方針](https://github.com/Naohiro2g/mc-remote-knowledge/blob/main/LANGUAGE_POLICY.md)を参照してください。

マイクラリモコンの各クライアントが共有する、通信の型・検証例・通信の観察画面・ブラウザ用中継を開発するリポジトリです。
Scratch、Python、Javaの使い方は、それぞれのクライアントの案内を参照してください。公開された通信APIは[公式API一覧](https://mc-remote.com/api/)にあります。

## 手元で開発する

`.nvmrc`に書かれたNode.jsを用意して、リポジトリのrootで実行します。

```sh
npm ci
npm run build
npm test
```

## コードの場所

| 場所                                    | 役割                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| [Protocol](packages/protocol/README.md) | 通信の型・定数、共有fixtureとowner test                  |
| [WireScope](packages/live/README.md)    | 共通の観察画面、library、adapter、専用fixture、ZIP生成器 |
| [Bridge](packages/bridge/README.md)     | WebSocketとTCPの透明な中継、設定、testと専用fixture      |

Scratch固有の観測データ生成・受け渡し・起動UIとVM／GUIは[Scratchリポジトリ](https://github.com/Naohiro2g/scratch-editor)にあります。
ここにあるpackageはnpmへ公開しません。fixtureは固定Git commit、WireScopeはZIPとdetached manifestのdigestで取得します。
packageのversionと各クライアントのrelease versionは別に扱います。

## 成果物を受け取る

mainのCIは3 packageのbuildとtestを実行し、WireScope ZIP・detached manifest・Bridge OCI archiveをcommitごとのworkflow artifactに収めます。
`candidate-manifest.json`にsource commitと各fileのbytes／SHA-256、Bridge OCIのdigestを記録します。
workflow artifactは90日保持です。公開releaseでは、Scratchの収集workflowが固定した生成物を検証してRelease／OCI registryへ収容します。

所有の変更と移管元の対応は[移管記録](MIGRATION_ja.md)、設計の正本は[knowledge](https://github.com/Naohiro2g/mc-remote-knowledge)にあります。
