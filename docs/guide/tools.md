# ツール一覧と実行の流れ

モデルに向くツールの全体像と、1回のツール呼び出しがどの順序で処理されるか（実行パイプライン）を説明します。

## ツール実行パイプライン

内蔵エグゼキュータが生バッチの解析・スケジュール・キャンセル・セッションの呼び出し/結果の記録を担い、その共通パイプラインに policy・hooks・サンドボックス・ファイルガード・結果書き換え・UI描画が差し込まれます。流れは次のとおりです。

1. アシスタントメッセージにツール呼び出しブロックがあれば、実行前にセッションイベント `tool/call` が記録され、UIには保留カードが表示されます。
2. `tools/pre-execute` のwaterfall（hooks・許可・サンドボックス）が先に走ります。denyならツール本体は実行されません。
3. `ctx.approval` のワンショット承認プロンプトは単調ガードの前に解決されます。応答不能・拒否はdeny扱いに、ガードはdenyまたは棄権で、なりすましを防ぐ識別情報を保護します。
4. 登録済みの単調ガード、次いで `tools/execute` waterfall（タイムアウト・再試行・メトリクスはaround dispatch）を経て、ツール本体の execute() が走ります。
5. ファイル系ツールの書き込みは `fs/write-intent` や `fs/edit-intent` を経由し、読み取り改変前チェックは `tool-fs` 以下の `fs/*` イベントに置かれます。
6. ツール定義の `projectContent` が準備済みテキスト・画像を post `tools/post-execute`（受け入れ・ブロック・置換・文脈追加）の前に挿入します。
7. パイプラインは候補結果をロスレスにスナップショットし、スナップショット失敗は isError に正規化します。その後 `finalizeContent` が（内容だけ変更しない不変条件）を同期的に強制します。
8. スナップショット済みの不変更な結果を `tools/result` 同期通知が観測し、`tool/result` セッションイベント、完了カード、追加の additionalContexts（記録済み結果の後に入った ユーザ向き/message）へ続きます。

PTCモードでは予約済みの run_code トランスポートもその順序付きサブ呼び出しもこのパイプラインを通ります。サブ呼び出しは親トークンを持って `tool/ptc-dispatch` を記録し、拒否をバインド拒绝に返し、呼び出し/結果の隣接を保つため additionalContexts を引かずにきます。

## ツールカタログ

ツールカタログ(`docs/tool-catalog.md`)は生成物で、配布プラグインが `ctx.tools` に出す全モデル向きツールの name・description・JSON-Schema parameters を掲げます。ツールのスキーマは実行時に決まれるため、ジェネレータは各プラグインを実コンテキストで起動して `ctx.tools.schemas()` を読み、`pnpm run verify-tool-catalog`（doc-syncの一部）で毎回検証します。

- この表の観点は、モデル向きのツール名↔プラグインパッケージ↔サービス接続の対応です。ツール名がload-time設定の場合（例: tool-subagent の `toolName`、既定は `subagent`）あり、配布エイリアスは各パッケージの欄に記録されます。
- 制約の例: `todo_write` の `allowParallelInProgress` は必須かつ既定がないため、カタログは `true`（複数の in_progress を認める）を載せています。
- `web_search`/`web_fetch` が `ctx.web` の背後にプロバイダ選択を置き、バックエンド差し替えでもモデル向きスキーマを安定させます。
- `job_kill`・`job_list`・`job_output` の3ツールで、種別を問わないバックグラウンドジョブを扱います。読み込みで producers' `ctx.jobs.start()` を有効化する制御器がつきます。
- `session_search` 等の読み取り五ツールは専用カーソルを隠し、不変更な呼び出し元のセッションから結果を認可して返します。

## 出典

- [docs/tool-execution-pipeline.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-execution-pipeline.md)
- [docs/tool-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md)
