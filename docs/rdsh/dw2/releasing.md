# リリース手順 (Releasing)

## リリース契約

正本のリポジトリは [jimoto-no-llm/rustdsh](https://github.com/jimoto-no-llm/rustdsh) です。セマンティックバージョニングと**注釈付き**タグを使います。安定版は `vX.Y.Z`、候補は `vX.Y.Z-rc.N`（`alpha.N` / `beta.N`）。タグ、`Cargo.toml`、`Cargo.lock` 内の `rdsh` エントリ、CHANGELOGの日付きエントリが一致しなければなりません。dashboardの専用パッケージは独自のバージョンを持ち、リリースバイナリではありません。

[v0.2.0](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/releases/v0.2.0.md) が今後のリリース形式を定義します。

1. `## X.Y.Z — 短い要約` と変更点の簡潔な一覧。
2. `## 更新前に確認`: 対応プラットフォーム、ランタイム要件、互換性、移行と再起動の手順。移行不要ならその旨を明示します。
3. `Install/update:`: UnixコマンドとWindows `install.ps1 -FromRelease` の手順。
4. GitHub生成の `What's Changed`: マージ済みPRリンクと作者のクレジット、任意の `New Contributors`、`Full Changelog` 比較。
5. リポジトリCHANGELOGへのリンク。

前半3部は `docs/releases/vX.Y.Z.md` に [TEMPLATE.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/releases/TEMPLATE.md) を使って執筆します。workflowが [.github/release.yml](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/release.yml) で生成部を追記します。v0.2.0の単一PR一覧を保ち、contributorを落としたり前バージョンのPRを手動コピーしません。スクリプトは既存の生成部を置き換えるため再実行で複製しません。生成の失敗は公開を止めます。

## 準備と検証

1. `main` 向けのリリース準備PRを作ります。`Cargo.toml` を更新し、`cargo check` で `Cargo.lock` を更新、`cargo check --locked` で確認します。リリース済みの変更を `Unreleased` から移し、新CHANGELOGエントリに日付を付けます。
2. `docs/releases/TEMPLATE.md` をバージョン名にコピーし、全プレースホルダを埋めます。日本語のユーザー向け注記、プラットフォーム制限、インストールコマンドを正確に保ちます。候補版では `/releases/latest/download/` を `/releases/download/vX.Y.Z-rc.N/` に置き換えます。
3. メタデータとパッケージングの検査（Python 3.11+）:

```sh
python3 scripts/prepare-release.py vX.Y.Z
python3 -m unittest discover -s tests -p 'test_release_*.py'
```

   podman/docker環境では、ビルド済み成果物をきれいなコンテナ内にインストールします。古いglibcやmuslの新規マシンへのインストールを保つ確認であり、タグ付けの前に実行します:

```sh
tests/install-isolated.sh --source local --require-musl
```

   同じharnessでも `--source published --installer published` はユーザーが実際に入手するinstallerを確認し、`.github/workflows/install-live.yml` が週次で実行します。ここで失敗すると公開チャンネルが壊れていることを意味し、タグの移動でなく新しいリリースが必要です。
4. [CONTRIBUTING.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/CONTRIBUTING.md) の検証マトリクス全体（Rust fmt、clippy、releaseテスト、回帰、dashboardテスト、ブラウザE2E）を走らせます。必須チェックが通ったレビュー済み準備PRだけをマージします。タグ前に、マージ後の `main` コミットそのものの必須チェックを完了させます。リリースworkflowは、そのコミットのmain祖先関係とCI状態を開始前に再検証します。
5. 認証済み `gh` CLIで実際のリリースbodyをプレビュー:

```sh
python3 scripts/prepare-release.py vX.Y.Z --repo jimoto-no-llm/rustdsh --previous-tag vPREVIOUS --output /tmp/rdsh-release-notes.md
```

   ローカルファイルを生成するだけで、タグ作成・公開はしません。PR範囲・クレジット・比較URL・インストールコマンドを確認します。比較baseの選択はノートの執筆部に `<!-- previous-tag: vPREVIOUS -->` を先に記録し、プレビューと自動公開の両方がそれを読みます。`--previous-tag` は確認できても記録値を上書きできず、コメントが無ければフラグを付けずGitHubに任せます。
6. 検証済みのリリースコミットから注釈付きタグを作成しpushします。

```sh
git tag -a vX.Y.Z -m "rustdsh vX.Y.Z: short summary"
git push origin vX.Y.Z
```

タグpushがリリースworkflowと通常の `ci.yml` push workflowを開始します。リリースworkflowは、タグがpushされた正確なSHAに解決すること、そのSHAが `main` の祖先であること、その正確なタグpushで起きた `ci.yml` の完了を検証します。最大15分待ち、タグコミットの必須チェックがすべて存在して成功することを要求します。欠落・queued・実行中・失敗・cancelどれでもビルドと公開を停止します。CIの完了が待ち時間を超えるときは、終了後に失敗した `cd` jobだけを再実行できます。既存のstaged artifactsを再利用します:

```sh
gh run rerun ＼cd-run-id］ --failed
```

## ビルドと公開

`cd` workflowは、不正・lightweightなタグ、`main` 外のタグ、正確SHAのtag-push CIが欠落・未成功のケース、バージョンの不一致、CHANGELOG欠落、不完全なリリースノートをまず拒否します。タグコミットの必須チェックがすべて成功した後に `cargo build --locked --release` で5ターゲットをビルドします。必須チェック名は `scripts/release_ci.py` にあり、CI job名の変更はこの一覧とテストにも反映します。

| プラットフォーム | アーカイブ |
| --- | --- |
| Linux x86_64 (glibc) | `rdsh-linux-x64.tar.gz` |
| Linux x86_64 (musl) | `rdsh-linux-x64-musl.tar.gz` |
| macOS arm64 | `rdsh-macos-arm64.tar.gz` |
| macOS x86_64 | `rdsh-macos-x64.tar.gz` |
| Windows x86_64 | `rdsh-windows-x64.zip` |

各アーカイブに `.sha256` sidecarが付きます。`install.sh` と `install.ps1` を加えてリリース資産は計12件です。ビルドはActions artifactsへ置き、最終jobだけがリリースへの書き込み権を持ちます。完全なローカルセットを検証し、draftを新規作成または再利用して一度だけuploadし、実際にupload済みの資産を再取得して再検証します。不完全または壊れた資産は公開を止めます。

安定版は `latest` として公開します。候補は `prerelease=true`・`latest=false` で、現行の安定パッケージ経路を保ちます。workflowは公開済みリリースの上書きを拒否します。draft再試行は既存資産と検証済みローカルセットを比較し、同一ファイルを再利用して不足だけuploadします。相違や未知の資産があればupload前に停止し、資産を削除・上書きしません。同じタグでも再ビルドのarchiveは変わり得るため、元のstaged artifactsを残す間（約7日）に成功済みjobを再実行せず、失敗jobだけやり直します。同じタグの同時実行は直列化され、upload完了中の取り消しはしません。

## アンナウンスとタグ保護

`install.sh` は固定の `raw.githubusercontent.com/jimoto-no-llm/rustdsh/main` URLから取得した `release-digests.tsv` でUnix archiveを検証します。`RDSH_RELEASE_BASE` が提供するchecksumは信頼せず、上書きはテスト専用の `RDSH_RELEASE_DIGESTS` のみです。リリースの検証後、アンナウンスやインストール誘導の前に、review付きPRで `latest` 行の更新と、GitHub報告の各 `.tar.gz` 資産のSHA-256を追記します。明示的な `--version` インストール用に古い行を保持します。pinはリリース `.sha256` sidecarからは導出しません。

公開後はbody・12資産・正しいchannelを確認し、実際の資産を検証します。

```sh
gh release download vX.Y.Z --repo jimoto-no-llm/rustdsh --dir /tmp/rdsh-vX.Y.Z-assets
python3 scripts/verify-release-assets.py /tmp/rdsh-vX.Y.Z-assets

# installer registry用: GitHub自身の資産digestを読み sha256: 接頭辞を除去
gh api repos/jimoto-no-llm/rustdsh/releases/tags/vX.Y.Z \
  --jq '.assets[]|"\(.name) \(.digest)"'
```

更新した `release-digests.tsv` を新しい安定channelのアンナウンス前にreviewします。`latest` 行にはGitHubがLatestと表示するリリースを指名します。READMEのインストールコマンドをきれいな環境で確認し、アンナウンスは公開ノートを使います。ビルド失敗はstaged artifactsを残留させ、upload・検証の失敗はdraftを残します。不完全なdraftを手動公開しません。

公開済みリリースに修正が必要になったときは、公開タグから分岐して、review付きPRで修正し、patch版を上げ、CHANGELOGとノートを更新して**新しい**注釈付きタグを作ります。リリース範囲が前リリースと変わるときは、ノートに正しい `previous-tag` コメントを入れてプレビューします。タグの移動・削除は絶対にしません。[Protect release tags](https://github.com/jimoto-no-llm/rustdsh/blob/main/.github/tag-ruleset.json) rulesetが `v*` タグの更新・削除をブロックし、新規作成は許します。`cd` の再実行に既存タグのpush替えをせず、Actionsで失敗jobを再実行するか、公開済みなら訂正版をpatchバージョンで出します。

## 実務上の注意

- タグは注釈付き・「マージ後の検証済みmainコミット」限定です。未レビューコミットにタグを打つ方法はありません。
- アーカイブ内容は同じタグでも再ビルドで変わります。リリースのやり直しは、staged artifactsが保持されている7日以内に失敗jobの再実行で行い、成功jobの再ビルドは避けます。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RELEASING.md
