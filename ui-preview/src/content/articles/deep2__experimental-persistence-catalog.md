---
title: "実験系 Plugin Record Catalog（experimental-persistence-catalog.md 深掘り）"
desc: "上流の docs/experimental-persistence-catalog.md は experimental パッケージが所有する"
cat: "deep2"
catLabel: "深掘り 2"
chars: 1920
slug: "deep2/experimental-persistence-catalog"
---

# 実験系 Plugin Record Catalog（experimental-persistence-catalog.md 深掘り）

## 導入

上流の docs/experimental-persistence-catalog.md は experimental パッケージが所有する
「無視可能な log-only」の永続レコードを一覧した生成文書です。known-event 集合の外側に置かれる
plugin:* レコードの正本一覧であり、永続化の本流と実験系の境界を確認できます。

## レコードの位置づけ

- これらのレコードは **known-event 集合外**です。SessionEventMap の宣言マージ、
  永続スキーマの指紋、互換性履歴には含まれません。
- フォーマット移行では **best-effort で保持**されます。保全の厳格さがメインカタログと
  異なる点が本質的な違いです。
- Payload 注記は所有パッケージのソースへのリンクをそのまま示します。参照型の内容は展開されません。
- レコード名の前置は plugin: で、Session イベントの event: 前置と系統が分かれています。
- ライフサイクルは experimental パッケージに属するため、宣言はソースの types.ts に置かれ、
  カタログはそれの写りです。レコードの追加・削除は所有パッケージの変更として
  生成カタログに反映されます。

## 現行の5レコード

| レコード | Owner | 用途 |
|---|---|---|
| plugin:action-cards/decision | @deepseek-ai/dsh-action-cards | アクションカードの dismiss と kind 毎の進捗 |
| plugin:client-ui-forge/worktree | @deepseek-ai/dsh-experimental-client-ui-forge | Session が開始される worktree の要求・取り下げ・作成 |
| plugin:forge-session/binding | @deepseek-ai/dsh-experimental-forge-session | 変更要求を bind・復元・隠す呼び出し元または発見アクション |
| plugin:translator/request | @deepseek-ai/dsh-experimental-translator | 配信前に確保される provider 中立な翻訳入力 |
| plugin:translator/result | @deepseek-ai/dsh-experimental-translator | 消費者へ返される前の成功した翻訳 |

## 生成と検証

`pnpm run gen-persistence-catalog` がメインカタログとこのレコードカタログの両方、その言語ペア、
関連成果物を一括で再生成します。`pnpm run verify-persistence-catalog` が生成物の全件を検証します。
実験パッケージの payload 型を動かすと、このカタログ側も更新対象になります。
上流の本文では、共有 Session イベントの宣言と解決済みスキーマの正本が
persistence-catalog.md にあることも併記されています。

## 注意

- 本wikiでは docs/deep2/persistence-catalog.md が本流カタログ、
  docs/develop/reviewing-persistence-type-changes.md がレビューの流れを扱います。
- 実験機能を公式化する際には、このカタログからメインカタログの event:* へ移籍すると
  「best-effort 保全」から「型指紋と隣接移行の義務」へ扱いが変わる点に注意してください。
- ここに挙がるパッケージは実験（experimental）名前空間の所有物であり、挙動や payload が
  予告なく変わる前提の記載が上流にあります。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/experimental-persistence-catalog.md
