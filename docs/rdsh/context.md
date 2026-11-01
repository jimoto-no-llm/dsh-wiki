# rdsh のコンテキスト入力

`rdsh context` による文脈の注入と、同じセッションへの追指示・入力順の契約を説明します。

## コンテキスト注入（rdsh context inject）

`rdsh context inject` は、そのターンの文脈（goal・constraints・decisions・作業対象ファイル・Git 状態・検索結果・管理された記憶）を組み立て、DSH の `UserPromptSubmit` フック契約で出力します。コピペなしでモデルに届きます。

```sh
rdsh features on context_engine        # コンテキストエンジンはオプトイン（既定 OFF）
rdsh context hook install              # $DSH_HOME/hooks.json に追記（冪等）
rdsh context hook status --json
```

フックは fail-open で、プロンプトを止めず常に exit 0 です。壊れた索引や期限超過では依存グラフや検索だけを落とし、goal・constraints・記憶は出し続けます。注入にはトークン予算（`context.inject_budget`、既定 1200）と期限（`context.inject_deadline_ms`、既定 1200ms）があり、期限を過ぎたら検索と依存閉包を省略します。

記憶は会話ログの丸写しではなく、管理された項目です：

```sh
rdsh context remember "APIの互換性を必ず保つ" --kind constraint
rdsh context distill --session ＼session.v4.jsonl.zstd］ --apply
rdsh context memory --json      # active と superseded を区別して表示
rdsh context forget mem_ab12cd34ef56
```

`distill` はユーザー発話だけを読み、決定・制約・撤回を決定的なマーカーで抽出します。重なる古い項目は推測ではなく `superseded_by` で無効化します。`rdsh context build --require-stable` は、組み立て中にファイルや git 状態が変わった、または git 状態を読めない場合に exit 3 で終了し、古い・不明なスナップショットを新しいものと誤認させません。

## 依存グラフと変更影響（rdsh deps）

```sh
rdsh deps build                    # $DSH_HOME/rdsh-index に増分索引を作る
rdsh deps query engine_score       # シンボルの定義元と参照元
rdsh deps impact src/context.rs    # 直接・推移的な依存元と影響するテスト
```

抽出は Rust・JavaScript/TypeScript・Python・Go に対応し、size と mtime が同じファイルは再解析しません。動的 dispatch やマクロ・生成コードは `unknown` として明示し、推測で埋めません。索引が無い場合の欠落は「情報が無い」ことであり「依存が無い」ことではありません。索引があるときは `rdsh context build` と `inject` も検索で当たったファイルの依存近傍を取り込むため、抜粋が実際に依存しているファイルと一緒に届きます。

## 同じセッションへの追指示と入力順

既存の入力順（INPUT-QUEUE-ORDERING.md）と回答適用の契約を使い、ブラウザーの「同じsessionへ追指示を送る」から元の run/session へ余計な新規セッションを作らず追指示を保存・送信します。

- 追指示は `input_＼UUID］` のIDで保存され、同じID・同じ内容の再送は同じ記録を返し、同じIDで別内容は 409 になります。
- 保存・送信開始・元の CLI の応答は分けて表示されます。送信開始は永続 claim の取得であり、1件の native 効果に対して高々1回。
- 適用タイミングは「次ターンへ追加」のほか、現ターンへの steer は未検証のため次ターン待ちと明示、「明示中断して変更」は人間の確認した入力だけに cancel を送ります。cancel は ACP 通知なので、correlated な取消し応答が確認できない限り「中断成功」としません。
- 先行する保存・読取・開始・結果不明の入力は、後続 input の begin claim をブロックします。応答には `waiting_for` が付き、既知の待機は失敗や不明として扱われません。
- 下書きは project・consumer ごとに `sessionStorage` で保持され、queue revision が変わった場合は人間が「追加」「中断」「取り下げ」を選びます。本文の意味を自動判定する機能ではありません。

`rdsh-dashboard` 側にも `instruction submit` / `resolve` や bot 中断の承認を含む公開 CLI・HTTP 入口があり、管理エージェントの投稿は人間の確認待ちになります。

## 出典

- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/INPUT-INSTRUCTIONS.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/INPUT-QUEUE-ORDERING.md>
- <https://github.com/jimoto-no-llm/rustdsh/blob/main/README.ja.md>
