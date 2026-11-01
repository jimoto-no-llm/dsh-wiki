---
title: "版付き質問カード (Versioned question cards)"
desc: "プロジェクトdashboardは、通常の相談と明示的な承認要求を dashboard_ask_question で扱います。すべての回答は人の返信であり、この機能は実行権限の発行・"
cat: "rdsh-dw2"
catLabel: "rustdsh 運用"
chars: 3568
slug: "rdsh/dw2/question-contracts"
---

# 版付き質問カード (Versioned question cards)

プロジェクトdashboardは、通常の相談と明示的な承認要求を `dashboard_ask_question` で扱います。すべての回答は人の返信であり、この機能は実行権限の発行・agent開始・マージ・公開・課金を行いません。実行権限の判断は承認ledger（#30）に、消費側の読み取り/適用確認は #41 に属します。

## 互換性と作成

旧形式 `{id, question, urgency?, default_action?}` の呼び出しは既存の質問とフィードバック欄の形を保持します。`default_action` は情報表示であり、相談を承認要求には変えません。state schemaは1のまま、両MCP transportは6つのtoolを露出し続けます。任意の `question_contracts` メタデータは独自のschema 1を持ち、質問/回答と同じproject state fileへ原子的に書かれます。未対応・不整合なメタデータは無条件に上書きせず、そのままstartupを停止します。

typedなカードには `decision` を付けます。

```json
{
  "id": "Q1",
  "question": "この文書のリビジョンを公開しますか？",
  "urgency": "high",
  "decision": {
    "kind": "approval",
    "target": {
      "task_id": "T1",
      "run_id": "run-fixture-1",
      "session_id": "native-fixture-1",
      "action_id": "publish-document",
      "revision": "document-v1"
    },
    "choices": [
      { "id": "proceed", "label": "この条件で進める" },
      { "id": "hold", "label": "保留のままにする" }
    ],
    "recommended_choice": "hold",
    "recommendation_reason": "対象文書にはreviewがまだ必要",
    "diff": "fixture.mdだけが公開文書に加わる",
    "impact": "他の人が文書を読めるようになる",
    "conditions": "このtask・run・文書revisionのみがscope",
    "cost": {
      "currency": "USD",
      "max": 5,
      "description": "宣言上の上限。billing計測はしない"
    },
    "expires_at": "2026-12-01T00:00:00Z"
  }
}
```

相談は `kind: "consultation"` を使い、target・choices・cost等を省略できます。承認要求には版付きaction・choicesが2つ以上・diff・impact・conditions・明示的なUSDのcost objectが必要です。`max: null` は未知を意味し、ゼロではありません。推奨にはreasonと実在choiceが必要で、ブラウザはそれをあらかじめ選択しません。自由記述も残します。

targetとcostは質問発行者の宣言です。ネイティブセッションの観察、プロバイダの請求書、許可されたbudgetではありません。実際のtargetや条件が変わったら発行者がカードを改訂する必要があります。報告されなかった外部のaction変更を、この機能は検出できません。

## 改訂・回答・失効

`dashboard_get_state` で `question_contracts.cards[id]` を読みます。単調な `revision` と内容 `fingerprint` は、表示上の質問・urgency・参照action・正規化されたdecision context全体をカバーします。

- 新規作成: `action` を省略し、またはtyped decision付きの `action: "create"`。
- 改訂: 新しい質問/decision全体と `action: "revise"`、現在の `expected_revision` を送る。旧形式の質問IDの再利用は非対応のまま。
- 取消: `{id, action: "cancel", expected_revision, cancel_reason}`。

質問の変更は新しいopen revisionを作ります。以前のスナップショットと保存済み回答はrevision履歴に残り、元のfeedback記録とsequence cursorは保持されます。公開feedbackには `contract_validity` と `invalidation_reason` が付きます。古い回答が新revisionへの返信にはならず、`execution_authorized` は常にfalseです。以前のrevisionは1000件まで保持され、それを超えるなら履歴の削除ではなく新しい質問IDが必要です。

`/api/update/answer` の送信は既存の人間ブラウザcredentialだけです。typed返信には `expected_revision`、`contract_fingerprint`、任意の `choice_id`、空でない `answer` が必要で、UIが自動的に送ります。古いrevision/fingerprint・期限切れ・取消はHTTP 409で返信を拒否します。回答済みの質問は既存のHTTP 400重複返信拒否を保ち、保存済みfeedbackは現在有効か改めて確認されます。MCP/管理credentialは人の返信を偽造できません。人間専用の `/api/decision/cancel` はhost/originとcredential確認を保ちます。

回答の保存は、配信・読取り・適用とは別です。webhookの結果もfeedback読み取りも適用を主張しません。保存済みtyped回答を使う前に、クライアントは現時点の有効性を再確認します。不変のfeedbackだけでは後日の取消やtarget変更を伝えられません。

## ブラウザの挙動

カードはkind・choices・推奨理由・task/run/session/action/target revision・diff・impact・conditions・costを併せて表示します。改訂では変更フィールドを名指し、以前のtargetと新旧costを示し、保存されたdraft提出前に改めてreviewを求めます。以前のラジオ選択はクリアされます。無関係なSSE更新はテキスト・ラジオ選択・フォーカス・textarea選択を保持します。HTTPで古いスナップショットが表示中のプロジェクトrevisionを巻き戻すことはありません。SSEが無くても定期的なstate読み取りで期限表示が更新され、期限判定は提出時にサーバーが必ず行います。

期限切れ・取消済みのカードは回答操作を無効化した状態で表示され続けます。保存済み返信は「保存済み」とラベルされ、古い返信は失効した履歴として見えます。Responsiveカードでは狭いviewportでも内容が見えます。実際のキャプチャと検証は `docs/evidence/question-contracts.md` にあります。

## 実務上の注意

- 回答の保存と、決定の実行は別物です。承認として扱う前に、回答の現在有効性をもう一度確認してください。
- target/costは宣言です。実物のセッション・請求と食い違う可能性を想定し、発行者が改訂を担う姿勢を保ちます。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/QUESTION-CONTRACTS.md
