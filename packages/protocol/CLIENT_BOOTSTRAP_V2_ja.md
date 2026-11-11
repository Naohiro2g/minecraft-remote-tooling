# F1 v2：application操作と接続ごとの観測

`test/fixtures/client-bootstrap-operations-v23.2.1.json`の12caseは、E2の待機、再接続、localな終了を検査する入力です。
形式は`mcremote.client-bootstrap.v2`、検査用schemaは`test/fixtures/client-bootstrap-v2.schema.json`です。
wireの版は既存と同じ`23.2.1`です。新しいmethod、reason、clientの例外型や公開APIを定めません。

根拠はknowledge `076a127a22eaf0188c1d13822bfd55bfeee9ec38`の
[依頼票](https://github.com/Naohiro2g/mc-remote-knowledge/blob/076a127a22eaf0188c1d13822bfd55bfeee9ec38/00-hub/polyglot-f1-e2-ops-fixture-instructions_ja.md)、
DECISIONS `2026-11-11-01`／`2026-11-12-01`と、wire §3.4／§3.5／§6.2／§6.5です。

## v1との境界

既存6fileの52caseとv1 schemaは、そのまま残します。v2を別fileへ分けたのは、application操作、request idをまだ持たない結果、
時計、notification、接続別の観測を、既存のwire対話と違う方法でconsumerが処理する必要があるためです。

既存fileを明示して読むconsumerは継続できます。`client-bootstrap-*-v23.2.1.json`をglobして全部v1として読むconsumerは、
新しいoperations fileを読めません。`schema`で分岐するか、v1のfile一覧を固定してください。v2を読めない場合に、その12caseを
合格扱いしないでください。MIT Licenseは同じfixtureディレクトリのものを含めます。

これはデータであり、共通のtest runnerやClient Libraryの実装ではありません。consumer側のadapterが、自分のAPI、credential store、
仮想時計、transportへ接続します。例外名、イベント名、cacheの内部構造をこのmetadataの名前へ変更する必要はありません。

## stepsの入力と観測

配列順に、入力を適用するか、clientの出力を観測します。`app_call`は開始だけで、完了を待ちません。応答待ちがある間に別の
呼び出しを開始できます。入力後は、その時刻で実行可能な処理を進めてから次の観測へ進みます。実時間でsleepしません。

| op                 | 入力か観測か | 意味                                                                                                                         |
| ------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `app_connect`      | 入力         | `call`で識別する接続開始。保存tokenが使える通常のbootstrapを起動する                                                         |
| `app_call`         | 入力         | `call`で識別するapplication操作。`method`と`params`をconsumerのAPIへ写す。`mode`はclient側のDEBUG／FASTで、wireへ載せない    |
| `expect_connect`   | 観測         | clientが張る接続を`connection`で名付ける。harnessが先に接続して自動再接続を代行しない                                        |
| `expect_send`      | 観測         | その`connection`から次に出るJSON-RPC `message`。harnessが送信を代行しない。id無しのFAST notificationも受ける                 |
| `peer_send`        | 入力         | その接続のpeerから応答を渡す。TCPではUTF-8 JSON＋LF、browser側では1 message＝1 JSONへ写す                                    |
| `peer_eof`         | 入力         | その接続がEOFになったと伝える                                                                                                |
| `socket_error`     | 入力         | 確立済み接続のsocket errorを注入する。OSのerrno、文言は固定しない                                                            |
| `connect_error`    | 入力         | 接続を確立できず、consumerのpolicyが失敗を確定した境界。`terminal: true`はその境界への注入で、最初のdialで諦める規則ではない |
| `liveness_lost`    | 入力         | transportがもう受信できないと判定したことを伝える。生存確認のprobeや待つ長さを決めるopではない                               |
| `advance_clock`    | 入力         | clientの仮想時計を、指定したtimerの長さに対する`fraction`の割合だけ進める。下記を参照                                        |
| `observe`          | 観測         | `expected`に挙げた中間状態を比較する。追加送信の有無、pendingがまだ残るかなどをここで確かめる                                |
| `seed_epoch_state` | testの準備   | 取得済みのhandle／cursor／catalogのcacheをadapterが用意する。新しいwireや通常利用者向けAPIではない                           |

全caseのtokenやserver、session、handle、hashは架空です。保存tokenはfixtureの`mcrs_fixture_only_not_a_real_credential`を
選択targetに用意します。OP-08だけはtoken無しです。helloのclient identityはfixture値へ設定するか、consumerの送信を
正規化して比較します。ほかのJSON member順も比較の対象にしません。

`expect_send`と`connections.sent_count`を合わせて、必要な送信と余分な送信を区別します。送信数は名付けた接続の最初から数え、
helloやnotificationも含めます。`observe`までの処理を進めても、その後の時計操作を勝手に進めないでください。
自動再送が無いことの観測はcase内の区間に対するもので、有限のfixtureだけから未来の全時刻を検査したとは主張しません。

## 仮想時計

- `receive_idle`はconsumerが設定した通常requestのtimeoutです。flush専用のtimeoutにはしません。
- `pairing_ttl`は、そのpairingに対してpeerが返した`expires_in`です。言語固有のrequest timeoutと混ぜません。
- `fraction: { numerator: 3, denominator: 4 }`なら、そのtimerの長さの3/4だけ、現在時刻から進めます。timerを発火させる命令ではなく、
  clientの通常の期限判定に使う時計を進める操作です。単位や秒数は定めません。分数の誤差で境界を跨がない仮想時計を使います。
- 応答を受けたら`receive_idle`の最後の受信時刻が更新されます。OP-02では3/4だけ待った後に一つ応答を受け、さらに1/2だけ進めます。
  最初の受信からは期限を超えていても、最後の受信からは期限前なので、残るrequestはまだpendingです。その後3/4を進めて回収を検査します。
- 期限ちょうどの比較演算は固定せず、期限前と期限を超えた後を使います。既定で長く待つことや、実運用の長さの妥当性は、各言語の
  設定と実測で確認します。このcaseの短い実行時間から、実運用の短いtimeoutを選びません。
- 時計は飛ばした時刻のpollを再生せず、新しい現在時刻で処理を再開します。OP-08はpendingのpoll応答まで進めた後、TTLの5/4だけ
  一度で進めます。期限超えをclientが判断して止め、追加のpollでserverに期限切れを言わせるcaseにはしません。
- OP-03はpendingが無いまま時計を進めます。通常requestのtimeoutは発火せず、接続は維持されます。生存確認の失敗は別入力です。

## expectedの欄

rootの`expected`は最後の観測、`observe.expected`はその途中の観測です。記載した行だけを比較します。例えばOP-08は終了後に
socketを閉じるかを決めないため、connectionの`state`を省き、送信数とpendingだけを比較します。

| 欄                 | 比較すること                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calls`            | `call`に対応するapplication操作の結果。`pending`、FASTの`queued`、`success`、`completion_unknown`、`not_sent`、`server_error`、`pairing_expired`を区別する |
| `connections`      | 接続ごとの状態、実際に送ったJSON-RPC数、未解決のwire request id。応答待ちの回収後は`pending_ids: []`                                                       |
| `connect_attempts` | このcaseで観測した接続開始数。初回接続も含む。OP-05のpolicy内部のretry回数は対象外                                                                         |
| `events`           | applicationへ知らせた意味。再接続、event loss、server／sessionの変更。言語固有のイベント名は要求しない                                                     |
| `flushes`          | flushを行った接続と、保証に含めてはいけない旧接続。前のflush後に再接続したことも利用者に分かるようにする                                                   |
| `negotiations`     | 接続ごとのclient側互換判定。成功形のhello resultでも再検査する                                                                                             |
| `epoch_states`     | 旧接続のhandleとcursorが使えなくなったこと。内部の削除方式やAPIの名前は固定しない                                                                          |
| `catalogs`         | 新しいhelloのhashと保持cacheのhashを照合し直した結果。不一致の古いcacheを適合と見なさない。実catalog本体の取得や正準化の検査とは別                         |

`calls.source`は判断元です。`completion_unknown`／`not_sent`／`pairing_expired`はclientで判断した失敗で、serverの`error`や
`reason`を付けません。`not_sent.cause`はfixtureが未送信の原因を分類するmetadataです。wire reasonや言語の例外名ではありません。
`pairing_expired.equivalent_to: "pair_expired"`も同じ意味と案内を求めるmetadataで、serverから来たreasonではありません。
`server_error`だけはserverが返した`error`を保ちます。FASTの`queued`は送信列へ登録した意味で、Minecraftでの設置成功とはしません。

## caseの対応と残る境界

| ID       | 対象                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------- |
| F1-OP-01 | 確立済みsocketのerrorで全pendingを完了不明にする（②）                                                   |
| F1-OP-02 | 最後の受信で待ち直すtimeout、pending回収、旧requestを再送しない（②③④）                                  |
| F1-OP-03 | `backpressure`でも自動再送しない（④）                                                                   |
| F1-OP-04 | 次の呼び出しで自動再接続し、成功確認済みdimension／originを戻す。未確定のsetterは復元・再送しない（④⑤） |
| F1-OP-05 | 再接続失敗後、request idを持たないapplication操作を未送信として返す（⑤A）                               |
| F1-OP-06 | FAST notification、旧接続と新flushの保証範囲、再接続の通知（⑤B）                                        |
| F1-OP-07 | 再helloでの非互換判定、後続commandを送らずcloseして未送信の失敗（⑤C、2026-11-12-01）                    |
| F1-OP-08 | clientが判断したpairing期限切れと、serverのerrorとの分離（⑧）                                           |
| F1-OP-09 | 再接続の`auth_required`では自動pairingを始めず停止（⑤D）                                                |
| F1-OP-10 | 結果を待たず重ねた二つの呼び出しが一つの再接続を共有（⑤Eの重なり）                                      |
| F1-OP-11 | epochの失効、event loss、server／session変更の通知、catalogHashの再照合（⑤C等）                         |
| F1-OP-12 | idleの生存確認が切断を見つけた後の状態管理と、次の呼び出しでの再接続（⑤Gの判定後）                      |

残したものと理由は次のとおりです。

- ⑤Eの実OS threadによる競合：OP-10は完了待ちの重なりを表しますが、入力の配列順だけではthreadのbarrierや全scheduler順を
  指定しません。consumerの並行実行testで確認する必要があります。
- ⑤Fのbackoffのばらつきと延長：共通の回数、上限、分布、増加式は批准されていません。jitterで個々の待ち時間が上下する場合に
  一律の単調増加を要求すると別のpolicyを作ります。選んだ言語のpolicyと乱数注入の境界に対する検査を別に返してもらう必要が
  あるため、このfixtureでは数値も判定式も固定しません。OP-05は待ち方を飛ばした失敗分類の検査です。
- ⑤Gの生存確認の詳細とWi-Fi切断への耐性：`liveness_lost`以前のprobe、transportごとの検出方法、長めに耐える長さはこのデータに
  含めません。OP-12は判定後の検査です。無通信だけを切断と見なす新しい規則にはしません。

owner testはschemaとデータの参照、送信数などを検査します。Client Libraryがこの入力を実行したこと、例外や再接続実装が合格したこと、
実serverとのF3の合格は別途確認します。
