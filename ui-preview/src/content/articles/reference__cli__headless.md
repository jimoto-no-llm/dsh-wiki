---
title: "CLI headless（`dsh headless`）"
desc: "dsh headless は、タスクを1つ実行して終了するモードです。回答は stdout に、診断出力は stderr に出ます。同じヘルプが dsh headless --he"
cat: "cli"
catLabel: "CLI リファレンス"
chars: 2416
slug: "reference/cli/headless"
---

# CLI headless（`dsh headless`）

`dsh headless` は、タスクを1つ実行して終了するモードです。回答は stdout に、診断出力は stderr に出ます。同じヘルプが `dsh headless --help` と `dsh --profile headless --help` のどちらでも表示されます。

## 文法

```text
Usage: dsh --profile headless [options] [task...]
```

ヘルプの説明文:

```text
Answer one task and exit; the answer goes to stdout and diagnostics to stderr.
```

訳: タスクに1回回答して終了します。回答は stdout に、診断は stderr に出ます。

## 引数

| 引数 | 説明 |
| --- | --- |
| `task` | タスクのテキスト。複数の単語は空白で連結されます。`-` を与えると stdin から読み取ります |

## オプション

ヘルプに列挙されたオプションの全量です。

| オプション | 説明 |
| --- | --- |
| `--json` | 最終メッセージの代わりに、改行区切りの実行イベント（run events）を stdout に出力します |
| `--session-id ＼id］` | この ID の永続化済み Session を引き継ぎます。未知の ID はエラーになります |
| `--permission-mode ＼preset］` | このタスクのために設定済みパーミッションプリセットを選択します。再開（resume）時にも選択できます |
| `--approval-policy ＼policy］` | パーミッションプリセット選択後の承認（approval）のふるまいを設定します。選択肢は `"ask"` と `"never"` です |
| `--add-dir ＼path］` | workspace-write の下で、追加の物理的な絶対ディレクトリを許可します。繰り返し指定できます |
| `-h, --help` | このヘルプを表示します |

## 実行例

ヘルプに記載された実行例は次のとおりです。

```text
dsh --profile headless "run the tests"          answer one task and exit
echo "run the tests" | dsh --profile headless   read the task from stdin
dsh --profile headless --json "run the tests"   emit machine-readable run events
dsh --profile headless --session-id session-… "continue"   resume an existing Session
dsh --profile headless --permission-mode workspace-write --add-dir /repo/.git "commit the fix"
                                                grant shared Git metadata for this task
```

訳の要点:

- `dsh --profile headless "run the tests"` — タスクに1回回答して終了します
- `echo "run the tests" | dsh --profile headless` — タスクを stdin から読み取ります
- `--json` を付けると機械可読な実行イベントを出力します
- `--session-id session-… "continue"` — 既存の Session を再開します
- `--permission-mode workspace-write --add-dir /repo/.git "commit the fix"` — このタスクのために共有 Git メタデータへのアクセスを許可します

## ふるまいの要点

- `headless` プロファイルは、初回使用時に同梱テンプレートから自動初期化されます（[behaviors](/reference/cli/behaviors.md)）。
- 起動時のカレントディレクトリが、既定のワークスペースルートになります（[behaviors](/reference/cli/behaviors.md)）。
- `dsh --profile headless "job"` は新しい永続化セッションを1つ実行し、最終回答を出力して終了します（[launcher](/reference/cli/launcher.md)）。

## 出典

本文は上流ドキュメントの該当記述の翻訳です。オプション名・使用例・原文の説明文はそのまま保存しています。

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md
- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md
