# E1：共有fixtureのカバレッジ

2026-11-06の返却。基準はtooling `21a2a9a0aed8b4d9c715da46616aad86f1174b4c` の
`packages/protocol/test/fixtures/` にあるJSON 10本。LICENSEはcaseに数えない。
fixtureの追加・変更は行っていない。

実読knowledgeは `8c81c0f115127189de117c3848d1e254f79571c9` の次の3文書。

- [Protocol Inventory](https://github.com/Naohiro2g/mc-remote-knowledge/blob/8c81c0f115127189de117c3848d1e254f79571c9/10-protocol/protocol-inventory_ja.md)
- [Phase E／F：E1とF1](https://github.com/Naohiro2g/mc-remote-knowledge/blob/8c81c0f115127189de117c3848d1e254f79571c9/10-protocol/polyglot-phase-ef-plan_ja.md)
- [API metadata](https://github.com/Naohiro2g/mc-remote-knowledge/blob/8c81c0f115127189de117c3848d1e254f79571c9/10-protocol/api-reference-metadata.json)

## 読み方

- 表の行と順序はInventoryに合わせた。metadataの32 method、authの5 method、methodでない能力の14行。
- 「部分」は、その行の値や一部の状態遷移だけを確かめるもの。methodの一覧に名前があることだけではcoverとしない。
- 「なし」は専用の入力・期待値がないこと。型の共通ベクトルがある場合は注記した。
- 10本はいずれも静的な入力と期待値。接続開始から終了までの送受信順を再生するscripted peerのcaseはない。
- protocol `23.2.1`が現行。旧版由来でも現行の契約に共通する値ベクトルは「継続利用」とした。
  これは全methodの互換や実機合格の主張ではない。
- `chat-event-compat-v23.2.json`と`entity-particle-v23.2.json`は、それぞれ`v23.2.1`があるため履歴。
  `spawn-v22.json`も履歴で、entity handleの期待値が旧形式`mceh_example`のまま。
- 以下のfile名はすべて`test/fixtures/`からの相対名。

## 1. 共有fixtureの列

### metadataのmethod（32行）

| method                    | 現行・継続利用のfixtureとcaseの範囲                                                                                                                                                   | 履歴のfixtureとcaseの範囲                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `hello`                   | 部分：`direction-lightning-v23.1.json`の`B7-A01`（permissions／build rangeのsnapshot）、`B7-A10`〜`A17`（online／offlineの認可）。完全なhello request／responseはなし                 | なし                                                                                                             |
| `connection.flush`        | なし                                                                                                                                                                                  | なし                                                                                                             |
| `build.setDimension`      | なし。共通のdimension値ベクトルは`dimensions-v22.json`にあるが、methodのparams／resultはない                                                                                          | なし                                                                                                             |
| `build.setOrigin`         | なし。`dimensions-v22.json`のbuild contextは2つの値例で、methodのcaseではない                                                                                                         | なし                                                                                                             |
| `world.setBlock`          | なし。`block-value-v22.json`にStateText／BlockValueの値ベクトルはあるが、座標を含むmethodのparams／resultはない                                                                       | なし                                                                                                             |
| `world.setBlocks`         | なし                                                                                                                                                                                  | なし                                                                                                             |
| `world.getBlock`          | なし。`block-value-v22.json`にBlockValue 2例はあるが、methodのparams／responseはない                                                                                                  | なし                                                                                                             |
| `world.getBlocks`         | なし                                                                                                                                                                                  | なし                                                                                                             |
| `world.getHeight`         | なし                                                                                                                                                                                  | なし                                                                                                             |
| `world.getSign`           | `sign-v23.json`の`B6-S03`（両面・4行・waxedの正準出力）、`B6-S07.not_a_sign`（拒否）。LineValueは`B6-S02`                                                                             | なし                                                                                                             |
| `world.setSign`           | `sign-v23.json`の`B6-S04`（両面の書込・null結果）、`B6-S06`の色拒否、`B6-S07.sign_update_failed`。LineSpec／正準化は`B6-S01`〜`S02`                                                   | なし                                                                                                             |
| `world.updateSignLine`    | `sign-v23.json`の`B6-S05`（1行PATCH）、`B6-S06`の個数・面・行番号・装飾の拒否、`B6-S07.sign_waxed`                                                                                    | なし                                                                                                             |
| `player.getPos`           | なし                                                                                                                                                                                  | なし                                                                                                             |
| `player.setPos`           | なし                                                                                                                                                                                  | なし                                                                                                             |
| `player.getPose`          | なし                                                                                                                                                                                  | なし                                                                                                             |
| `player.setPose`          | なし                                                                                                                                                                                  | なし                                                                                                             |
| `player.getDirection`     | `direction-lightning-v23.1.json`の`B7-D30`（正準出力）、`D32`（auth_required）。方向の正規化は`D01`〜`D14`、拒否値は`D20`〜`D27`                                                      | なし                                                                                                             |
| `player.setDirection`     | `direction-lightning-v23.1.json`の`B7-D31`（適用）、`D33`〜`D34`（offline／権限拒否）、`D38`（適用後の読取失敗）。共通方向ベクトルも使用                                              | なし                                                                                                             |
| `world.spawnEntity`       | なし                                                                                                                                                                                  | `spawn-v22.json`の`spawn_entity`（座標先行params、旧順序の拒否対象、旧形式handle）。現行handleの生成caseではない |
| `world.getNearbyEntities` | `entity-particle-v23.2.1.json`の`B8-N01`〜`N19`（範囲・順序・limit・拒否・work）、`B8-H01`〜`H07`（handleの原子的発行・再利用・rollback）                                             | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `entity.getPose`          | `entity-particle-v23.2.1.json`の`B8-E01`（read-only）、`E05`（未解決handle）、`E07`（外部dimension変更後の失効）                                                                      | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `entity.setPose`          | `entity-particle-v23.2.1.json`の`B8-E02`（dimension移動とhandle維持）、`E03`（teleport_failed）                                                                                       | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `entity.getDirection`     | `direction-lightning-v23.1.json`の`B7-D35`（正常）、`B7-H01`〜`H06`・`H10`〜`H11`（型・解決・terminal handle）。共通方向ベクトルも使用                                                | なし                                                                                                             |
| `entity.setDirection`     | `direction-lightning-v23.1.json`の`B7-D36`（適用）、`D37`（Paper例外）。共通方向ベクトル・handle条件も使用                                                                            | なし                                                                                                             |
| `entity.remove`           | `entity-particle-v23.2.1.json`の`B8-E04`（削除とhandle解放）、`E06`（初回unavailable→以後not found）                                                                                  | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `world.spawnParticle`     | `entity-particle-v23.2.1.json`の`B8-P01`〜`P26`（normal／typed data・receiver・force・拒否）、`direction-lightning-v23.1.json`の`B7-P01`〜`P06`（ParticleBuilder回帰）                | `entity-particle-v23.2.json`の`B8-P01`〜`P26`。`spawn-v22.json`のforce既定／falseと旧順序                        |
| `world.playSound`         | `entity-particle-v23.2.1.json`の`sound.cases`中、`method=world.playSound`のcase（`B8-S01`〜`S05`、`S11`〜`S17`、`S21`〜`S24`、`S28`〜`S32`、`S34`〜`S35`）。options・note・拒否・認可 | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `world.playBlockSound`    | `entity-particle-v23.2.1.json`の`B8-S06`〜`S10`、`S18`〜`S20`、`S25`〜`S27`、`S33`、`S36`〜`S37`。ブロック由来の音・no_block・options・拒否・認可                                     | `entity-particle-v23.2.json`の同じcase範囲                                                                       |
| `world.strikeLightning`   | `direction-lightning-v23.1.json`の`B7-L01`〜`L05`、`L10`、`L15`〜`L18`、`L20`〜`L27`、`L30`〜`L34`、`L40`〜`L42`、`L50`〜`L55`。座標・認可・range・rate・work・mode・Paper副作用      | なし                                                                                                             |
| `chat.post`               | `chat-event-compat-v23.2.1.json`の`B9-C01`〜`C07`。null結果の受理と、不正な結果の拒否                                                                                                 | `chat-event-compat-v23.2.json`の同じcase範囲                                                                     |
| `events.poll`             | `events-v23.json`のrequest正常2／拒否7・3種類のeventを含むbatch・旧event拒否。`chat-event-compat-v23.2.1.json`の`B9-E01`〜`E22`、`E23`〜`E26`（未知event・cursor・loss・後退拒否）    | `chat-event-compat-v23.2.json`の`B9-E01`〜`E26`                                                                  |
| `catalog.get`             | なし。`block-value-v22.json`の`catalog.block`は4 blockのStateText検査用データで、catalog.getの完全なresult／hashのcaseではない                                                        | なし                                                                                                             |

### auth節のmethod（5行）

| method                 | 現行・継続利用 | 履歴 |
| ---------------------- | -------------- | ---- |
| `auth.pairBegin`       | なし           | なし |
| `auth.pairPoll`        | なし           | なし |
| `auth.listCredentials` | なし           | なし |
| `auth.revoke`          | なし           | なし |
| `auth.logout`          | なし           | なし |

認可に関する`auth_required`／`permission_denied`の期待値があっても、auth method自身のwire契約やpairing手順をcoverしたとはしない。

### methodでない能力（14行）

| 能力                               | 現行・継続利用のfixtureとcaseの範囲                                                                                                                                                                                                                                     | 履歴                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TCPのframing／JSON-RPC             | なし。NDJSON byte列、分割・結合、完全なJSON-RPC envelopeのcaseはない                                                                                                                                                                                                    | なし                                               |
| WebSocket／browser                 | なし                                                                                                                                                                                                                                                                    | なし                                               |
| protocol negotiation               | なし。各fileのprotocol宣言は交渉caseではない                                                                                                                                                                                                                            | なし                                               |
| authentication／pairing            | 部分：`direction-lightning-v23.1.json`の`B7-A01`・`A10`〜`A17`、`D32`等の認可・auth_required。token取得とpairingの送受信はなし                                                                                                                                          | なし                                               |
| session credentialのUX             | なし。`direction-lightning-v23.1.json`のsession admissionはcredential保存・再利用・削除の操作ではない                                                                                                                                                                   | なし                                               |
| request／notification／flushと順序 | 部分：`direction-lightning-v23.1.json`の`B7-L01`／`L02`、`L40`〜`L42`のrequest／notificationとmode別失敗。flushのwire case、queueの順序付き対話はなし                                                                                                                   | なし                                               |
| events cursor／loss                | `events-v23.json`のpoll_result、`chat-event-compat-v23.2.1.json`の`B9-E01`〜`E26`。未知eventでのcursor前進、loss、sequence／counter後退の拒否                                                                                                                           | `chat-event-compat-v23.2.json`の同じ範囲           |
| error reason                       | 部分：`block-value-v22.json`のinvalid_state_text／error_text、`sign-v23.json`の`B6-S06`〜`S07`、`direction-lightning-v23.1.json`の拒否群、`entity-particle-v23.2.1.json`の拒否群。reason／dataとScratchのErrorTextの値例。完全なJSON-RPC error envelopeの共通対話はなし | `entity-particle-v23.2.json`の拒否群               |
| build context                      | 部分：`dimensions-v22.json`の正常4・非alias4・不正7とcontext 2例、`direction-lightning-v23.1.json`の`B7-A01`・`A30`〜`A32`、`events-v23.json`のevent dimension／origin。context変更methodの対話はなし                                                                   | なし                                               |
| BlockValue／BlockSpec              | 部分：`block-value-v22.json`の正常StateText 5・不正6・BlockValue 2。`events-v23.json`のblock値、`entity-particle-v23.2.1.json`のtyped block particle。値のencode／decodeはあるがsetBlock／getBlockのwire対話はなし                                                      | `entity-particle-v23.2.json`のtyped block particle |
| catalog／constants                 | 部分：`block-value-v22.json`の4 blockのcatalog例と`entity-particle-v23.2.1.json`の`B8-R01`〜`R15`（resource ID）。catalogHash照合・完全なcatalog・生成定数の検証はなし                                                                                                  | `entity-particle-v23.2.json`の`B8-R01`〜`R15`      |
| helloの`world_constants`           | なし                                                                                                                                                                                                                                                                    | なし                                               |
| epoch／reconnect                   | 部分：`direction-lightning-v23.1.json`の`B7-A20`〜`A23`・`A30`〜`A32`（session状態・reconnect後snapshot）、`B7-H10`〜`H11`と`entity-particle-v23.2.1.json`の`B8-E06`〜`E07`（handle失効）。新TCP・再helloの対話はなし                                                   | `entity-particle-v23.2.json`の`B8-E06`〜`E07`      |
| WireScopeのobserver                | 部分：`chat-event-compat-v23.2.1.json`の`event_batches.cases[].expected_observer`（未知eventの投影・skip等）。observer全schema・attach／grant／browser経路はなし                                                                                                        | `chat-event-compat-v23.2.json`の同じ範囲           |

## 2. fixtureごとの一覧

case数は入力と期待値を持つ検証ベクトルの数。配列長を無条件に足さず、enum、paramsの要素、宣言、参照用catalogは数えない。
IDのあるfileはIDを1件として数える。IDのない小さいfileは下の内訳を数えた。複数の検証を内包するcaseもあるので、test runnerのassertion数とは一致しない。

| file                             | 対象protocol                                     | case数と内訳                                                                                     | 確かめるもの                                                                                                                        | 現行か、履歴か                                                             |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `block-value-v22.json`           | 22系由来（fileの`version: 1`はfixture schema版） | 18：state_text 5＋invalid_state_text 6＋block_value 2＋error_textのknown／unknown 2＋malformed 3 | StateTextのencode／decode・型・正準順、BlockInfoText、Scratch ErrorText。catalogの4例は補助データ                                   | 現行に継続利用する値ベクトル。protocol 23.2.1のmethod対話ではない          |
| `dimensions-v22.json`            | 22.0.0                                           | 17：accepted_refs 4＋not_aliases 4＋invalid_refs 7＋build_context 2                              | namespace補完と正準DimensionKey、非alias、build contextの値。default_dimensionは宣言なので数えない                                  | 現行に継続利用                                                             |
| `direction-lightning-v23.1.json` | 23.1.0（session permissionの追補入り）           | 93：session 16＋方向31＋handle 8＋雷32＋particle回帰6                                            | permission／range snapshotと状態遷移、方向のserver正準出力・拒否、handle終端、雷の認可・負荷・副作用、ParticleBuilder               | 現行に継続利用                                                             |
| `entity-particle-v23.2.1.json`   | 23.2.1                                           | 111：nearby 19＋handle transaction 7＋entity 7＋particle 26＋sound 37＋resource ID 15            | 検索順・work、handle原子性、pose／remove、typed particle／receiver、音・note／pitch・拒否、resource ID正準化                        | 現行                                                                       |
| `entity-particle-v23.2.json`     | 23.2.0                                           | 111：現行fileと同じ内訳                                                                          | 同じ分野の旧protocolラベルのベクトル                                                                                                | 履歴。現行fileと分けて保持                                                 |
| `chat-event-compat-v23.2.1.json` | 23.2.1                                           | 33：chat_post 7＋event_batches 22＋stateful_rejections 4                                         | null結果のdecode、未知eventの受理／投影、cursor／lossと後退拒否                                                                     | 現行                                                                       |
| `chat-event-compat-v23.2.json`   | 23.2.0                                           | 33：現行fileと同じ内訳                                                                           | 同じ分野の旧protocolラベルのベクトル                                                                                                | 履歴。現行fileと分けて保持                                                 |
| `events-v23.json`                | 23.0.0                                           | 13：request正常2＋拒否7＋batch 1＋projectile target 2＋旧event拒否1                              | poll params、3種eventを含む正準batchとcursor／loss、hit target、旧block_right_clickの拒否。batch内の3 eventを別caseに重複計上しない | 現行に継続利用                                                             |
| `sign-v23.json`                  | 23.0.0                                           | 18：LineSpec 4＋LineValue 3＋get／set／update各1＋invalid_params 5＋errors 3（B6-S01〜S07の7群） | LineSpec encodeと正準LineValue decode、両面、装飾順、PATCH、拒否reason／data                                                        | 現行に継続利用                                                             |
| `spawn-v22.json`                 | 22.0.0                                           | 5：particle正常2＋旧順序1、entity正常1＋旧順序1                                                  | 座標先行paramsとforce。entity結果は旧handle形式                                                                                     | 履歴。particleの一部形状は共通でも、現行spawnEntity全体のfixtureとはしない |

IDのある現行3本は次の範囲で再集計できる。

- direction：`B7-A01`、`A10`〜`A17`、`A20`〜`A23`、`A30`〜`A32`の16、`direction.*`の31、`handles.*`の8、`lightning.*`の32、`B7-P01`〜`P06`の6。
- entity：`B8-N01`〜`N19`、`H01`〜`H07`、`E01`〜`E07`、`P01`〜`P26`、`S01`〜`S37`、`R01`〜`R15`。
- chat：`B9-C01`〜`C07`、`B9-E01`〜`E26`。

## 3. F1の不足と追加案

既存の10本だけで、新しいclientをhelloからsetBlock／getBlockまで独立に作れるとはしない。
DTO・正準化・reasonの一部は再利用できるが、最初の接続を成立させるwire対話が不足している。

| F1の範囲                       | 今あるもの                                                      | 足りないもの                                                                                                                  | 追加するなら、という案                                                                             |
| ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| framing                        | なし                                                            | UTF-8のNDJSON、分割受信、複数行の結合受信、未完の末尾、JSON-RPCのid対応                                                       | 入出力byte chunkと期待frame列。1行1messageと分割位置を固定したデータ                               |
| hello／negotiation             | permission／rangeのsnapshot・認可モデルだけ                     | helloの完全なparams／result、protocol一致／不一致、major不一致・server minor不足・patchの扱い、`protocol_mismatch`のerror外枠 | client→hello→peerの正常／拒否response→closeを含むscripted peerのデータ                             |
| authentication／pairing        | auth_required等のreasonとsession admissionだけ                  | pairBegin→Minecraft承認相当→pairPoll→token付きhello、pending／期限切れ・拒否、token再利用の対話                               | 正常とpending／拒否を分けた順序付き対話。固定したfixture用tokenを使い、実credentialは使わない      |
| world.setBlock／world.getBlock | StateText／BlockValueの値ベクトル、catalogの4例                 | idと座標・stateを含むrequest、getの完全なresponse、既定stateと明示state、正準化、失敗時に値や副作用を取り違えないこと         | 既存BlockValueベクトルを参照するset→getの対話。namespace・typed state・不正stateの正常／拒否を追加 |
| error reasonの形               | method別のreason／data、Scratch ErrorTextの既知／未知reason処理 | JSON-RPC errorの`code`／`message`／`data.reason`を含む外枠、requestとの対応、未知reasonを保つ共通例                           | 同じerror envelopeを各clientでdecodeするデータ。methodごとの全reason網羅とは分ける                 |
| close                          | session移行・handle終端・mode別失敗の状態モデルだけ             | EOF、途中行でのEOF、接続失敗、未完了requestの終了、新接続での再helloというtransport lifecycle                                 | 正常closeと未完request中closeのscripted peer。自動再送の採否をfixture側で新しく決めない            |

以上は追加案であり、F1の仕様や新しいwire契約を確定していない。新しいfixture、共通runner、実装、Releaseはこの返却では作っていない。
