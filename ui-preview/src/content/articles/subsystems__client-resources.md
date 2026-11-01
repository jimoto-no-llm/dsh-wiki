---
title: "クライアントリソース"
desc: "クライアントリソースモデル（dsh-client-resources）は、Web Clientのコンポーネントに対して「アドレスを生データに変える」仕組みです。ctx.resour"
cat: "subsystems"
catLabel: "サブシステム"
chars: 3884
slug: "subsystems/client-resources"
---

# クライアントリソース

クライアントリソースモデル（`dsh-client-resources`）は、Web Clientのコンポーネントに対して「アドレスを生データに変える」仕組みです。`ctx.resources` サービスと標準フック `useResource` を提供し、ある種類のコンテンツを所有するパッケージは自分の **プロトコル** に対して1つの **プロバイダ** を登録します。コンポーネントは所有者のランタイムをimportせずに **アドレス** 経由で現在の状態を読みます。右サイドバーのタブが最初の消費者で、決定記録はclient resource modelのAgent Noteにあります。

## アドレス

リソースアドレスは `dsh-resource://＼type］/…` 形式のURLです。hostがプロトコル名で、`ResourceProtocolMap` のキーでなければなりません。pathはプロトコル固有のもので、各セグメントのpercent-encodeは所有者が行います。スコープが必要なプロトコルはpathに含めます（`file` プロトコルは `dsh-resource://file/session/＼sessionId］/＼path］`）。組み立ては `fileAddressFor(sessionId, cwd, path)`、読み戻しは `parseFileAddress(address)` が担います。モデル自体はschemeとhostだけを読み、`protocolOf(address)` は小文字化したhostを、それ以外には `undefined` を返します。

| アドレス | プロトコルキー | 読まれ方 |
| --- | --- | --- |
| `dsh-resource://file/session/s1/notes/a.md` | `file` | `file` プロバイダ登録済みのとき、セッションs1のワークスペースルート下 `notes/a.md` のメタデータ |
| `dsh-resource://file/absolute/home/me/notes.md` | `file` | 解析は可能だが `workspace-file/unknown-workspace` で失敗。承認するセッションがなく、現セッションやタブセッションも借りない |
| `DSH-RESOURCE://File/session/s1/a` | `file` | 別レコード。アドレスは文字列比較であり、`fileAddressFor` が吐く正規の小文字綴だけが受理される |
| `dsh-resource://subagentchat/session/c1?parent=p1&mode=continuable` | `subagentchat` | アドレス指定のサブエージェント会話。値はリソースが閉じるまで `SessionReference` を所有 |
| `sidebar://guide` | — | `none`。ナビゲーションアドレスでありリソースを名指さない |
| `/home/me/notes.md` | — | `none`。URLではない |

## プロバイダ登録

プロトコル所有者は `ResourceProtocolMap` に値型を宣言し、自分の `ctx.effect` 内で1つのプロバイダを登録します。プロトコルの寿命はプラグインの寿命と正確に一致します。`open(address, { signal })` は `RemoteResult` のフレーム列を返し、最初に現在の状態、以後は変化ごとに1フレームを流します。`signal` が abortしたら列を止めなければなりません。失敗は `ok: false` のフレーム（`RemoteFailure` 同梱）で表現され、列内のthrowは捕捉されないプログラミングエラーです。

```ts
ctx.effect(() => ctx.resources.register<'note'>({
  protocol: 'note',
  async *open(address, { signal }) {
    const id = new URL(address).pathname.slice(1)
    yield await ctx.remote.notes.read(id, signal)
    for await (const ch of ctx.remote.notes.follow(id, signal)) yield ch
  },
}), 'my-notes: note resource provider')
```

プロトコルに対してプロバイダはちょうど1つで、2つ目の登録はthrowします。保持中のアドレスがある状態で登録するとそれらの列を直ちに開き、プロバイダの解放は列を終端させ、プロバイダが戻るまでアドレスは `none` を読みます。

## 読み取り

スコープに関係なく、すべてのスロットコンポーネントはpropsに `useResource` を受け取ります。`useResource<P>(address)` はアドレスの現在スナップショットを返し、購読していること自体がリソースを開き続ける理由になります。別の保持者がいる間に流れた価値をmount直しで再表示する場合も、列を開き直さずに最新値を即座に読みます。

| `status` | 意味 | `value` | `failure` |
| --- | --- | --- | --- |
| `none` | プロトコルのプロバイダが未登録、またはアドレスがリソースアドレスでない | `undefined` | `undefined` |
| `loading` | プロバイダの列は開いたがまだ1フレームも流れていない | `undefined` | `undefined` |
| `live` | 最新フレームが成功 | 最新の `ok` 値 | `undefined` |
| `failed` | 最新フレームが失敗を報告 | 直近の `ok` 値（保持される） | フレームの `RemoteFailure` |

`failed` の提示は消費者側の責務です。モデルは失敗の横に直近の値を保つため、空白ではなくお知らせ付きの最新内容を表示でき、次の `ok` フレームで失敗が消えます。モデル自身はユーザー可視の文字列を一切生成しません。

## 保持と解放

リソースは保持者がいる間だけ生きています。保持者は購読中の `useResource` か、pinです。`ctx.resources.pin(address, signal)` は購読なしにリソースを開き続け、`signal` のabortまで維持します（abort済みのsignalでは何もpinしません）。右サイドバーは開いているタブレコードのアドレスを全てpinするため、タブ切替で本体がunmountしても列は閉じません。最初の保持者がプロバイダの列を開き、最後の解放が列をabortし、値を破棄して状態を `loading`（プロバイダあり）か `none`（なし）へ戻します。解放後に流れたフレームは棄てられ、iteratorはreturnされます。`ctx.resources.source(address)` はフックの背後にある素のobservableで、アドレスごとに参照安定です。React外の呼び出し先向けであり、そのスナップショット読み取りはリソースを保持しません。

多くの列は内容ではなくメタデータを流します。`file` プロバイダの値は `WorkspaceFileStat { absolutePath, version, bytes? }` で、最初のフレームはHostの `stat` から来ます。内容はWorkspace FilesのRemote名前空間で読み、Previewはタブごとに独立して更新を持ちます。`subagentchat` プロバイダは対象セッションを保持して `SessionReference` を流し、リソースsignalのabort時にその参照を解放します。

## 注意

- レコードはページ寿命で生き続けます。最後の保持者が去ったあともアドレスのレコードは列も値も持たない状態で残るため、メモリは「これまでに読まれた別アドレス数」に対して増え続けます。
- `signal` を無視するプロバイダは次のフレームまで走り続けます。
- 失敗型はRemote面の `RemoteFailure` です。元がRemote呼び出しでないプロバイダは自分で1つ作ります。
- プロトコルの綴りミスや不正なアドレスは他の診断なしに `none` として読まれます。

## 出典

- UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/client-resources.md
