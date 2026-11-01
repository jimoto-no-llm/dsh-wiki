# Python SDK

公開済みのPython SDKを入れ、同梱のスタンドアローンミニマルプロファイルを実行し、自分のプログラムから同じ dsh プロファイルをカスタマイズする手順を紹介します。

## 前提条件

- Python 3.10 以上 / Git / DeepSeek互換のAPIエンドポイントと認証情報
- Linux x64、Linux arm64、macOS 14以降（arm64）、Windows x64
- 切り離されたワークスペースとHarnessホーム

## インストール

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
python -m venv .venv && . .venv/bin/activate
python -m pip install deepseek-harness-sdk
```
Windows PowerShellでは `py -3.10 -m venv .venv` で作り、`.venv\Scripts\Activate.ps1` で有効化してから pip で入れます。インストールには対応するネイティブランタイムwheelと dsh コマンドが含まれ、通常のSDK実行にシステムのNode.jsは不要です。

```sh
export DEEPSEEK_API_KEY=sk-your-key-here
python python/sdk/examples/minimal.py \
  --workspace /absolute/path/to/disposable-workspace \
  --dsh-home /absolute/path/to/example-dsh-home \
  --session-id example-001 \
  "Inspect the repository and fix the failing tests."
```
スクリプトは最終アシスタント応答か、選択したプロファイルが返すコマンド結果を表示します。例とSDKは暗黙に ~/.dsh を読みません。

## プログラムから使う

```python
from deepseek_harness import DeepSeekHarness

with DeepSeekHarness(provider="deepseek-official", model="deepseek-v4-flash",
                     max_tokens=49_152, cwd=str(workspace), dsh_home=str(dsh_home),
                     profile="sdk-minimal") as harness:
    result = harness.run("Inspect the repository and fix the failing tests.",
                         session_id="example-001")
print(result.final_response)
```
SDKは同梱の `dsh --profile sdk-minimal` プロセスを遅延起動し、コンテキストマネージャを抜けるまで再利用します。プロファイル・永続パッチ・ホームパッチ・順序付き patches タプルがアプリケーション設定を構成します。bundled ランタイムの str_replace_editor は sdk-minimal から外れているので、insertパッチを patches で渡すか `$DSH_HOME/profiles/sdk-minimal/cordis.patch.yml` に置くと次回起動から使えます。

## ミニマルプロファイルの性質

- モデル側ツールはLinux/macOSの永続 bash（Windowsは pwsh）、read_image、working_directory。シェルタイムアウトは300秒。
- 文脈圧縮は自動で、過去履歴を追加のモデル要求で要約します。セッションは `＼dsh_home］/sessions` の非圧縮JSONLです。
- 唯一のバンドルは空ルート上にツリー全体を挿入し dsh-base を含まないため、ベースプロファイルのツールが暗黙に現れることはありません。
- 権限は danger-full-access 固定です。使い捨てのチェックアウトやコンテナで動かし、画像読み取りには画像対応ルートが必要です。
- wheelには完全な web プロファイルも入っています。別の DSH_HOME で `dsh web` を実行してください。webは別CLIアプリであり、Python SDKクライアントを提供することはできません。分離が必要なら新しいホームを、独立した作業には新しいセッションidを用意してください。再利用は同一の持続会話を続ける場合だけです。

## 出典

- [docs/user/guide/python-sdk.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/python-sdk.md)
