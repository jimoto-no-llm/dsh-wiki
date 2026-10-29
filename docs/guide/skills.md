# スキルと MCP

スキルは「必要なときに読ませる補助の指示」、MCP は「外部サーバが提供するツールを接続する規約」です。どちらも既定では効かず、明示的な設定で有効になります。

## スキルとは

スキルは Markdown の手順書で、セッションイベントではなく「任意の指示」として扱われます。名前はケバブケース（`a-z0-9` と `-` のみ）で、次の2形式を受け付けます。

- ディレクトリバンドル: `<name>/SKILL.md`
- フラットな1ファイル: `<name>.md`

さらに `**/SKILL.md` のような入れ子の再帰探索は対象外です。frontmatter の `disable-model-invocation` と `user-invocable` で、モデルから呼び出せるか・人だけが呼び出せるかを制御します（未指定ならどちらも `true`）。

## 探索される場所と優先順位

ローカル提供者は、次の順でルートを走査します。

| 優先順位 | 由来 | ルート |
| --- | --- | --- |
| 100 | project-dsh | `<projectRoot>/.dsh/skills` |
| 200 | project-agents | `<projectRoot>/.agents/skills` |
| 300 | custom | `customSkillDirs` 設定 |
| 400 | user-dsh | `<dshHome>/skills` |
| 500 | user-agents | `<agentsHome>/skills` |
| 600 | bundled | `bundledSkillDir` 設定 |

数値が小さいほど勝ち、同名スキルは優先順位の高い（数値の小さい）側が採用されます。プロジェクトルートは、最も近い祖先にある `.git` のディレクトリで決め、無ければカレントディレクトリを使います。ルートはファイルの追加・削除を監視され、変更は次の読み出しで反映されます。

## パッケージ構成

スキル機能は次の一式で構成されます（詳細は上流ドキュメント参照）。

- `dsh-skill` — サービス定義。レジストリ `ctx.skills` を提供
- `dsh-skill-filesystem` — ローカルディレクトリを供給するプロバイダ
- `dsh-tool-skill` — モデル向けの `skill` ツールを持つコンシューマ
- 任意の同梱プロバイダ（`dsh-skill-badge`, `dsh-skill-office` など）

## MCP を接続する

MCP（Model Context Protocol）は、外部サーバのツールを DSH の通常ツールとして登録します。MCP サーバーは既定では無効で、`@deepseek-ai/dsh-mcp-client` のエントリを1サーバーにつき1つ、対象スコープに置いたときにだけ有効になります。接続先は `stdio`（子プロセスを起動）と `streamable-http`（既に稼働する HTTP サーバーへ接続）の2方式です。

```yaml
- insert:
    - id: memory-my-server
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: my-memory
        transport: stdio
        command: my-memory-mcp
        args: []
        env: {}
        cwd: !!js process.cwd()
```

リモートサーバーなら `transport: streamable-http` と `url`, `headers` を使います。この例は `--patch` で1回だけ渡すか、`$DSH_HOME/profiles/<name>/cordis.patch.yml` に移して保存します。

登録後、ツール名は `mcp__<serverName>__<toolName>` の形で公開されます。`serverName` は同じスコープ内で一意で、`[A-Za-z0-9_-]{1,32}` に一致させる必要があります。

よく使う設定項目は次のとおりです（全項目は[設定カタログ](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-mcp-client)）。

| フィールド | 意味 |
| --- | --- |
| `toolCallTimeoutMs` | ツール呼び出し・リソース要求1件の待ち時間（ミリ秒） |
| `failOnStartupError` | 初回接続やツール同期の失敗で起動を止めますか |
| `maxInstructionBytes` | サーバ指示（instructions）の上限バイト数 |
| `reconnect` | 切断後の自動再接続（`enabled`, `initialDelayMs`, `maxDelayMs`, `maxAttempts`） |

サーバが公開する指示はシステムプロンプトに、サーバのリソースは共有ツール経由で読み込めます。一方、MCP プロンプトテンプレート、elicitation（対話入力）、タスク型実行、リソース購読は未対応です。

## 出典

- [deepseek-ai/deepseek-harness: docs/subsystems/skills.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)
- [deepseek-ai/deepseek-harness: docs/subsystems/mcp.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/mcp.md)
- [deepseek-ai/deepseek-harness: docs/config-catalog.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md#deepseek-aidsh-mcp-client)
- [deepseek-ai/deepseek-harness: docs/user/guide/mcp-memory.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/mcp-memory.md)
