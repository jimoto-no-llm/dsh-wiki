# dsh-code-review skill の保守ガイド

## 目的

`dsh-code-review` skill を現状に保つ、担当オペレータのための workflow を確認する。skill の更新は、単一の指定オペレータが私有の定期メンテナンス tool で運用し、小さな定期的 PR として届く。one-off audit による一回限りの見直しではなく小さな定期的 PR として届く仕組みで、この cookbook はそのオペレータの入口であり、後任への引き継ぎ者、そして「skill の更新が小さな定期的 PR として届く理由」を知りたい contributor のための説明でもある。workflow 自体は human-review skill-maintenance Agent Note が specification とする。

## 前提

- skill 更新を運用するオペレータの役割（または受け継ぐ予定の人）であること。workflow は単一オペレータ前提で、その仕組みは原則 1 台の machine 上に置かれる。
- tool は私有 infra としてこの repository の外に置かれていること。tool source・reviewer adapter・provider credential・scheduler は repository 外で、この cookbook と Agent Note は workflow が保証する **内容** を記述し、**実装方法** は私有 infra の領分とする。
- 新任オペレータであれば Agent Note の `## Proposal` section が構築対象の specification であることを理解していること。

## 手順

### メンテナランが生み出すもの

オペレータは wrapper を手動で起動する。日常運用は 2 UTC日分の overlap 付き window で、復旧用の週次手動 run は 7日 window を使う。各 run は:

1. 選択 window 内で merge された PR を対象にする（日常 cadence の既定は 2 UTC日、週次は 7日）。merge commit が `origin/master` から遡れる PR が対象となる。merge commit が遡れない PR（親が squash された stacked branch）や 250-commit acquisition cap を超える PR は run を中止せず `skipped-pulls.json` に記録して skip する。
2. merge 前の human review feedback を commit anchor 付きで収集し（inline comment と review submission）、feedback 時点と最終 landed の PR patch を比較する。PR conversation comment は取得しない。現行 GitHub の状態では feedback 時点の force-push-safe な baseline がとれないためである。target branch 専用の変更は採用 evidence から除外する。
3. 独立に設定された 2 つの reviewer adapter が、各 item を書いた者と変更が採用したかを分類し、agreed-adopted item を現行 skill に対して分類する。
4. primary adapter が完全な改訂版 `SKILL.md` を draft し、両 adapter が同一 diff を review する。blocking finding は両方が承認するまで loop する。
5. 候補に対して `pnpm run doc-sync` と `pnpm run lint` が通り、tool が success と宣言する。

各 run の artifact はオペレータの machine に保存される。保存 diff・候補 `SKILL.md`・promotion manifest は timestamp 名で `~/dsh-code-review-outputs/` 配下に置かれる。manifest は source の master commit と skill blob・source の feedback ID と URL・landed evidence range・adapter verdict・gate result を記録する。adapter 生 I/O は私有 temp directory に残り、その path は通知と `~/Library/Logs/dsh-code-review-maintainer/` 配下の daily log に書かれる。メンテナ worktree 自体は毎 run の後に clean に restore され、オペレータがメンテナ用副本をその場で編集したくなるのを防ぐ。

### 候補 diff を処理する

run が候補を生むと、macOS 通知に `dsh-code-review-promote ＼timestamp］` の hint が届く。

1. **diff をそれ自体で読む。** 「reviewer が承認したから」を理由にしない。maintainer の契約はオペレータが最終決定をすることである。checklist の bloat・history 的 prose・単一事例からの無根拠な外挿・既存 skill や authoritative doc との重複 coverage を探す。

   ```sh
   ls ~/dsh-code-review-outputs/                            # 今までに生まれた候補の全リスト
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.diff
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.SKILL.md
   less ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.manifest.json
   ```

2. **run artifact と突き合わせる。** promotion manifest は各 proposed rule を source feedback と landed evidence に mapping する。adapter 単位の詳細 I/O・consensus・採用 evidence は run の私有 temp directory 配下にある（path は log 参照）。最低 1 件は spot check する。リンクされた human comment は本当に追加 rule を裏付けるか。リンクされた PR は本当にそれを採用したか。

3. **3 つのうち 1 つを決める。**
   - **Discard（破棄）。** 保存候補を削除する。tool は次の run で、その時点の現行 skill の元で同じ feedback を再考する。

     ```sh
     rm ~/dsh-code-review-outputs/2026-07-16T02-00-00Z.{diff,SKILL.md,manifest.json}
     ```

   - **Batch（保留）。** 更新が小さく将来の追加とまとめられるなら候補を温存する。source-skill check は継続する。先に `master` が進んだ場合は分析を rerun するか、diff を手動 rebase・再 review する。
   - **Promote（昇進）。** repository の clean な `master` checkout から promote helper を走らせる。helper は `master` を refresh し、現行 skill が記録済み source blob と一致することを検証し、保存 diff を適用し、source feedback の URL または ID・landed commit 範囲・originating run・check・operator 編集を列挙した body 付き draft PR を開く。skill が drift していたら新しい guidance を上書きせず停止する。その後もオペレータが GitHub 上で PR を review し、merge か close を選ぶ。

     ```sh
     cd ~/path/to/deepseek-harness   # clean master
     dsh-code-review-promote 2026-07-16T02-00-00Z
     ```

4. **adapter 出力を verbatim で commit しない。** promotion 中の小さな手編集——文言の締め付け、source PR の文脈がないと意味が通じない例の削除、rule の既存のものへの統合——は期待されており、workflow が依存する「reviewer 判断」を保つ。merge 前に branch を amend する。

## 注意

- **候補が生まれない run は異常ではない。** 非空の各分類 stage から最低 1 件の妥当な adapter result が出ている限り、候補なしは common な事案である。tool は daily log に「no candidate」を記録し、通知を送らず（alert fatigue 回避）、先へ進む。skill 更新がない日は workflow が正しく動いている姿であって停滞ではない。
- **daily run を欠した日。** 2日分の overlap window なら 1 日の欠落は自動的に回収できる。それより長い gap は `DSH_CODE_REVIEW_SINCE=＼Nd］` で wrapper を手動 run して復旧する。重複 window は冪等で、既に現行 skill にある guidance は `covered` 分類され、候補として再入しない。
- **adapter provider の障害。** 2 つの reviewer command が byte 等価な executable に解決したら tool は run を拒否する。schema・ID validation に失敗した adapter 返答を含む batch は fail closed（batch 全 item を unclear 扱い）で run は続行し、debug 用に raw 出力は保存される。いずれかの adapter が operation 中のどの非空 batch でも妥当な result を出せなかったら、run は失敗として失敗 record を書きオペレータへ通知する。provider 全滅を「no candidate」に落とすことはない。
- **後任への引き継ぎ。** 現行の Agent Note を supersede する follow-up Agent Note を開く: 仕組みを repository 内へ移すか、新しいオペレータの私有 setup を記録する。tool を黙って渡さない。Agent Note の Risks section にある「single-maintainer bus factor」ゆえに、引き継ぎは文書化された決定を要する。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/maintaining-dsh-code-review.md>
