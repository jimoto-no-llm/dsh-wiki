---
title: "SDK の run がネイティブ コマンドを受け付ける（v0.2.2-alpha.2）"
desc: "Python と TypeScript の run() が文字列とコンテンツ ブロック配列を受け付け、入力の完了後つねに RunResult を返すように変わりました。"
cat: "ug"
catLabel: "移行"
chars: 2299
slug: "ug/sdk-run-commands"
---

# SDK の run がネイティブ コマンドを受け付ける（v0.2.2-alpha.2）

Python と TypeScript の `run()` が文字列とコンテンツ ブロック配列を受け付け、入力の完了後つねに `RunResult` を返すように変わりました。

## コマンド入力の認識

ネイティブ コマンドは、定義の同一性と実効登録名で認識されます。

- 改名された定義に、英語と中国語の別名が追従します
- 無関係な正確同名列の置き換えは、通常の入力のままです
- 対応コマンドの認識規則は、上流の SDK サーバ README（command-input 節）にあります

## RunResult の内容

| フィールド | 内容 |
| --- | --- |
| `final_response` / `finalResponse` | 最終のアシスタント テキスト。activity が何も出さなければ空文字列。state-only コマンドはネイティブ ハンドラの結果テキスト |
| `finish_reason` / `finishReason` | 端末の結果（terminal outcome） |
| 全結果共通 | Session id、ルート イベント、Session ツリーの通知を保持する |

タイミングの面では、State-only コマンドはモデル ターンを待たずに終わります。

- `/plan <task>` は、叙述された activity（ネイティブ レビューと承認済みの続行を含む）が実行に取り込まれるまで待ちます
- goal の作成と再開は、goal が止まり閉じの activity が終わるまで自動ラウンド間で待ちます
- 低レベルの strict コマンド呼び出しは引き続き `CommandExecution` を返します。これはネイティブ ハンドラの確定後のことです

## コンテンツ ブロック配列の扱い

コンテンツ ブロック配列はネイティブ ルーティングをバイパスしなくなりました。

- 認識されるコマンドはテキスト ブロック1つと、オプションでエンコード済みラスタ画像を要します。画像の受け入れ可否はネイティブ ハンドラが判定します
- `/plan off` に画像を添えると、plan 状態を変えずに失敗します
- 空の配列と空白だけの入力は Session の作成前に拒否されます。画像だけの入力は引き続き受け付けられます
- strict 入口で同一性が拒否されても、初期化済みの Session は残ります。ハンドラを実行せず、プロンプトも提出しません

## 移行の手順

1. プロンプトとコマンドに対しては、既存の `result.final_response` / `result.finalResponse` のアクセスを保ちます。失敗は `finish_reason` / `finishReason` で検査します。コマンド id とネイティブの結果は `command/run`・`command/done` イベントに残ります。結果の Session id を保存しておけば、継続や復元に使えます
2. plan レビューのために、ユーザー質問のコールバックを生かしておきます。状態を変えるコマンドの失敗は `RunResult` に現れます。ルーティングの不全・不正なプロトコル データ・転送の失敗は引き続き例外で現れ、タイムアウトや observer の失敗は実行時の作業を巻き戻しません
3. リテラルで待ち行列に入れる入力には、Python では `client.session_prompt(session_id, blocks)`、TypeScript では `client.prompt(sessionId, blocks)` を使い、その後の activity を自分で管理します。実行時のスキル認識も引き続き効きます
4. カスタムの `session/query` クライアントは `{ sessionId, contentBlocks }` を送ります。コマンド応答はネイティブ ハンドラに応じ、対応する `session.query.completed` 通知は最終入力の結果を運びます。通知の順序を保持し、送る前に購読します
5. `run()` の呼び出し前に空の入力を取り除きます。画像は画像対応モデルで、既存の `run([text_block, image_block])` の形で使います。Python の不正なネイティブ コマンド応答は、検証原因を保持した `SdkProtocolError` を投げます。総称の応答モデルを選ぶ呼び出しは、その検証の挙動を引き続き保ちます

## 確認事項

- `/plan` での実行が、ネイティブ レビューと承認済みの続行を終えた時点で確実に返ることを確かめます
- `finish_reason` で失敗を見つけたら、`command/run` と `command/done` のイベントから原因を寄せましょう

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/sdk-run-commands/guide.md
