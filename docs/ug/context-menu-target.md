# コンテキスト メニューの型とアイコン（v0.2.2-alpha.2）

Client プラグインは、接頭辞付きのコンテキスト メニュー型とフックを使い、キー付きのアイコン コンポーネントを登録するようになります。ターゲットのフィールドと実行時の挙動は変わりませんが、旧名への互換エイリアスは無いため、ソースの書き替えが必要です。

## 変更の内容

`@deepseek-ai/dsh-client-ui-context-menu/client` の export `MenuTarget` が `ContextMenuTarget` に改名され、`ContextMenuTargetMap` と嵌め合う名前になります。

| 対象 | 旧 | 新 |
| --- | --- | --- |
| ターゲットの型 | `MenuTarget` | `ContextMenuTarget`（`ContextMenuTargetMap` と接頭辞がそろう） |
| Workspace・サイドバーの注入 | `menuTarget` / `useMenuTarget` | `contextMenuTarget` / `useContextMenuTarget` |
| アクションのアイコン | React ノードを直接渡す | `{ key, src? }` を渡し、キー付きの `contextMenu.icon` Slot から描画する |

ターゲットのフィールドと実行時の動きの変更は無く、型・注入の改名とアイコンの受け渡しの差し替えだけが要ります。

アイコンは React ノードで受け渡す代わりに、`contextMenu.icon` Slot に登録したキー付きコンポーネントから描画されます。

## 移行の手順

1. `MenuTarget` の import と型参照を `ContextMenuTarget` に置き換えます
2. 注入した `menuTarget` ソースの名前と、`useMenuTarget` の消費側を `contextMenuTarget`・`useContextMenuTarget` に改名します
3. アクション アイコンの要素を `{ key: 'my-plugin.action' }` に置き換えます
4. 画像 URL を渡す必要があるときは、その URL を `src` に載せます
5. そのキーに対して、アイコン コンポーネントを `ctx.slots.inject('contextMenu.icon', ...)` と `ctx.slots.register()` で登録します
6. Client プラグインを再ビルドし、型チェックが通ることを確認します
7. メニューを開いて、アイコンの描画を確認します
8. プラグインを解除した状態からメニューを再度開き、落とし残しが無いことを確認します

`contextMenu.icon` Slot の使い方を含むメニュー パッケージの解説は、上流の menu パッケージ README（use-this-package 節）に文書化されています。

## 注意

- 改名は型の面と注入の面のどちらにも及びます
- `MenuTarget` の import と型注釈、`menuTarget` 注入のキーと `useMenuTarget` の参照を一括検索して、置換の漏れを残さないでください
- アイコンは React ノードのままでは受け付けられません
- 描画されないときは `key` と `contextMenu.icon` Slot 登録の対応を見直します
- プラグイン解除時にアイコン コンポーネントの掃除が走ることも、動作確認の対象にします

## 確認事項

- 再ビルド後、型チェックが通ることを確認します
- メニューを開き、自プラグインのアクションにアイコンが付くことを確認します
- プラグインを解除したとき、アイコン コンポーネントの掃除が走ることも確認します
- 旧名のままだとビルドが通らないので、残った参照を一括検索で見つけます
- アイコンの `src` には画像 URL を載せられます
- `contextMenu.icon` Slot への登録は `ctx.slots.register()` で確定します

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/upgrade-guide/v0.2.2-alpha.2/context-menu-target/guide.md
