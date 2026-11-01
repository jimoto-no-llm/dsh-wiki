---
title: "rdsh の安全設計"
desc: "rdsh の安全に関する設計方針と、隔離・監視・設定の仕組みを説明します。"
cat: "rdsh"
catLabel: "rustdsh"
chars: 1638
slug: "rdsh/security"
---

# rdsh の安全設計

`rdsh` の安全に関する設計方針と、隔離・監視・設定の仕組みを説明します。

## 設計方針（README.ja.md の安全設計）

1. **本家挙動の透過性**: 会話ループやモデル推論は独自実装せず、すべて本家 `dsh` に委譲して互換性を担保します。
2. **非破壊設計**: トークン計算、検索、ログ圧縮などの読み取り系コマンドは、既存のファイルを一切変更しません。
3. **明示的な認証管理**: 他アプリの認証情報を無断で同期・送信せず、利用者が明示的に指定したものだけを取り込みます。
4. **サンドボックス隔離**（オプトイン）: Linux 環境では、`--share-file` で共有したファイルだけを読み取り専用・ネットワークなしで渡します。
5. **既定値の明示**: 機能スイッチの既定値が明記され、`rdsh features` で一覧・切替できます。

## エージェント実行の安全な隔離

委譲したエージェントツールは既定で通常のファイル読み書きができます。Linux で bubblewrap と prlimit がある環境では、`--share-file` で明示的に共有したファイルだけに限定されます：

```sh
rdsh --share-file README.md --share-file src/main.rs --profile tui
```

共有ファイルは読み取り専用でマウントされ、ネットワークアクセスもありません。`rdsh features on agent_tool_sandbox` で常時有効化、`rdsh features off agent_tool_sandbox` で無効化、`RDSH_SECURITY=1` で強制できます。

## フック監視 (rdsh guard)

DSH の `hooks.json` と連携し、危険なコマンド実行を検知・遮断します：

```sh
echo "$input" | rdsh guard --deny "rm -rf /*" --deny "*token*"
```

任意の policy file を指定すると、既知のファイル操作 schema を構造で判定できます。対応するのは `Read`・`Write`・`Edit` の path で、作業ディレクトリと対象 path を正規化し、read/write 範囲を既存 root に照合して、秘密を含まない理由とともに `allow`・`deny`・`unknown` を返します。この `allow` は分類結果だけで、最終的な権限判断はホスト側に残ります。未知の tool、shell コマンド、壊れた入力は fail closed です。shell 構文解析やネットワーク先の判定は未対応で、実行の強制には OS sandbox を使ってください。

## 設定画面と設定の安全な扱い

DSH の「設定」画面（左メニューの「rdsh」）から、検索・圧縮・記憶や実験的機能を変えられます。コマンドでは `rdsh settings show` / `get` / `set` / `unset` が使え、設定は `$DSH_HOME/rdsh.json` に保存されます。

設定破損時は読み込みを止めます。元のファイルを退避し、既定値へ戻すと決めた場合だけ `rdsh settings init --force` を実行します。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/RDSH-SETTINGS.md>
