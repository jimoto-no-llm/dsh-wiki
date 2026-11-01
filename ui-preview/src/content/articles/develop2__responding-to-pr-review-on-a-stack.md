---
title: "依存 stack PR チェーンをまたぐ review 対応ガイド"
desc: "依存した PR stack（A ← B ← C …）の複数 PR に review comment が付いたとき、fix をどの PR に置き、どう stack 全体へ伝播させるか"
cat: "develop2"
catLabel: "レビュー"
chars: 3041
slug: "develop2/responding-to-pr-review-on-a-stack"
---

# 依存 stack PR チェーンをまたぐ review 対応ガイド

## 目的

依存した PR stack（`A ← B ← C …`）の複数 PR に review comment が付いたとき、fix をどの PR に置き、どう stack 全体へ伝播させるかを確認する。

chain は GitHub の公式 stacked-PR 機構で連結して維持する。fix の配置と伝播は本ガイドの所管であり、linkage check と landing は dsh-merging-stacked-prs skill の所管と分業する。

## 前提

- stack の連結状態が GitHub の公式機構に認められていること。base branch は期待する依存順序を示すだけなので、公式 stack として実在するかは `PullRequest.stack` と `stackEntry.position` の有無で証明する。branch の親子関係が揃っていることだけでは、これらの field の確認なしに official stack と扱わない。

- PR branch ごとに専用の worktree があること。各 PR の fix はその PR 自身の worktree で行い、並行して進める fix どうしが 1 つの checkout を共有しない。

- fix を委譲する場合、sub-agent の報告は意図の説明であって、実際に載った内容そのものではないという前提で確認する（trust-but-verify）。

## 手順

1. **動く前に comment を妥当性判断する。** すべての review comment を merit で triage し、code 照合で主張を検証する。reviewer が symptom を正しく指摘しても、cause の診断は誤っていることがある。

2. **受け入れた finding を発端 PR に配置する。** PR `B` の comment が `B` が導入した code を指すなら、fix は `B` に載せ、その修正済み `B` を `C` へ伝播する。ファイルが `C` にも含まれていても配置先は `B` である。fix を下流側（child）で発端にすると、`B` は未修正の code を ship したままになり、`B` の reviewer から fix が隠れてしまう。

3. **修正済み layer を順に上流へ伝播する。**

   - **Merge-forward:** 修正済みの親 branch を子 branch に merge し、子を validate してから上へ進む。進行中の checkpoint は保持する。
   - **Native cascading rebase:** `gh stack rebase` で書き換えた layer を validate し、`gh stack push` で publish する。あるいは `gh stack sync` を使う。sync は先に publish する場合があるため、sync の直後に dsh-pre-push-checks に従ってすぐ validate する。

4. **委譲 fix は trust-but-verify で確認する。** sub-agent の報告は意図を述べるものであり、実際に載った内容とは限らない。実際の tree 上で gate を自分で再実行する。

   regression guard の場合は、未修正 code で FAIL することを証明する（regression を差し込み赤を確認してから戻す）。どちらの code でも通る guard は何も守っていない。

   sub-agent が問題を「既に処理済み」と表現し直してきたら、自分で深入りして確認する合図である。

5. **review thread 内で返信する。** top-level comment ではなく、reply API で返す:

   ```sh
   gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies
   ```

   返信には fix 内容と、それを運ぶ現行の commit または head を明記する。

6. **rewritten push の後は状態を確認し直す。** 未解決 thread・approval・mergeability・check を再 audit する。force-push で変わった commit OID や古い inline anchor は、該当 finding が解決済みである証拠と見なさない。

7. **landing は公式 stack 手順による。** PR が未連結のとき、landing skill は同一 author の chain を自動で連結し、author が混在する場合は連結前に確認を取り、native stack support が使えない場合は hard-stop する。

## 検証

- 修正した各 PR の現在 diff に、発端 layer に相当する意図した修正が含まれていること。
- GraphQL 上で official stack が 1 本、期待どおりの順序で報告されること。child の parent に対する diff に、その child 自身の変更しか含まれていないこと。
- rewritten push のたびに、未解決 thread・approval・mergeability・check を再 audit したこと。
- 関係する gate が stack の先頭の PR だけでなく、影響を受けるすべての PR で通ること。

## 注意

- 各 review fix は独立した 1 commit とする。後続の rebase で OID は変わることがあるが、review 済み fix を branch history から amend で消さない。amend してよいのは自作の、未 push・未 review の作業に限る。
- merge-forward と rebase は review 後にどちらも許される履歴であり、選択は意図して行う。書き換えを伴う push は lease-protected とする。競合で先に進んだ remote head が見つかったら上書きせず中断する。raw な `--force` は禁止である。
- 連結の確認と landing の詳細手順は dsh-merging-stacked-prs skill が、push 前の validate は dsh-pre-push-checks skill が規定する。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/responding-to-pr-review-on-a-stack.md>
