---
title: "rdsh wait — 進捗表示つきの待機"
desc: "レート制限やバッチの待ち合わせなどで「指定した時間だけ黙って待つ」コマンドです。sleep との違いは、残り時間を1行表示し、Ctrl+C で正常終了（exit 0）できること、上"
cat: "rdsh-cmd"
catLabel: "rustdsh コマンド"
chars: 1940
slug: "rdsh/cmd/wait"
---

# rdsh wait — 進捗表示つきの待機

レート制限やバッチの待ち合わせなどで「指定した時間だけ黙って待つ」コマンドです。`sleep` との違いは、残り時間を1行表示し、Ctrl+C で正常終了（exit 0）できること、上限つきで誤った長時間待機を防ぐこと、結果を JSON で受け取れることです。Node.js を起動せず、追加クレートもしません。

## オプション

| オプション | 既定 | 説明 |
| --- | --- | --- |
| `--for ＼dur］` | なし（省略不可） | 相対待機。`s`/`m`/`h`/`d`/`w` を大きい順に連結可（`2h30m`）。単位なしは秒 |
| `--until ＼time］` | なし（`--for` と排他） | 絶対時刻。`HH:MM`、`HH:MM:SS`、ISO-8601（オフセット無しはローカル時刻）、エポック秒 |
| `--max <dur|NULL>` | `RDSH_WAIT_MAX` または既定12時間（`NULL`/`none` で無制限） | 1回の待機の上限 |
| `--json` | なし（off） | stdout に `{"waited_ms":…,"until_unix":…,"interrupted":…}` の1行を出力 |
| `--quiet` | なし（off） | 進捗行と終了メッセージを出さない |

## 使用例

```sh
rdsh wait --for 5m                 # 残り時間を 1 行表示。Ctrl+C で中断（exit 0）
rdsh wait --until 09:30            # 次に来る 09:30（過ぎていれば翌日）
rdsh wait --for 6h --json          # 終了時に JSON を stdout へ
rdsh wait --for 1h --max 10m       # 上限 10 分に切り詰め
RDSH_WAIT_MAX=NULL rdsh wait --for 20h   # 環境変数で上限なし
```

## 既定値・注意

- `--for` と `--until` は排他で、未指定・両指定とも exit 2 で理由を1行表示します。
- stdout は静かです（`--json` のときだけ終了時1行）。進捗は stderr に `\r` で前の行を消しながら1行だけ更新（短い待機は1秒ごと、10分超は1分ごと）。
- Ctrl+C で割り込んでも exit 0 です。`interrupted` 判定には `--json` を併用します。
- 上限の優先順位は `--max` > `RDSH_WAIT_MAX` > 既定12時間。切り詰めた場合は stderr に要求量・上限・実際に待つ量を1行出します。
- 不正な入力（`5x`、`30m2h`、`1h1h`、`5m30`、`0s` など）は exit 2 です。
- `--until` は DST 切替をまたぐ待機で1時間ずれる可能性があります（開始時にローカル時刻をエポックへ固定するため）。
- 進捗行は ANSI エスケープ（`\r` + カーソル行クリア）を使うので、`--quiet` 無効のまま stderr をリダイレクトすると制御文字が残ります。スクリプトからは `--quiet` か `--json` を併用してください。

## 出典

- UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md （「使い方 ＞ 待機と再試行ログ集計 (`rdsh wait` / `rdsh retry-log`)」節）
- docs: [docs/WAIT-AND-RETRY-LOG.md](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/WAIT-AND-RETRY-LOG.md)

### 実装（src/main.rs・src/shutdown.rs）から補足

- `--for` / `--until` の引数定義と `--max` の役割（`NULL` を含む）。Ctrl+C は `rdsh serve` などと同じ `crate::shutdown` のSIGINT/SIGTERM フラグを100ms間隔で見る方式で、シグナルハンドラの重複設置はありません。
