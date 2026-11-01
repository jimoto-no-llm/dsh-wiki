---
title: "persistence 型変更 review ガイド"
desc: "宣言済み Session persistence 型を contributor checkout で変更した後、開いた PR の前にローカルで 生成・承認・検証する。bilingu"
cat: "develop"
catLabel: "開発ガイド"
chars: 5496
slug: "develop/reviewing-persistence-type-changes"
---

# persistence 型変更 review ガイド

## 目的

宣言済み Session persistence 型を contributor checkout で変更した後、開いた PR の前にローカルで 生成・承認・検証する。bilingual の互換性説明を用意し、1 コマンドに変更の分類と record 生成を任せる。所管の record reference がファイルと自動ルールを説明する。比較入力はすべて checkout にあり、base branch も network も不要。

## 前提

- dependencies install済みの contributor checkout があること。
- accepted baseline（session-format-status の finalization record）を把握し、locked record を保全していること。
- reader 両方向（前方・後方）を compatibility rules で評価する心構え。構造差は安全な解釈／拒否の evidence があれば同バージョンで残せる。上位 writer version 自動要求ではない。

## 手順

### 任意: 変更を把握する

record 前の preview として repository root から:

```sh
pnpm --silent run verify-persistence-changes --json
```

JSON を消費するときは `--silent` を使う（pnpm は lifecycle 失敗 text を stdout に付ける）。失敗コマンドも exit code 1。報告された root・path・change kind・compatibility-review 要求を読む。参照された型は複数の event digest に影響しうるので、影響 root 全部を調べ、history が新 schema を覆うまで検証は失敗する。stale な生成 inventory も検証失敗（record コマンドが refresh する）。field・union alternative の並べ替えで `changes` が空なら `pnpm run gen-persistence-catalog` を実行して再チェック。digest 不変なら、宣言の複製や source location による catalog diff があっても新たな承認は不要。

PR を acknowledgement history と独立に review するには、base/head の inventory をローカル JSON に保存して:

```sh
pnpm --silent run persistence-review --before .artifacts/base.schema.json --after docs/persistence-schema.json
```

record 済み decision もこの比較から transition は隠れない。`--check` は現行 source と承認済み history の比較のみで、record 後には base/head review の代用にも human review の証明にもならない。その 2 ファイルを供給する commit を報告に記録する。読み取り専用のこの比較は共有変更を影響 root と group 化し、union 位置でなく literal な `kind`/`form` を使う。曖昧な alternative は独立の追加・除去のまま。`--json` で構造化出力。

### 1. 変更を記録する

`en`／`zh` それぞれに `summary`・`compatibility`・`verification` 文字列を持つローカル JSON を書く。以下は exercised な required-to-optional hook audit field 変更の入力例で、説明と test evidence は自分の変更の実態に差し替える（CLI はこれらの主張を確立しない）。

`.artifacts/persistence-change.prose.json`（ignore ディレクトリ。なければ作る）に保存:

```json
{
  "en": {
    "summary": "Makes the persisted hook audit decision optional.",
    "compatibility": "Existing records remain valid. Hook execution consumes HookOutput instead of replaying this audit field. Producers still write decisions, and absence does not imply pass.",
    "verification": "pnpm exec vitest run packages/experimental/hook-protocol/tests/events.spec.ts: 10 tests passed."
  },
  "zh": {
    "summary": "将持久化的钩子审计决策改为可选。",
    "compatibility": "已有记录仍然有效。钩子执行消费 HookOutput，不回放此审计字段。写入方仍然记录决策，缺失不代表 pass。",
    "verification": "pnpm exec vitest run packages/experimental/hook-protocol/tests/events.spec.ts：10 个测试通过。"
  }
}
```

日付と説明的 slug を id に使って:

```sh
pnpm --silent run persistence-changes --record 2026-09-11-poc-optional --prose .artifacts/persistence-change.prose.json --json
```

このコマンドは history と paired prose を validate し、確立済み same-version decision を推論し、明示 compatibility decision を check してから書く。record pair（schemas・両 catalog・machine inventory・pairing records 完了版）を生成する。commit 前 に説明と返り値の `changes`・`roots`・`files` を review する。`--prose` なしは未完成 draft で、説明が完成するまで検証が拒否する。

`requiresCompatibilityReview` と付けられた変更は、承認の Compatibility section で reader 両方向を説明し、Verification に実行済み check を記録する。evidence がバージョン維持を支持するなら `--decision same-version` を供給する（flag 付き変更の record／update を header version 不変・明示 decision なしで行うと `decision-required` で失敗）。構造差だけが bump を推論するわけではなく、実際の header version 増加は `version-bump` を推論しうる。効果 discriminator が安全でない解釈を防げないなら adding-a-session-format-version に従い `--decision version-bump` を選ぶ。その record は自前の増加する `SessionHeader.version` transition を入れ、無関係な歴史 bump では承認されない。routine 変更は別 baseline を作らない。

### 2. check・commit・push

testing policy で変更 owner の behavior チェックを選び、docs チェックを実行:

```sh
pnpm run doc-sync
```

`doc-sync` は persistence inventory・catalog 新鮮度・完全 history・bilingual pairing をチェックする。record コマンドの `ok: true` はこれらや owner の behavior／migration test の代用にならない。JSON 失敗は `ok: false`・diagnostic `code`・exit code 1 を保持し、構造化変更は安定 kind と per-root before/after digest を持つ。record 生成が自 catalog と record pair を所有するのに対し、package README 編集など他 bilingual page は通常の pairing work flow に従う。意図した diff を review・stage して commit・push。staged lint・pairing・whitespace hook と pre-push の Host/Client typecheck はそのまま効く。

### 未受入 record の更新

record 後に source が変わったら、compatibility 説明を review し同一の未受入 terminal record を refresh:

```sh
pnpm --silent run persistence-changes --update 2026-09-11-poc-optional --prose .artifacts/persistence-change.prose.json --json
```

machine 宣言・schemas・catalogs・pairing は refresh され、`--prose` がなければ既存説明を保持。refresh された説明を完全 transition に対して改めて評価し、flag 付き same-version update には `--decision same-version`。`update` は初期 baseline・他 record が依存する record・確定 checkpoint record を拒否する。確定 checkpoint 外では tree は review 受入れを推論しない: accepted history を保全し successor を作る。統合が competing terminal record を作ったら、残り history に対して未受入 record を update し、できた diff を再評価。無関係 root の承認は refresh 不要。既存 property の value 型変更で review 要のときは、prose の Compatibility／Verification を実際の新 transition と実行済み check を説明するよう書き換えてから update（別変更の required-to-optional 説明の使い回しはしない）:

```sh
pnpm --silent run persistence-changes --update 2026-09-11-poc-optional --decision same-version --prose .artifacts/persistence-change.prose.json --json
```

## 注意

- `--record` 前に accepted baseline の locked record を保全し、履歴を上書きしない。
- 成功返答は doc-sync 以外の自動化・テストを代用しない。報告は exact コマンドと出力ベースで。
- inventory は node-table layout・現行 tooling 生成物の必要がある。`formatVersion` は正規化ルールの識別子で、root fingerprint・承認要求を変えない。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/reviewing-persistence-type-changes.md>
