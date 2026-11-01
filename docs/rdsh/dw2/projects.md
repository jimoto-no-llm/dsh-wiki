# プロジェクト管理 (Projects)

`rustdsh` の作業の追跡方法です。issueが正本で、[ROADMAP.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/ROADMAP.md) は方向を示し、milestoneは順序を示します。GitHub Projects（ボード）は同じデータへの任意のビューです。

## 正本データの所在

- バックログ: [issue #74](https://github.com/jimoto-no-llm/rustdsh/issues/74) と、`docs/proposals/` 起点のfeature issue。
- 優先度: `P0` critical / `P1` high / `P2` normal / `P3` backlog。component/typeラベル（`bug`、`enhancement`、`performance`、`docs`、`dashboard`、`installer`、`security`、`ci`、`release`）が作業の性質を説明します。定義は [.github/labels.yml](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/labels.yml) にあります。
- 順序: milestoneは `v0.3.3`（Now、shipped）、`v0.4.0`（Next）、なし（Later）。`ROADMAP.md` はminor release時にだけ変更します。
- 管理設定: `docs/PROJECT-SETUP.md` と [issue #11](https://github.com/jimoto-no-llm/rustdsh/issues/11)。

## ボード (Projects v2)

現行ボードは [rustdsh roadmap](https://github.com/orgs/jimoto-no-llm/projects/1)（org project #1、非公開）。ボードは1つ、statusでグループ化します。

- 列は `Todo` / `In Progress` / `Done`（内蔵のStatusフィールド）。
- priorityはLabelsフィールド（`P0`〜`P3`）、リリースはMilestoneフィールド（`roadmap`、`v0.3.3`、`v0.4.0`）でスライス。
- 初期値は #74（backlog index）、`P0` 6件と `P1` 14件、すべて `Todo`。
- `Done` はmainへマージされPRによって閉じられた状態を指すだけで、review済みを意味しません。

ボードはあくまでビューです。優先度とmilestoneはissue自体に置かれるため、ボードを組み直しても作業の所在は失われません。

## トリアージ規則

1. 新しいissueには必ず優先度1つ（`P0`〜`P3`）とareaラベル1つを付けます。優先度が無いままだと `Inbox` に留まります。
2. `P0`〜`P1` にはmilestone（`v0.4.0` または `roadmap` バケット）が必要です。`P2`〜`P3` は不要です。
3. issueフォーム（bug / feature / performance / docs）を使い、`rdsh --version`、`rdsh doctor`、OS/shell、再現手順を添えます。
4. 週次: `Inbox` を空にし、staleな `needs-repro`（30日超・ping1回）を閉じ、最大3件を `P1 Next` へ昇格します。
5. PRは `CONTRIBUTING.md` に沿って小さく・単一topicで保ちます。

## Milestone

- [`roadmap`](https://github.com/jimoto-no-llm/rustdsh/milestone/1): トリアージバケット。確認時点で40件open。
- [`v0.3.3`](https://github.com/jimoto-no-llm/rustdsh/milestone/2): Now、shipped（委譲パリティ、installer digest registry、dashboardの強化（hardening）、credential lock互換）。
- [`v0.4.0`](https://github.com/jimoto-no-llm/rustdsh/milestone/3): Next（ワンクリック翻訳、保留中のsecurity review、Windows flake、routing実験、doctor検査、`install.ps1` registry）。

```sh
# ラベル（管理ファイルが正本）
sh scripts/sync-labels.sh

# issueをボードへ追加
gh project item-add 1 --owner jimoto-no-llm \
  --url https://github.com/jimoto-no-llm/rustdsh/issues/＼number］
```

ボードとmilestoneの編集はmaintainerが必要です。この文書をマージするだけではリモート側は変更されず、新バージョンのリリースも行われません。

## 関係図のまとめ

| データ | 正本の場所 | 役割 |
| --- | --- | --- |
| 作業の存在 | issue（#74 索引＋各feature issue） | 何をするか |
| 方向 | `docs/ROADMAP.md` | どちらへ向かうか |
| 順序 | milestone（`v0.3.3`/`v0.4.0`/`roadmap`） | いつ頃か |
| 優先度・type | `labels.yml` のラベル | 性質と重み |
| 表示 | GitHub Projects ボード | 見た目の整理 |

## 実務上の注意

- ボード自体が正本ではありません。状態の更新はissueとmilestoneで行い、ボードは表示に徹します。
- 「簡単にreview済み」はDoneではありません。mainへのマージとPRクローズまでが完了です。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/PROJECTS.md
