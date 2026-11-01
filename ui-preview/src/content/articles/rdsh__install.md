---
title: "rdsh のインストール"
desc: "rdsh は dsh を速く・安全に起動する Rust 製ランチャーです。このページでは導入手順と動作環境を説明します。エージェントとの会話には本家 DeepSeek Harnes"
cat: "rdsh"
catLabel: "rustdsh"
chars: 1878
slug: "rdsh/install"
---

# rdsh のインストール

`rdsh` は `dsh` を速く・安全に起動する Rust 製ランチャーです。このページでは導入手順と動作環境を説明します。エージェントとの会話には本家 DeepSeek Harness（`dsh`）が必要ですが、トークン計算やテキスト検索などの独立ツールは本家 `dsh` なしでも単体で動作します。

## 本家 dsh の導入（未導入の方）

Node.js と npm を用意し、npm registry の `@deepseek-ai/dsh`（bin 名: `dsh`）を `npm install -g @deepseek-ai/dsh` でグローバルに導入します。

## rdsh の導入（ビルド済みバイナリ）

**Linux / macOS / WSL**:

```sh
curl -fsSL https://github.com/jimoto-no-llm/rustdsh/releases/latest/download/install.sh | bash -s -- --from-release
```

**Windows (PowerShell)** は `install.ps1` を `$env:TEMP` へ取得して `& $f -FromRelease` のように実行します（手順は README.ja.md 参照）。

## 動作確認と初期セットアップ

```sh
dsh --version && rdsh --version && rdsh doctor   # 本家 dsh と rdsh の双方を確認
rdsh setup                      # 対話式セットアップ（rdsh setup --web はブラウザから設定）
```

`rdsh doctor` は本家 `dsh`、環境変数、パスなどの健全性を診断します。OpenCode や Codex CLI（ChatGPT OAuth）などにログイン済みの場合、`rdsh auth --import --provider openai-codex` で認証情報を取り込めます。認証情報は明示的に指定したものだけを取り込み、無断で外部送信しません。

## ソースからのビルド

ビルド済みバイナリを使う場合は Rust は不要で、ソースからビルドする場合のみ Rust 1.85 以上が必要です。Windows ネイティブのビルドには Rust と MSVC ビルドツールが必要です。

```sh
git clone https://github.com/jimoto-no-llm/rustdsh.git
cd rustdsh
./install.sh                 # ~/.local/bin/rdsh にインストール（--as-dsh で dsh コマンド名に置き換え）
```

Windows ネイティブでは `install.ps1`（`%LOCALAPPDATA%\rdsh\bin` にインストール）を使い、`-Restore` で置き換えを復元、`-Wsl` で WSL 側にも連動インストールできます。

## 動作環境

動作 OS は Linux・macOS・WSL・Windows（ネイティブ）です。DSH 本体は会話実行に必要で、Node.js / npm はその導入時のみ、Rust はソースからビルドする場合のみ 1.85 以上が要ります。任意で、Node.js ダッシュボードには Node.js 22 以上、`search-web` には SearXNG を使えます。

## dsh 互換での実行

普段使っている `dsh` と同じ引数でそのまま動きます。`rdsh tui` は `dsh --profile tui` と同等で、`rdsh --profile web --patch x.yml` のように追加設定を重ねた起動もできます。`--dry-run` を付けると実行コマンドの内容だけを確認できます。

`./install.sh --as-dsh` で導入した場合、`dsh` コマンドを実行するだけで自動的に `rdsh` の高速起動が適用されます。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
