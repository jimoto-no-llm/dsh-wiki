# ロードマップ

約束ではなく方向性です。項目は誰かがPRを出すと動きます。[PROJECTS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/PROJECTS.md) の管理下で、このファイルは方向だけを述べ、状態の正本はissueとmilestoneです。

バックログ索引は [issue #74](https://github.com/jimoto-no-llm/rustdsh/issues/74) で、全72のproposalが `P0`〜`P3` のfeature issueに紐付いています。minor releaseでこのファイルを更新し、状態の変動はissueに置きます。

したがって「この項目はいつやるか」を知りたければissueのmilestoneとラベルを見ます。英語由来の機能名・issue番号・リポジトリ側の用語は正式表記のまま使います。このファイルの節（Now / Next / Later）は大まかな向きを示す目安で、実行順の決定権はissueとmilestone側にあります。手を付ける人はPRが動かすのであって、この一覧自体が約束を生みません。

## Now (`P0`〜`P1`、milestone `v0.3.3`) — shipped

- 委譲はupstream `dsh` の進化に対してバイト等価を保つ（`--passthrough` が基準。`docs/ARCHITECTURE.md` 参照）。
- installerがLinux / macOS / WSL / Windowsで検証済み（`installer` ラベル、`install.sh` / `install.ps1`、Unix archiveは `release-digests.tsv` にもpin済み）。
- dashboardの認証境界、イベント購読、QRフロー（`dashboard` + `security` ラベル）。
- credentialはupstream DSHのlock protocol（#375）を使う。
- context engineは `features.context_engine` の下で提供（既定OFF）。
- リリースgateはタグpushのCI完了後にビルドする（`docs/RELEASING.md` 参照）。

## Next (`P1`〜`P2`、milestone `v0.4.0`)

- 非日本語回答のワンクリック翻訳と履歴置換（#448）: spikeから始め、assistant-actionsボタン、`surfaceOp` 経由の置換の順。自動翻訳はしない。Web UI限定。
- 保留中のsecurity reviewを着地する: Linux task sandbox（#254）、sync digest pinning（#428）、外部sourceのprovenance chain（#236）。
- Windows dashboard flake: 断続的なrouting probe / tray timeout（#209）。
- routing実験を開始する（#87）: 最安経路の選択。プロバイダは1つずつ（`docs/proposals/` 参照）。
- 壊れたwrapperやshadowed binary向け `doctor` 検査の追加。
- digest registryのWindows側（`install.ps1`、#359続き）。
- JS→Rustの段階移行（`rust` ラベル、`RUST-MIGRATION.md` 参照）: 1機能ずつ、公開インターフェース不変、Linux/macOS/Windowsで検証。v0.4.0候補はより広い `rdsh-compute` 呼び出し箇所と、計測したdashboardの純粋計算。agent loop・認証・セッションの正本はDSHに留める。

## Later (`P2`〜`P3`、milestoneなし)

- WSLフローと同等のWindowsネイティブdashboard。
- CIでの起動・メモリ回帰追跡（10%超の悪化で失敗）。
- 完全なi18n: README.ja.mdとREADME.mdの同期（`ja` + `docs` ラベル）。UI文字列は #448 の後に続けます。

## Non-goals

- agent loopやprofile bootのRust再実装。
- Harness UIやそのprotocolのfork。
- routingでの全プロバイダ同時対応（1つずつ）。

## 管理と更新の間柄

|タイミング|行うこと|置き場所|
| --- | --- | --- |
| minor release | `ROADMAP.md` の方向を更新 | このファイル |
| 着手・完了・状態の変動 | issueをclose/reopen、ラベル・milestoneを更新 | issueとmilestone |
| バックログの体系 | #74 索引に全体を紐付け | issue #74 |
| 週次トリアージ | Inbox整理と`P1 Next`への昇格（最大3件） | ボード操作 |

新しく項目を追加したい場合は、まずfeature issueを立てて #74 に紐付け、必要ならPRでこのファイルに反映します。このファイルを先に書き換えても、対応するissueが無ければ着手・進捗ともに管理に載りません。

## 実務上の注意

- このファイルは方向の宣言です。着手の判断や進捗はissue #74・milestone・ボードで管理します。
- `ROADMAP.md` の更新はminor release時に限ります。日々の状態替えを書き込まず、issue側に置きます。
- 新規項目はPRで追加します。まずfeature issueを立てて #74 に紐付け、そのうえでこのファイルの対応する節に載せます。
- shipped の項目も撤去せず履歴として節に残します。次のminor releaseで節の並びを見直すのが運用です。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/ROADMAP.md
