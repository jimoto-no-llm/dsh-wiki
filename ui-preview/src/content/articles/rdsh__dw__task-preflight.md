---
title: "タスク前提条件診断"
desc: "DSHのACPプロセスを起動する前に、そのタスクに選択された前提条件を検査します。既存のRust rdsh doctor のwrapper/auth在庫実装を補完し、バージョン検証"
cat: "rdsh-dw"
catLabel: "rustdsh 調査"
chars: 3255
slug: "rdsh/dw/task-preflight"
---

# タスク前提条件診断

DSHのACPプロセスを起動する前に、そのタスクに選択された前提条件を検査します。既存のRust `rdsh doctor` のwrapper/auth在庫実装を補完し、バージョン検証済みCLIアダプタを再利用します。profile boot の実装、権限の付与、OS修復、モデルpromptの実行は行いません。

## 要件の入力

呼び出し側がタスク契約から別途提供する前提条件の記述を使います。実行契約や承認契約ではありません。

```json
{
  "schema": 1,
  "cli": "dsh",
  "profile": "acp",
  "min_free_bytes": 16777216,
  "port": 38400,
  "required_files": ["build/manifest.json"]
}
```

| 要件 | 観察 |
| --- | --- |
| Node | このdashboard/adapterクライアントにはNode 22以上が必要 |
| cwd | 既存の正準ディレクトリ。診断が作ることはない |
| CLI / profile | 明示的な本家実行可能物、対応バージョン、ACP profile |
| `min_free_bytes` | cwdファイルシステムの空き容量。無指定なら不要 |
| `port` | ループバックのbindテスト。観察でありポート予約ではない |
| `required_files` | プロジェクト内の依存ファイル。traversalは拒否 |
| `wsl` | 任意 `{ "distribution": "FlashNext" }`。distributionが応答するか確認 |
| `gpu` | 任意 `{ "min_free_mib": 8192 }`。NVIDIAドライバの在庫と可視性を確認 |
| `auth` | 任意 `{ "provider": "openai" }` または `deepseek`。選択したAPI-key検証を要求 |

未選択 のGPU・WSL・CLI・auth検査は読み出さず `not_required` を返します。他のCLIアダプタと非ACP profileは明示的に未対応です。NVIDIA在庫はドライバから見える空きメモリを確立しますが、CUDAワークロードの互換性は証明しません。WSL probingは指定済みの既存distributionを使い、作成や差し替えはしません。

## 実行と解釈

```sh
node dashboard/preflight.mjs --project /workspace/project \
  --requirements /workspace/task-prerequisites.json \
  --executable /absolute/path/to/original-dsh
node dashboard/cli.mjs preflight --project /workspace/project \
  --requirements /workspace/task-prerequisites.json \
  --executable /absolute/path/to/original-dsh
```

スタンドアロンentrypointはCLI固有検査の前にNode標準builtinを使うため、`npm ci` 前にdashboard依存の欠落を報告できます。Node entrypointはさらに `--entrypoint /absolute/path/to/bin.js` を指定できます。

各項目は status、観察時刻、stage（`existence` / `configuration` / `communication`）、reason、最小の該当fixを記録します。JSON reportはコピー可能で、クレデンシャル値、任意のpeer出力、応答本文、元タスクJSONはechoされません。blockedなreportはexit 1です。`ready` は宣言された前提条件について、その観察時点だけの判断です。実行権限・モデル接続・quota・routing・承認の主張はしません。

セッション作成やresumeをgateするには、同じ要件を明示的に渡します。

```sh
node dashboard/cli.mjs session-ledger start --project /workspace/project \
  --requirements /workspace/task-prerequisites.json \
  --executable /absolute/path/to/original-dsh
```

`attachRecordedSession({ ledger, command, requirements })` は、pending ledger recordやネイティブCLIセッションの作成前に新鮮なpreflightを実行します。resumeは記録されたcwdを使います。gate失敗は安全な報告を `PreflightError.report` で持たせます。既存のネイティブID/コンテキスト検査は引き続き適用されます。

## 認証のスコープ

クレデンシャルの存在は設定の観察であり、認証成功では決してありません。必要なauthは明示的な検証まで blocked のままです。`--verify-auth` を付けると、選択したプロバイダに対して正確に1回のGETを送ります（[OpenAI models](https://developers.openai.com/api/reference/resources/models/methods/list) または [DeepSeek models](https://api-docs.deepseek.com/api/list-models/)）。それぞれ `OPENAI_API_KEY` または `DEEPSEEK_API_KEY` だけを使います。エンドポイントは固定で、リダイレクトは拒否します。リクエストはモデルpromptを送りません。タイムアウト、無効クレデンシャル、不正応答、到達不能プロバイダはblockedのままです。

成功のスコープはmodel-list接続です。DSH provider経路の検証やモデル実行の検証はしません。OAuth/subscriptionクレデンシャルはプロバイダ固有の検証経路が別に必要で、scanも輸入も黙った差し替えもしません。既定ではネットワーク検証もクレデンシャルimportも起きません。

実ローカル観察とfixtureのみの認証/失敗ケースは [captured commands and validation](https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/evidence/task-preflight.md) を参照します。

## 実務上の注意

- `port` はあくまでbind観察です。実行までの間に別プロセスへ奪われる可能性は残ります。
- 認証検証は「API-keyでmodel-listが見える」だけの検査です。モデル実行経路・quota・課金までは保証外と心得る。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/TASK-PREFLIGHT.md
