---
title: "プロセスサンドボックス"
desc: "DSHがコマンドやファイル操作を安全に実行するための「サンドボックス」層の仕組みです。サンドボックスはbash・filesystemといった消費者を特定のOSの実装に結合させない抽"
cat: "subsystems"
catLabel: "サブシステム"
chars: 3540
slug: "subsystems/sandbox"
---

# プロセスサンドボックス

DSHがコマンドやファイル操作を安全に実行するための「サンドボックス」層の仕組みです。サンドボックスはbash・filesystemといった消費者を特定のOSの実装に結合させない抽象層として設計されており、呼び出しごとに受け取ったポリシーに応じて、プラットフォームが用意する分離機構でargvのファイル副作用を制限します。扱うのは書き込み（ファイル効果）だけで、ネットワークやプロセスの可視性はこの語彙の対象外です。

`dsh-sandbox` が抽象的な継ぎ目（seam）を、`dsh-sandbox-local` が実行ホスト向けの実装を受け持ちます。SSH経由の `dsh-sandbox-ssh` は遠隔ホスト上で同じポリシーを適用し、シェル側の `dsh-bash-sandbox`・`dsh-pwsh-sandbox` がこれを消費します。

## バックエンドの構成

| 役割 | パッケージ | 内容 |
| --- | --- | --- |
| 抽象seam | `dsh-sandbox` | argvをファイル効果ポリシーで包む共通語彙 |
| ローカル実装 | `dsh-sandbox-local` | Linux bwrap/Landlock、macOS Seatbelt、Windows ACL restricted-token |
| シェル消費者 | `dsh-bash-sandbox` / `dsh-pwsh-sandbox` | bash・PowerShellの実行を confines する |
| 遠隔消費者 | `dsh-sandbox-ssh` | 遠隔バックエンドでSSHのfilesystem/subprocessに同じポリシーを適用 |

## モードと提示の完結度

`SandboxMode` はファイル効果だけを制御する3値です。`read-only` は書き込みを拒否しますが、POSIX系ランナーはシェルが必ず必要とする `/dev/null` のシンクを許します。`workspace-write` はワークスペース直下、明示された追加ディレクトリ、バックエンドが用意する一時領域への書き込みを許します。

| 概念 | 値 | 意味 |
| --- | --- | --- |
| モード | `read-only` | 書き込み拒否（`/dev/null` など最低限のシンクは除く） |
| モード | `workspace-write` | ワークスペース直下 + 追加許可ディレクトリ + 一時領域に書き込み可 |
| モード | `danger-full-access` | 制限なし。プロバイダには渡さず、元のargvをそのまま起動する |
| 提示の完結度 | `full` | バックエンドがモードの約束する効果をすべて管理している |
| 提示の完結度 | `partial` | 古いカーネルABI等の理由で一部の効果しか管理できない |

提示の完結度は「報告される事実」です。絶対的な境界が要る消費者は `partial` で `full` と判断してはいけません。現在の `partial` の実例は、古いLandlock ABI、Windows ACLランナーのハードリンクや未制限読み取り・AppContainer-ACL境界などです。

## 呼び出しごとのポリシー

ポリシーは1回の実行ごとに完全な形で解決・伝達され、プロバイダの状態を書き換えません。

- `SandboxExecutionPolicy` がモード・ワークスペースルート・追加許可ルート・セッション識別子を持ちます。ルートは `danger-full-access` のときでも運ばれ、消費者が1回の解決で分岐を済ませられるようにするためです。
- `extraWritableRoots`（追加書き込み許可）は呼び出しごとに実在・ディレクトリ性・シンボリックリンクでないことが検証され、`read-only`・`danger-full-access` のときは何も与えません。
- `ctx.sandboxPolicy.resolve()` への入力はセッションと「承認済みの明示モード」です。明示モードはセッションログの最後の `sandbox/mode` イベントよりも優先し、優先順位とルートのフォールバックはサービス側が担うので、bashやfsは同じ判定を繰り返しません。
- ポリシー境界はセッションcwdで決まります。エージェントを持たない呼び出しでは配置設定のルートがフォールバックになります。

## 使い方

1. 消費者は `ctx.sandboxPolicy.resolve()` で完全なポリシーを取得し、`danger-full-access` なら `ctx.sandbox` を呼ばずに元のargvを起動します。
2. confinement 対象の呼び出しでは `await ctx.sandbox.confine(argv, policy, signal)` を呼び、返された代替argvをそのまま起動します（シェルなら `["bash","-c",command]` の形）。
3. 返却argvには `enforcement`（`full`/`partial`）と、拒否を分類する `denialSignatures`、ランナー失敗を分類する `RunnerFailureRule` が添付されています。
4. 失敗の分類では、非ゼロ終了コードのうち許容コードの除外 → 情報行（stderr1行まるごとの厳密等価）の除外 → 残った各行への致命的署名の照合、という順序で判定します。終了コードだけではランナー失敗と判断できません。

## 注意

- **fail-closed が絶対条件**です。confinement を黙って素通しする挙動は決して許されません。利用できるバックエンドがないときは `SandboxUnavailableError`（コード `SANDBOX_UNAVAILABLE`）で失敗します。
- 拒否パターンはバックエンドごとに方言が違います（bwrap配下のEROFS、LandlockのEACCES、SeatbeltのEPERMなど）。複数バックエンドの拒否文字列の連集を用いず、実際に動いているバックエンドの集合だけに照合します。
- cwdが `symlink/..` のような形でも、実行ワールド内の物理パスに正規化されます。実行providersは、ファイルが実際に存在する場所でルートを正規化します。
- ポリシーは呼び出し単位なので、同一プロバイダに対して2つの消費者が別々の境界（bash は read-only、子は状態ディレクトリ書き込み可）を並行して要求できます。承認済みの再試行は、より広いポリシーを持つ新しい1呼び出しです。
- ポリシーの解決は「明示的ステップ」として消費者の境界で行われ、プロバイダはポリシーを完全に指定されたものとして扱います。デフォルトや優先順位は消費者側の責任です。

## 失敗分類の語彙

| 語彙 | 役割 |
| --- | --- |
| `RunnerFailureRule` | ランナーがコマンド実行前に失敗したことを示す証拠（許容終了コード／致命的署名／情報行の除外） |
| `denialSignatures` | このバックエンドがサンドボックス機能どおりに阻害したときのstderrの方言 |
| `ConfinedArgv` | 置き換え後argv＋完結度＋2種類の分類子を運ぶ返却値 |
| `SandboxPolicyRequest` | ポリシー解決の入力（セッションと承認済み明示モード） |

ランナー失敗は「コマンドが走っていない」こと、拒否は「confinementが機能して阻害した」ことを意味します。この2つを混同しないことが消費者契約の前提です。
- ネットワークとプロセスの可視性はこの語彙の外です。より広い保証はセッション側の監査記録・配置管理と組み合わせて検討してください。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sandbox.md