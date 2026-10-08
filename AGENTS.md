# minecraft-remote-tooling

Protocol projection・共有fixture・WireScope・Bridgeの共通ownerです。人間可読SSOTはknowledge repositoryにあります。

## McRemote SSOT

McRemote固有の設計判断の正本はGitHub上の`Naohiro2g/mc-remote-knowledge`です。

McRemote固有文脈に依存する作業に入る前に、agentはそのSSOT repositoryの関連文書を必ず読んでください。対象には
architecture、protocol、deployment、contributor workflow、learning design、およびMcRemote固有の判断理由に依存する
挙動変更が含まれます。

最初に、knowledge repositoryのremote `main`から最新のdev agent runtime protocolだけを取得して指示として読んでください。
取得元file全体を会話へ出力してはいけません。

```bash
protocol_source="$(mktemp)"
knowledge_commit="$(gh api repos/Naohiro2g/mc-remote-knowledge/commits/main -q .sha)"
gh api "repos/Naohiro2g/mc-remote-knowledge/contents/00-hub/dev-repo-protocol_ja.md?ref=$knowledge_commit" \
  -q .content | base64 -d > "$protocol_source"
if [ "$(grep -Fxc '<!-- BEGIN: DEV-AGENT-RUNTIME -->' "$protocol_source")" -ne 1 ] || \
   [ "$(grep -Fxc '<!-- END: DEV-AGENT-RUNTIME -->' "$protocol_source")" -ne 1 ]; then
  echo "dev agent runtime marker missing or duplicated" >&2
  exit 1
fi
printf 'knowledge commit: %s\n' "$knowledge_commit"
awk '/^<!-- BEGIN: DEV-AGENT-RUNTIME -->$/{reading=1;next} \
     /^<!-- END: DEV-AGENT-RUNTIME -->$/{reading=0} \
     reading' "$protocol_source"
```

SSOT repositoryへアクセスできない場合は作業を止め、その旨を明示してください。このrepository単体、assistant memory、
過去会話、local推論から欠けた文脈を補完してはいけません。

このfileはSSOTを複製しません。複製はdriftを生みます。

- 関連spoke: `10-protocol/`、`15-wirescope/`

## Repository固有の指示

- 構成は`packages/protocol`、`packages/live`（WireScope）、`packages/bridge`。各packageは独立したprivate workspaceです。
- Protocolはdependency-free leafです。Scratch VM、GUIとBridgeはprotocol packageをruntimeでimportしません。
- 全体のinstallはrootで`npm ci`、buildは`npm run build`、testは`npm test`。TypeScript／Vite／Vitestを使います。
- bug修正は先に失敗するtestを追加し、既存の失敗の意味を保持します。型・定数・fixtureはknowledgeの批准済み契約から投影します。
- 公開b8のfixture 12件を変更しません。追加の契約caseは新しいfixtureで発行します。
- 公開Release manifestのschemaと共有fixtureはrootの`schemas/`です。wire Protocolとは別の契約で、
  consumerはBridge／WireScopeのlockと分けて固定します。owner testは`packages/protocol/test/`にあり、
  schema検査用のAjvはdev dependencyだけです。`schemas/README.md`の読み方と出典を参照してください。
- Scratch固有source、GUI／VM、McRemote handler、Python／Java Client APIは本repositoryへ移しません。
- npm publish、sharedへのdeploy、Git tag／Release公開は明示された指示でのみ行います。
- candidateはCIのworkflow artifactで返します。release用のWireScope ZIPとdetached manifestは対で扱います。
- BridgeのDocker build contextはrepository rootです。Dockerfileは`packages/bridge/Dockerfile`にあります。
- secret、private endpoint、credential、UUIDの実値をsource、fixture、logへ残しません。
