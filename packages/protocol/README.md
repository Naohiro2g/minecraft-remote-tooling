# 通信の型と検証例（protocol）

このパッケージは、マイクラリモコンの通信形式を TypeScript の型と定数に写したものです。命令名、`hello` の形、エラーの形、JSON-RPC 2.0 の外枠を扱います。仕様の正本は [knowledge の通信設計](https://github.com/Naohiro2g/mc-remote-knowledge/tree/main/10-protocol)です。このパッケージだけで新しい通信仕様を決めません。

公開済みの通信APIの命令名・引数・戻り値は、公式サイトの[API一覧](https://mc-remote.com/api/)で確認できます。

[このリポジトリのコード地図](../../README.md)に、Scratch エディターやほかの部品との関係があります。

## 役割と検証

実行時の依存先を持たない末端のパッケージです。Scratch のマイクラリモコン拡張は仮想マシンへ組み込まれるため、このパッケージを直接読み込まず、必要な定数を拡張内に持ちます。Bridge も通信の内容を解釈しないため、このパッケージへ依存しません。

[`test/fixtures/`](test/fixtures/)には、複数の実装で同じ通信結果を確かめるための共通の検証例があります。新しい契約を追加する際は、knowledge の仕様、型と定数、検証例の対応を確認します。過去の通信版の検証例は履歴として残します。

protocol `23.2.1` の検証例は [`chat-event-compat-v23.2.1.json`](test/fixtures/chat-event-compat-v23.2.1.json) と [`entity-particle-v23.2.1.json`](test/fixtures/entity-particle-v23.2.1.json) です。API と wire の内容は `23.2.0` と同じです。`23.2.0` の検証例は履歴として残します。entity・particle 側にはサウンド2メソッドと、block・dimension・particle・entity・sound の無印／完全修飾／非正準形も収めています。

リポジトリのルートから実行します。

```sh
npm run build --workspace=@mc-remote/protocol
npm test --workspace=@mc-remote/protocol
```

このパッケージは非公開の作業単位（workspace）で、単独の npm 公開物ではありません。
