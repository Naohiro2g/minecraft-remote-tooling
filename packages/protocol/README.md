# 通信の型と検証例（protocol）

このパッケージは、マイクラリモコンの通信形式を TypeScript の型と定数に写したものです。命令名、`hello` の形、エラーの形、JSON-RPC 2.0 の外枠を扱います。仕様の正本は [knowledge の通信設計](https://github.com/Naohiro2g/mc-remote-knowledge/tree/main/10-protocol)です。このパッケージだけで新しい通信仕様を決めません。

公開済みの通信APIの命令名・引数・戻り値は、公式サイトの[API一覧](https://mc-remote.com/api/)で確認できます。

[このリポジトリのコード地図](../../README.md)に、Scratch エディターやほかの部品との関係があります。

## 役割と検証

実行時の依存先を持たない末端のパッケージです。Scratch のマイクラリモコン拡張は仮想マシンへ組み込まれるため、このパッケージを直接読み込まず、必要な定数を拡張内に持ちます。Bridge も通信の内容を解釈しないため、このパッケージへ依存しません。

[`test/fixtures/`](test/fixtures/)には、複数の実装で同じ通信結果を確かめるための共通の検証例があります。新しい契約を追加する際は、knowledge の仕様、型と定数、検証例の対応を確認します。過去の通信版の検証例は履歴として残します。

protocol `23.2.1` の検証例は [`chat-event-compat-v23.2.1.json`](test/fixtures/chat-event-compat-v23.2.1.json) と [`entity-particle-v23.2.1.json`](test/fixtures/entity-particle-v23.2.1.json) です。API と wire の内容は `23.2.0` と同じです。`23.2.0` の検証例は履歴として残します。entity・particle 側にはサウンド2メソッドと、block・dimension・particle・entity・sound の無印／完全修飾／非正準形も収めています。

既存10本のmethod別カバレッジ、case数、現行／履歴の区別とF1の不足は、[E1の共有fixture一覧](FIXTURE_INVENTORY_ja.md)を参照してください。

## F1：client bootstrap の対話データ

`test/fixtures/client-bootstrap-*-v23.2.1.json` は、protocol `23.2.1` の新しいclient向けの入力と期待値です。
framing、hello、pairing、blocks、errors、close の6本を、
[`client-bootstrap-v1.schema.json`](test/fixtures/client-bootstrap-v1.schema.json) で検査します。
既存10本は変更せず、値の例は `value_refs` から参照します。これらも同じディレクトリのMIT Licenseの対象です。

各fileは `schema`、`protocol`、`suite`、`knowledge_contract`、`cases` を持ちます。各caseの
`id` は6本全体で一意です。`basis` は期待値の根拠となるknowledgeの文書・節で、参照commitは
`knowledge_contract.commit` に固定します。`preconditions` はpeerの設定や架空のregistryを説明します。
実機で採取したtranscriptや、本物のtoken・接続先・playerの情報ではありません。

`steps` は配列順の対話です。clientを作る側は、次のデータを自分のtestへ接続します。

| op                | 意味と付随field                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `connect`         | `connection` で名付けた新しい接続。通常はidを1から採番する                                |
| `client_send`     | clientが送る完全なJSON-RPC `message`                                                      |
| `peer_send`       | peerが返す完全なJSON-RPC `message`                                                        |
| `peer_bytes`      | peerから届く1回分のbyte chunk。`bytes_hex`をhex decodeして渡す。UTF-8文字の途中も分割する |
| `peer_eof`        | peer側のEOF。未完の末尾を成功した応答へ変えない                                           |
| `client_close`    | このscenarioで明示して行うclient側close                                                   |
| `connect_error`   | 接続自体が失敗。OS固有のerrnoや文言は要求しない                                           |
| `approve_pairing` | Minecraft内の承認に相当するpeerの操作。wire messageではない                               |
| `advance_time`    | `milliseconds`だけfixtureの時計を進める。実際に待つ必要はない                             |

`message`はJSON値です。TCP経路ではcompact JSONをUTF-8にしてLFで終端します。browser経路では1 WS messageを
1 JSONとして扱い、TCP用のbyte chunkをそのままWS境界へ読み替えません。framingのcaseの`expected.frames`は
受け取った完全なJSON値、`tail_hex`はまだLFが届いていない末尾です。`matched_ids`／`ignored_ids`は応答の相関結果です。

ほかの`expected`は、そのcaseで比較する観測を持ちます。`result`／`error`はdecode後の値、`compatible`は
versioningの互換判定、`reason`は失敗分類です。`pending_ids`は応答をまだ待つid、`unanswered_ids`は
応答が来る前に接続が閉じたid、`completed_ids`は完全な応答を受けたidです。token・破棄・pairingのfieldは
`token`／`discard_token`／`pairing_required`、transport状態は`connection`で表します。

`related_cases`は別caseのIDを指す補助の参照で、手順の自動挿入ではありません。各対話には必要なhelloを
自身の`steps`に含めます（framingだけのcaseはenvelope／byte境界の単体の例です）。`value_refs`は同じディレクトリの
`file`とRFC 6901の`pointer`で既存の値を参照します。例えば`block-value-v22.json`の`/catalog/block`です。

peerのtoken、session ID、UUID、registry、応答の英語messageはfixture用の架空値です。
server定義域のerror codeはその範囲内から選んだ代表例で、特定の整数を追加批准するものではありません。
`protocol_mismatch`の追加data field名も、このpeerで両方の版を知らせるための例です。
JSON objectのmember順はwireの意味に含めず、BlockValue出力は完全修飾IDとfull stateを比較します。
既存のblock-value fixtureの数値・正準化・既定stateを再利用し、実Minecraftに架空modがあるとは主張しません。

### 契約だけでは決められない境界

- 人間が承認を拒否する専用のpairing wireや`pair_denied` reasonはありません。期限切れ／不明なpairing ID／
  発行paramsの拒否／helloの認可拒否を別caseにし、専用の拒否応答は`unresolved`として返します。
- close時のclient例外型、途中の行の扱いの詳細、pendingの解決方法・timeoutは、このデータで新しく決めません。
  `unanswered_ids`は成功応答が来ていないという観測だけを示します。自動再送の採否は固定しません。
- reconnectはscenarioに明記した新しい接続であり、clientの自動再接続方針ではありません。

toolingのowner testはJSONの形、case IDの重複、case／値の参照を検査します。transportの共通runnerや
client実装は配りません。各clientの送受信・実serverとのpulseの合格は別のF3で確認します。

リポジトリのルートから実行します。

```sh
npm run build --workspace=@mc-remote/protocol
npm test --workspace=@mc-remote/protocol
```

このパッケージは非公開の作業単位（workspace）で、単独の npm 公開物ではありません。

## ライセンス

[`test/fixtures/`](test/fixtures/) ディレクトリだけは [MIT License](test/fixtures/LICENSE) です。このディレクトリ以外の Protocol の実装・テストと、tooling のほかの部分は、ルートの [AGPL-3.0-only](../../LICENSE) のままです。

`package.json` の `license` は、パッケージの実装に適用する `AGPL-3.0-only` を維持しています。共有fixtureをコピーして使う場合は、同ディレクトリの `LICENSE` も含めてください。
