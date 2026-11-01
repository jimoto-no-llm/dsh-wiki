# rdsh plugin — 本家 `dsh` plugin への透過委譲

rdsh 固有の再実装ではなく、本家 `dsh` の `plugin` コマンドをそのまま透過的に委譲する経路です。README.ja.md の Smart-DSH 節では `rdsh plugin --profile web add /path/to/bundle` を「プラグインの追加（dsh plugin と同等）」として案内しています。プラグイン管理のため、本家 `dsh`（`@deepseek-ai/dsh`）が PATH に必要で、委譲前に認証情報の取得（best-effort mirror）も行われます。

## オプション／引数

| 引数 | 既定 | 説明 |
| --- | --- | --- |
| `--profile name`（または `--profile=＼name］`、最初の位置引数） | 必須 | 操作対象のプロファイル名 |
| pnpm 引数（残り全部・例 `add package`） | 必須 | 本家 `dsh plugin` へそのまま渡す引数 |
| `--dry-run`・`--slim` 等のランチャー側オプション | 既定 | 委譲前に rdsh 側で解釈され、実行コマンドの生成に反映 |

## 使用例

```sh
rdsh plugin --profile web add /path/to/bundle   # プラグインの追加（dsh plugin と同等）
rdsh plugin --profile desktop add /repo/plugins/rdsh-settings   # desktop 用（README のデスクトップ節）
rdsh --dry-run plugin --profile web add /path/to/bundle   # 委譲されるコマンドの内容だけを確認
```

## 既定値・注意

- `plugin` は rdsh のネイティブサブコマンド一覧（NATIVE_FIRST）には入っていません。rdsh として起動した場合だけ専用の委譲経路に入り、`dsh` コマンド名で導入された（--as-dsh）場合は元の `dsh` 直行に近いバイト一致を保ちます（`dsh plugin` のまま）。
- pnpm 引数が無いときは "error: plugin needs pnpm arguments (add package) (e.g. add package>)"、`--profile` が無いときは "error: profile name is required" で停止します。
- 本家 `dsh` が見つからない場合は "original dsh not found in PATH (set DSH_ORIG_BIN)" で停止します。
- Desktop（Electron）アプリの desktop プロファイルへのプラグイン追加は、通常のプロファイルと異なり Desktop コマンドランタイム経由のため、`rdsh desktop install` の専用経路を使います。README.ja.md では「プラグインを組み込む前にアプリを終了し、完了後に再起動してください」と案内されています。追加は読み取り専用の `rdsh desktop status` と `rdsh desktop verify`（必須プラグインが有効でなければ 0 以外で終了）と組み合わせて確認します。
- 委譲経路では本家 `dsh` 起動前に認証情報の best-effort ミラーが行われ、`--slim` / `--no-slim` の slim 環境も委譲先にそのまま反映されます（実装補足）。
- `--profile` 以降、最初にフラグでない引数が現れた時点で残りはすべて pnpm 引数として渡されます。プロファイルを位置引数として渡す書式はありません。
- 本家 `dsh` plugin がサポートする操作（`add` など）は本家側の仕様で、rdsh は引数を変形しません。web プロファイルへまとめて導入する手順は README.ja.md の `PROFILE=web ./plugins/install.sh` です。
- `dsh` コマンド名で導入した場合（`--as-dsh`）は、`dsh plugin …` は rdsh 固有処理を経ずに本家 `dsh` へそのまま渡ります。このため既存のスクリプトはこのコマンドでは動作が変わりません。
- 委譲先では本家 `dsh` の plugin サブコマンドが実行されるため、plugin 命令の反映は DSH の再起動後（または再読込後）です。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「Smart-DSH との併用」「デスクトップアプリ (Electron)」節）
- docs: [docs/RDSH-SETTINGS.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md)（rdsh 設定画面が入っていないときの導入例 `PROFILE=web ./plugins/install.sh`）

### 実装（src/dsh_args.rs・src/passthrough.rs）から補足

- "plugin" の引数解析（`--profile` の両書式、`--profile` 以降は残り全部を pnpm 引数として渡す）、本家 `dsh` への `dsh plugin --profile … …` を生成する委譲、`--dry-run`・`slim` 環境の反映。
