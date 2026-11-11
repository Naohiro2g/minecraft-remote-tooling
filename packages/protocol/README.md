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
| `peer_eof`        | peer側のEOF。LFの無い末尾はJSONが閉じていても応答にしない                                 |
| `client_close`    | このscenarioで明示して行うclient側close                                                   |
| `connect_error`   | 接続自体が失敗。OS固有のerrnoや文言は要求しない                                           |
| `approve_pairing` | Minecraft内の承認に相当するpeerの操作。wire messageではない                               |
| `advance_time`    | `milliseconds`だけfixtureの時計を進める。実際に待つ必要はない                             |

`message`はJSON値です。TCP経路ではcompact JSONをUTF-8にしてLFで終端します。browser経路では1 WS messageを
1 JSONとして扱い、TCP用のbyte chunkをそのままWS境界へ読み替えません。framingのcaseの`expected.frames`は
受け取った完全なJSON値、`tail_hex`はまだLFが届いていない末尾です。

`matched_ids`は、そのcaseで検査対象にしたrequestに対応付けた応答idを、対応付けた順に列挙する期待値です。
前準備を含む対話全体で照合した応答idの総一覧ではありません。

- F1-ER-01〜03は、エラー応答の対応付けが検査対象なので`[2]`です。helloのid 1は前準備であり、この列には含めません。
- F1-FR-07は、応答の相関処理そのものが検査対象なので、対応付けた全idを受信順の`[2, 1]`で示します。
  未知id 99は対応付けずに破棄するため、`ignored_ids`が`[99]`です。

列に含めない前準備の応答も、clientは通常どおり処理します。ER-01〜03のhelloを無視してよいという意味ではありません。

ほかの`expected`は、そのcaseで比較する観測を持ちます。`result`／`error`はdecode後の値、`compatible`は
versioningの互換判定、`reason`は失敗分類です。`pending_ids`は応答をまだ待つid、`unanswered_ids`は
応答が来る前に接続が閉じたid、`completed_ids`は完全な応答を受けたidです。
`local_failures`はclient側で失敗として終えたrequestの配列で、`{ id, outcome: "completion_unknown" }`は
「完了不明」です。serverの`error`／`reason`や言語固有の例外型を表しません。
CL-03／CL-05では`unanswered_ids: [2]`とこのlocalな失敗を併記し、`pending_ids: []`で応答待ちの回収を示します。

`token`／`discard_token`／`pairing_required`はtokenの取得・破棄・pairingの要否を、
`pairing_attempts`はその接続試行全体で送る`auth.pairBegin`の回数を示します。TCPを張り直しても回数はリセットしません。
`discard_token: true`は拒まれたtokenを捨てることを表し、その後に新しいtokenを得たcaseでは`token`と併記できます。
transport状態は`connection`で表します。

`related_cases`は別caseのIDを指す補助の参照で、手順の自動挿入ではありません。各対話には必要なhelloを
自身の`steps`に含めます（framingだけのcaseはenvelope／byte境界の単体の例です）。`value_refs`は同じディレクトリの
`file`とRFC 6901の`pointer`で既存の値を参照します。例えば`block-value-v22.json`の`/catalog/block`です。

peerのtoken、session ID、UUID、registry、応答の英語messageはfixture用の架空値です。
server定義域のerror codeはその範囲内から選んだ代表例で、特定の整数を追加批准するものではありません。
`protocol_mismatch`は`data.reason`、`data.server`、`data.client_requires`を返します。版の値は文字列です。
clientはcodeによらず`data.reason`で判定します。F1-HE-09はserver定義域の代表値`-32000`、
F1-HE-10はMcRemote `2321.1.0`までの`-32600`を受ける移行対応の例です。後者を契約上のcodeとして採用しません。
決定はknowledge `2026-11-10-01`（wire §7.3）。message文言・範囲内のexact code・切断時機は、このfixtureで新しく固定しません。
JSON objectのmember順はwireの意味に含めず、BlockValue出力は完全修飾IDとfull stateを比較します。
既存のblock-value fixtureの数値・正準化・既定stateを再利用し、実Minecraftに架空modがあるとは主張しません。

### E2で決まったclientの扱いとcaseの範囲

根拠はknowledgeの[決定2026-11-11-01](https://github.com/Naohiro2g/mc-remote-knowledge/blob/562b5c008c7a4e391f04a79ed4496bbd44670896/00-hub/DECISIONS_ja.md)とwire §3.4／§6.5です。

- 人が承認を拒む専用のpairing wireや`pair_denied` reasonは持ちません。承認されなければpendingのまま期限が切れ、
  `pair_expired`になります（AU-02）。clientが期限切れと判断したときは同じ意味で扱い、serverのerrorの形を作りません。
- 接続が閉じたら、応答待ちをすべてlocalな「完了不明」の失敗として終えます。相手のEOF、socket error、client自身のclose、
  timeoutや生存確認による回収が対象です。LFの無い末尾は、JSONが閉じていても応答にしません。
  CL-03／CL-05はEOF時の回収を検査します。例外の型・名前は言語ごとです。
- 通常の応答は既定で長く待ち、応答待ちがある間は接続の最後の受信からの時間で見ます。呼び出しや接続ごとに延ばせ、
  超えたら「完了不明」で接続を回収します。生存確認は別に持ちます。値と設定は言語ごとで、fixtureでは固定しません。
- Client Libraryはrequestを自動で再送しません。`backpressure`や再接続の後も同じです。
- 切断後の次の呼び出しでは既定で自動再接続し、最後に成功を確かめたdimensionとoriginをhelloの`build`で戻します。
  未送信と完了不明、旧接続のFASTと新接続のflushを分け、互換判定と`catalogHash`の照合をやり直します。
  pairingが必要なら自動で進めず止めます。条件の全体は決定⑤のA〜Gを参照してください。
  CL-06／AU-06は明示した再接続の対話であり、この自動再接続の条件全体を検査するcaseではありません。
- 認証reasonで保存tokenを破棄したら、tokenなしのhelloへ戻ります。`auth_required`の後だけpairingするAU-08と、
  helloが成功してpairingしないAU-09を収めています。pairing後のhelloが再び認証reasonで拒まれるAU-10では、
  applicationへ失敗を返して二度目のpairingを始めません。一接続試行に一度までの規則は決定2026-08-30-03によります。

まだ追加していないcaseと、現在の`steps`／`expected`で足りない観測は、
[F1 E2の追加案](F1_E2_PROPOSALS_ja.md)へ分けています。新しいwireやtimeoutの値を提案として固定しません。

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
