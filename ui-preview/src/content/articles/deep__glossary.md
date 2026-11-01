---
title: "用語集"
desc: "DeepSeek Harnessのドメイン語彙です。1つの概念に1つの正規の用語を定め、用語どうしは標準的なMarkdownアンカーで相互参照します。実装の詳細はパッケージのREA"
cat: "deep"
catLabel: "深掘り"
chars: 4035
slug: "deep/glossary"
---

# 用語集

DeepSeek Harnessのドメイン語彙です。1つの概念に1つの正規の用語を定め、用語どうしは標準的なMarkdownアンカーで相互参照します。実装の詳細はパッケージのREADMEやAgent Noteに委ねられます。

## capability-seam（機能の継ぎ目）

| 用語 | 意味 |
| --- | --- |
| seam（継ぎ目） | 3つの役割からなるスワップ可能な能力。**Service Definition**（`ctx.＼key］`と語彙型を所有するCordis `Service`。`ShellExecutor`のような抽象クラス、`WebRuntime`のような具象レジストリで、TypeScript `interface`は不可）、1つ以上の**Service Providers**、サービスを注入する1つ以上の**Consumers**。 |

`packages/shell` が正規の例です。`dsh-shell` がService Definition、`dsh-bash-local` / `dsh-bash-sandbox` がプロバイダ、`dsh-tool-bash` がコンシューマです。役割が独立に進化するときは別パッケージに置きますが、1つの関心事なら1パッケージが複数の役割を持てます（`dsh-user-approval` は承認seamの定義と実装を1パッケージに置きます）。seamは能力全体を指す語で、個別の構成要素はseamとは呼ばず、役割・クラス・サービス・契約・拡張点の名前で呼びます。

## agent-scope（エージェントスコープ）

| 用語 | 意味 |
| --- | --- |
| scope | エージェントごとの登録の単位。貢献（ツール、プロンプトセクション、変数、制限、リスナー）は *global*（全エージェントに可視）か *scoped*（1つのscope keyに所有）のどちらか。2階層でフラットな構造で、scoped登録はサブエージェントに継承しません。サブツリーの挙動はscope構造ではなくlineageデータで表現します。 |
| scope key | scopeの鍵となる不透明な識別子で、オブジェクト同一性で比較します。ハーネスの慣習では、生きているエージェント自身が自分のscopeの鍵です。 |
| agent context（`agent.ctx`） | エージェントのscoped context。ここへの登録はscope可視かつscope寿命で、そのエージェントのscopeフィルタ付きディスパッチに参加します。レジストリ主体のイベントはそのイベント契約のもとでフィルタされない場合があります。 |
| scope carrier | scopeフィルタ付きディスパッチが運ぶ`thisArg`（`scopeTarget`で構築）。フィルタはタグなしリスナーと主体自身のリスナーを通します。鍵を持たない *subject-less* carrierはタグなしリスナーだけを受け入れます。 |
| scoped dispatch | あるエージェントの活動についてのイベントは、そのエージェントのcarrierでディスパッチされるという規則。レジストリ自体についてのイベント（ツールが追加された等）は *registry-subject* で非フィルタです。 |
| shadowing | most-specific-winsの名前解決。scopedツール・セクション・変数は、同名のglobalの対応物をそのscopeだけで置き換えます。エージェントごとのペルソナとツールバリアントの仕組みです。 |
| restriction / scope-local registration | restriction（`tools.restrict`）はglobalツール集合を1つのscope用にフィルタ（交差で合成）。scope-local登録はそのフィルタの後にマージされます。フィルタで除かれたglobalツールはプロンプトに現れず実行も拒絶され、存在しないツールと区別が付きません。 |
| setup window | 作成者がエージェントのscoped worldを組み立てる生成スロット（`CreateAgentOptions.setup`）。scopeとエージェントオブジェクトが存在してから、エージェントやセッションが公開される前、`agent/created` の発火や最初のプロンプト組み立てより前に位置します。Setupは登録だけを行い、エージェントを駆動しません。 |
| lineage | `parentSession`、永続的な`delegationDepth`、実行時の`subagentDepth`など、親子の事実をデータとして運ぶもの。可視性には影響しません。 |

## goal

| 用語 | 意味 |
| --- | --- |
| goal | 既存セッションに付属する1個の永続的な完了目標。リビジョン付きの `active` / `paused` / `blocked` / `complete` フェーズとゴールラウンド上限を持ち、`blocked` はポリシーコードと説明を保持します。goalは状態であってスケジューラでも別会話でもなく、セッションログがその正の情報源です。 |
| goal round | 現在のgoalのために認められた1回の継続サイクル。同一セッションのドライバはgoal roundをgoal由来の1つの [turn](#turn) として実体化し、0個以上のstepを含みえます。同じセッションの人間ターンはゴールラウンド上限を消費しません。 |
| goal activation | 継続コンシューマが次のgoal roundを認めるためのプロセスローカルな許可。`armed` か `disarmed` の二値で、意図的に永続再生から除外されるため、resumeとforkは人間が承認したresume操作（`/goal` またはモデルツール）を経てからでないと自動作業を再開できません。 |

## human command（人間コマンド）

| 用語 | 意味 |
| --- | --- |
| human command | スラッシュ接頭の指令で、人間向けアダプタが`ctx.commands`経由で解釈・実行するもので、モデルメッセージにはなりません。モデル向けツールや`ctx.shell`経由のシェル実行とは別物です。 |
| command plane | UIアダプタとコマンドプラグインが所有する発見・解析・ディスパッチ・キャンセル・結果描画の全体。コマンド出力はUI状態であり、ハンドラが個別に永続ドメインを更新した場合に限り永続化します。 |
| goal command | `dsh-command-goal` が提供する `/goal` 人間コマンド。現在のgoalを直接観測・更新しますが、永続的でモデル可視な記録はすべてgoalドメインが所有します。 |

## loop hierarchy（ループ階層）

| 用語 | 意味 |
| --- | --- |
| turn | セッション内で認められた入力を1回排出するまとまり。モデルとそのツールが止まるか終端ポリシーが介入すると終わります。 |
| step | 1回のモデルリクエストと、その応答が引き起こしたツール実行。turnには0個以上のstepが含まれます。 |
| round | turnを包含する外側のポリシー反復。goal roundや、新規エージェントのRalph試行1回など。ラウンドカウンタはそのポリシーに属し、セッション内の全turnを数えません。 |
| exchange | 最初のstepで人間入力を認めるturnから、次のそのようなturnまでの連続したturn群。通知で目覚めたturn（settled subagent・goal round・スケジュールなど）は前のexchangeに属します。Chatのnext-message foldingは最新のexchangeだけを展開します。 |

## Ralph

| 用語 | 意味 |
| --- | --- |
| Ralph loop | 不変の目標に向かう、フォアグラウンドの新規エージェントワークフロー1実行。workflowとsubagentのプリミティブから組まれたモデル向けツールポリシーであって、同一セッションのgoalやagent-loopモード、スケジューラ、汎用ワークフロースクリプト機能ではありません。 |
| Ralph round | Ralph loop内の1つの新規子セッション。子には親や先行子の会話シードを与えず、共有ワークスペースと1本の境界付きRalph handoffがラウンド横断の状態を運びます。 |
| Ralph handoff | 継続するRalph roundから次のroundへ渡される、正規化された境界付き構造化レポート。status・summary・evidence・next steps・blocker textを含みます。共有ワークスペースを権威として補完するもので置き換えません。 |

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/glossary.md
