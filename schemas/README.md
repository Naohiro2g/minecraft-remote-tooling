# 公開Release manifestの契約

wire protocolとは別の、公開成果物のmetadataを検査する契約です。正本はknowledge
`6a7020d5199a6aa957c5ce43904916f2166a6b95`の`00-hub/release-gate-notes_ja.md`、b10「release manifest v2の形」
（`2026-10-07-09`、2026-10-08「宣言fileの形」の追記を含む）です。

| File                                       | 用途                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `release-manifest-v2.schema.json`          | Draft 2020-12のv2 schema                                               |
| `fixtures/release-manifest-v2.json`        | v1の互換性とv2の受入・拒否を確かめる共有fixture（85 case）             |
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
宣言fileのrootは次のobjectです。

```json
{
  "schema": "mc-remote.minecraft-targets",
  "schema_version": 1,
  "minecraft_versions": ["1.21.11", "26.2"]
}
```

この3 fieldを必須とし、知らないfield、裸の配列、異なる`schema`／`schema_version`を拒否します。
`minecraft_versions`は空でなく重複の無い配列で、各要素は空でない文字列です。形が不正な宣言は
`declaration_content_invalid`、正しい形でもmanifestの版の集合と違えば`declaration_versions_mismatch`とします。
版の順序は問いません。JSONを再serializeしたhashではなく、fixtureにあるraw bytesのhashを使い、
JAR内の宣言との比較もraw bytesで行います。
reference実装の`checkManifestContents`は、渡されたartifactの本体だけを検査します。compatibilityの宣言と全recordは
必須です。公開時に必要な全assetを収集する責務や、JARから宣言を抽出する責務は呼び出し側にあります。

fixtureは受入10 case・拒否75 caseです。`v2.mcremote-actual-declaration`だけは、
`Naohiro2g/McRemote@bd1ce15d90dc14dc59b23441df8677bed021a897`の`release/minecraft-targets.json`をraw bytesのまま使います。
出典とbytesは`declaration_file_source`に記録し、SHA-256は
`a202a11a104767c289266f4baf7692d499ed15b717dd4d5a31eca48abc17ca26`です。このcaseの`jar_declaration`も同じ宣言の
bytesを使いますが、実JARから抽出した証拠ではありません。

それ以外のcontentsと、全caseのmanifest、Paper build、runtime、verificationのPASSは検査用の合成値です。
実機試験の結果や公開candidateのidentityを表しません。artifactの選択はconsumerが用途に応じて行い、単一roleは件数とkind、
変種は明示したos／archを検査します。

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
