# F1 E2の追加案

この文書はtoolingの返却に含める追加案です。下記のcaseやfieldはまだfixtureに入れていません。
期待するclientの振る舞いは決定2026-11-11-01で批准済みであり、ここで提案するのはその検査データの表し方です。

## 読んだ根拠

- knowledge commit：`562b5c008c7a4e391f04a79ed4496bbd44670896`
- [依頼票](https://github.com/Naohiro2g/mc-remote-knowledge/blob/562b5c008c7a4e391f04a79ed4496bbd44670896/00-hub/polyglot-f1-e2-fixture-instructions_ja.md)
- 同commitのDECISIONS `2026-11-11-01`、`2026-08-30-03`、wire §3.4／§6.5、versioning §8.2／§8.3
- 変更前tooling：`131f3153d7ab0b01b6e00a62a8249a55c8fc2ad0`

## 今回入れた期待値

CL-03／CL-05は、`unanswered_ids: [2]`を残し、`local_failures: [{ id: 2, outcome: "completion_unknown" }]`と
`pending_ids: []`を足しました。応答が無いという観測と、clientが待機を失敗として終えた結果を分けるためです。
`unanswered_ids`の意味だけを変えると、既存consumerの単なる未応答の検査を、失敗の完了まで検査したものと誤読できます。
`local_failures`はwireではなく期待値のmetadataで、schemaは`id`と`outcome`以外を許さず、serverのcode／reasonを入れません。
例外型・名前・error messageは要求しません。今回はこの2caseだけが使うため、接続名や未送信などの別のoutcomeは足していません。

AU-07では、専用の承認拒否応答が無いことを`unresolved`から、決定①に従うpeerの前提へ移しました。
AU-08はtoken破棄→tokenなしhello→`auth_required`→pairing→hello成功、AU-09はtokenなしhello成功でpairing無し、
AU-10はpairing後のhelloで再び認証拒否され、失敗をapplicationへ返して終了する対話です。
`pairing_attempts`で接続試行全体の`auth.pairBegin`送信回数を示し、TCPの張り直しを二度目のpairingの許可と取り違えないようにします。
`discard_token`は拒まれたtokenの破棄なので、AU-08では新しく取得した`token`と両立します。

## 追加案の返却

依頼票が「足すかは、案を返す」とした項は、すべて今回のfixtureには足していません。追加する範囲と観測の形を先に合わせるためです。
case IDも未採番です。下表のfieldやopの呼び名は案で、schemaには加えていません。

| 対象                             | 足す案と合格の観測                                                                                                                                             | 今のsteps／expectedで表せること・足りないこと                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ③最後の受信からのtimeout         | 応答待ちを残し、途中の受信で待ち時間が延びることと、最後の受信からclientで設定した期限に達したとき、全pendingが完了不明になり接続が閉じることを別caseにする    | `advance_time`は整数millisecondsだけなので、言語ごとの期限に対する境界を指定できない。consumerの仮想時計とtimeout設定を関連付け、期限直前／到達を表す相対的な時計操作が必要。値をfixtureで固定しない。生存確認と応答待ちのtimeoutは分ける                                      |
| ④自動で再送しない                | `backpressure`応答後、および応答が無いまま切断／timeoutした後に同じ操作が自動送信されないこと。applicationが再度呼んだ操作とは区別する                         | 応答は`peer_send`、切断は`peer_eof`、完了不明は`local_failures`で表せる。送信しないことを検査する観測区間と送信数、applicationの再呼び出しを表す操作が無い。後続の再接続caseでも、旧requestの自動再送を検出する                                                                |
| ⑤次の呼び出しとbuildの復元       | 成功したdimension／originを持つ接続が切れ、次のapplication呼び出しにより新接続のhelloの`build`が戻る。成功を確認できなかったbuild変更は復元値にしない          | 複数の`connect`と`client_send`でwire自体は表せるが、今の`connect`だけでは自動と明示の再接続を区別できない。application呼び出しの入力と、接続／送信をその結果として観測する操作が必要                                                                                           |
| ⑤つなぎ直せなかった呼び出し      | 接続の失敗でapplicationの命令を送らなかったことを「未送信」として返す                                                                                          | `connect_error`は表せるが、その前のapplication呼び出しの識別子と、request idをまだ持たない呼び出しのlocalな結果が必要。送信済みidの`completion_unknown`を流用しない                                                                                                            |
| ⑤旧FASTと新flush                 | c1でFAST notificationを送り切断。次の呼び出しでc2のhelloを経てflushが成功しても、c1での設置まで完了したと知らせない                                            | notificationはJSON-RPCの値として表せるが、v1 schemaのmessageはid付きrequest／result／errorだけ。notification、applicationへの再接続の通知、接続ごとのflush保証範囲の期待値が必要。wireのflush result自体にfieldを足さない                                                      |
| ⑤再helloでの非互換               | c1では互換、切断後のc2のhello resultは非互換。次の命令は送らずapplicationへ失敗を返す                                                                          | wireの対話と`compatible: false`は表せる。どの接続の互換判定か、次のapplication呼び出しが未送信で失敗したことを区別する期待値が必要。同様に`catalogHash`の再照合、server／sessionの変更通知も後続の案に含める                                                                   |
| ⑧clientが判断したpairing期限切れ | `expires_in`を過ぎたとclientが判断し、追加のpollを送らず止める。serverの`pair_expired`と同じ案内の意味を持つが、判断元はclientでserverのcode／reasonを作らない | `advance_time`でpeerが示したTTLを超えることは表せる。localなpairing終了の意味と判断元を表す期待値が必要。request idが無い終了を、`local_failures`やserver由来の`reason`へ押し込まない。AU-02はserverが期限切れを返す経路として維持する                                         |
| client側の互換判定後のclose      | 成功形のhello resultを受けた後clientが非互換と判定し、利用可能な接続として残さず閉じるcaseを提案する                                                           | `client_close`と`connection: closed`で物理closeは表せる。versioning §8.3の「接続を拒否」と決定⑤Cの「黙って続けずに失敗」から、セッションを使用しないことは読める。一方、clientが行う物理closeの必須性と時機は直接書かれていない。追加前にその点の明文化をcoordinatorへ確認する |

⑤のA〜G全体では、entity handle／event cursorの失効、event loss通知、`auth_required`なら自動pairingを始めず停止、
複数スレッドの呼び出しを一回の再接続へまとめること、待ち時間のばらつきと延長、idle時の切断検知も検査が必要です。
wireだけの対話ではapplicationへの通知や並行実行の契機を表し切れないため、上表のapplication操作・観測と合わせて別途設計します。
ここで固定したtest runnerや言語共通の例外型を配ることは提案していません。

## 今回変更しない既存caseと不足

CL-03の末尾はJSON自体が途中です。「JSONは閉じているがLFが無いままEOF」はFR-05のLF待ちとCL-03のEOF回収を合わせた
別caseがあると明確です。FR-05とCL-03を自動で合成した試験にはなりません。socket errorやclient自身のclose時のpending回収も、
現在のclose caseでは直接検査していません。新しいcase／opの範囲を相談する入力として返し、今回ほかのcaseは変えていません。

fixtureのowner testは、JSON schema、参照、今回の期待値と認証フローのデータを検査します。各Client Libraryが対話を実行したこと、
その例外や待機方針が合っていること、実serverとのF3の合格は、このtestの合格からは主張しません。
