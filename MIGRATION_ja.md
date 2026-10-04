# b9共通tooling移管

- 批准: knowledge `900f6f4b8027d265a62ba7f139d4f3b1bbe78100`、DECISIONS `2026-10-05-01`／`2026-10-05-02`
- 移管元: `Naohiro2g/scratch-editor@c7505c887c5c71a942d9f1f190b32a5da00544bc`（契約2件とWireScope列幅を入れたdevelop）
- `mc-remote/protocol` → `packages/protocol`
- `mc-remote/live` → `packages/live`
- `mc-remote/bridge` → `packages/bridge`
- 公開b8の基線: `691576f60b7f0824e1753bd6823901d01fbe2422`のfixture 12件。追加fixtureは`chat-event-compat-v23.2.json`（33 case）です。
- 旧bootstrapのhistoryは保持し、古いpark snapshotを現在のsourceとして使いません。
- fixtureのbytesは維持します。配布物の比較は、同じ機能版のZIP内assetのbytesで行います。sourceの記録とOCI metadataは移管で変わります。
- ScratchはGUI／VM、固有source、product/runtime contractを保持します。新ownerのfixtureとWireScope・Bridge成果物を固定identityで取得します。
- rollbackは公開b8のScratch sourceとRelease setへ戻します。b8のtag／history／成果物を変更しません。

これはsource importの記録です。各consumerの切り替えと横断gateの完了はknowledge coordinatorが記録します。
