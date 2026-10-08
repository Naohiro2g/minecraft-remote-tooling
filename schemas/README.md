# 公開Release manifestの契約

wire protocolとは別の、公開成果物のmetadataを検査する契約です。正本はknowledge
`6dbb9f1ee192c6c46d8dd58fdd91f8e6c3f46de5`の`00-hub/release-gate-notes_ja.md`、b10「release manifest v2の形」
（`2026-10-07-09`）です。

| File                                       | 用途                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `release-manifest-v2.schema.json`          | Draft 2020-12のv2 schema                                               |
| `fixtures/release-manifest-v2.json`        | v1の互換性とv2の受入・拒否を確かめる共有fixture（66 case）             |
| `release-manifest-checks.mjs`              | schemaの後に行う、文書全体と参照先のbytesを検査するNode用reference実装 |
| `release-manifest-checks.d.mts`            | reference実装の呼び出し型                                              |
| `fixtures/release-manifest-v1.schema.json` | v1回帰試験用の固定schema。v1の仕様変更ではありません                   |

producerとconsumerは、同じGit commitのschemaとfixtureを、path、bytes、SHA-256を持つ専用lockで固定します。
Bridge／WireScopeの生成物のlockと分け、実行時にremoteの`main`を取得しません。

## Fixtureの読み方

fixture自身の`schema`は`mc-remote.release-manifest.fixtures`、`schema_version`は`1`です。
`cases[]`の`id`をcaseの識別子とし、`manifest`が検査対象、`expected.valid`が判定です。
拒否caseの`expected.stage`は`version`、`schema`、`semantic`、`content`のどの検査で拒否するかを示し、
`expected.reason`はその理由を比較するための識別子です。これらはwireのerror reasonではありません。

1. `manifest.schema_version`に対応する固定schemaを選ぶ。未知versionを拒否し、不正なv2をv1で読み直さない。
2. 文書全体をschemaで検査する。schemaでの拒否理由は共通の`schema_invalid`とする。
3. 鍵の重複、role内の変種の混在、宣言とverificationの集合、JARのhash、recordの参照を検査する。
4. `contents`があるcaseは参照先のraw UTF-8文字列をbytesとして扱い、hashと長さも検査する。
   `jar_declaration`があるcaseでは、JARに同梱した宣言に見立てたbytesとの一致も検査する。

`contents`のkeyは、宣言ならproducer repoの相対path、assetなら同じReleaseのbasenameです。
宣言fileはMinecraft版のJSON配列です。JSONを再serializeしたhashではなく、fixtureにあるraw bytesのhashを使います。
reference実装の`checkManifestContents`は、渡されたartifactの本体だけを検査します。compatibilityの宣言と全recordは
必須です。公開時に必要な全assetを収集する責務や、JARから宣言を抽出する責務は呼び出し側にあります。

fixtureのcommit、版、Paper build、runtime、hash、PASSは全て検査用の合成値です。実機試験の結果や公開candidateの
identityを表しません。artifactの選択はconsumerが用途に応じて行い、単一roleは件数とkind、変種は明示したos／archを検査します。

## Owner test

```sh
npm test --workspace=@mc-remote/protocol
```

`packages/protocol/test/release-manifest-owner-fixture.test.ts`で全caseを検査します。
Ajvはtest用のdev dependencyで、wire Protocolのruntimeには依存を追加しません。

## v1 schemaの出典

`fixtures/release-manifest-v1.schema.json`は`Naohiro2g/mc-remote-stack`の
`f9b558769375cf704e3bf55c6aa3db93bb2aa3cf`、
`src/mc_remote_stack/data/schemas/release-manifest.schema.json`からbytesのまま収容しました。
出典のSHA-256はfixtureの`legacy_v1_schema_source.sha256`に記録しています。
MIT Licenseの本文とcopyrightは同directoryの`STACK-LICENSE`に保持しています。
