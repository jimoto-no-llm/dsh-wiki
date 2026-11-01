# Remote API 追加ガイド

## 目的

`ctx.remote` endpoint を追加・変更する 5 step（宣言・障害宣言・パッケージ登録・Client での消費・テスト）を確認する。decorator 意味論・lookup 解決・生成 pipeline・`/api` route は機構であり API Gateway reference が正。なぜこの設計かは「Typert Remote method calls」Agent Note、障害が 1 つの `RemoteError` ＋ code table なのは「failure vocabulary」Agent Note を参照。

## 前提

- Host 側 Cordis service を `TypertRemoteService` 継承で作れること（service key と wire namespace を束ねる）。
- lookup オブジェクト（`Agent`・`Session`）は top-level parameter 位置のみに置ける。cooperative cancellation を支援する method は `signal: AbortSignal` を最終 parameter に置く。

## 手順

### 1. API を宣言する

公開 method に `@Remote` を付ける。signature が wire 規約を満たすなら business method そのものに付け、shape を変える必要があるとき（`signal` 追加、parameter 再順序、別名 export）だけ `remoteExport*` adapter を書き、adapter から未改名 business method を呼ぶ:

```ts
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

export class NotesController extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'notesController', { namespace: 'notes' })
  }

  @Remote('list')
  async remoteExportList(agent: Agent, signal: AbortSignal): Promise<NoteRow[]> {
    return await this.list(agent, signal)
  }
  async list(agent: Agent, signal: AbortSignal): Promise<NoteRow[]> {
    signal.throwIfAborted()
    return await Promise.resolve([{ noteId: `${agent.id}-1`, title: 'draft' }])
  }
}
```

### 2. 障害を宣言する

障害は 1 クラス `RemoteError`: `RemoteErrorDetailsMap` へ declaration merging で domain code を merge し、failure point で `throw new RemoteError(code, message, details)`。domain error class の族を作らず、exit mapping 関数も書かない。関係ない例外は前分類しない（Gateway が `gateway/internal` に折る）。`catch` は任意の provider 例外を 1 domain code に分別するときだけ書き、原 exception を `cause` に付ける。

code は `＼domain］/＼reason］`。宣言位置の 4 ルール: 1 producer なら producing package の throw 横。複数 package なら最小共通 domain package。carrier code（`gateway/bad-request`・`gateway/cancelled`・`gateway/internal`）は protocol、Gateway infrastructure code は gateway で宣言 — 使うが複製しない。wire を渡らない local failure は code table の外に置く。

```ts
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'note/not-found': { readonly noteId: string }
    'note/rejected': { readonly noteId: string }
  }
}

export async function rename(noteId: string, title: string): Promise＼void］ {
  if (!stored.has(noteId)) {
    throw new RemoteError('note/not-found', `no note "${noteId}"`, { noteId })
  }
  try {
    await persist(noteId, title)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new RemoteError('note/rejected', message, { noteId }, { cause: error })
  }
}
```

### 3. パッケージに登録する

`@Remote` は Loader entry の plugin package に置く（abstract seam の owner なら `packages/api/` 配下の一致 package）。manifest には 2 つの生成 entry と protocol peer dependency を追加する:

```json
{
  "exports": {
    "./typert": { "types": "./lib/typert.host.d.ts", "default": "./lib/typert.host.js" },
    "./remote": { "types": "./lib/typert.remote-client.d.ts", "default": "./lib/typert.remote-client.js" }
  },
  "peerDependencies": { "@deepseek-ai/dsh-typert-protocol": "workspace:*" },
  "devDependencies": { "@deepseek-ai/dsh-typert-protocol": "workspace:*" }
}
```

signature・code table・namespace・export 名を変えた後は `pnpm run build:lib` を再実行する（Client への宣言と codec 送出のため）。実装 body だけの変更は再生成不要。

### 4. Client で消費する

呼び出し側 plugin は `inject` に `remote` と `remote.＼namespace］` の両方を宣言し、call site は `ctx.remote.＼namespace］.＼method］(...)` と直接書く（`Pick<ClientRemote, …>` narrowing も手書き signature も wire relay object もない）。結果は `RemoteResult＼T］` なので `if (!result.ok)` で分岐し、`instanceof` でなく `code` で判別する（code 分岐は `details` も narrow する）。exception-flow site は `throw result.error`（実体は Error）。catch 側は `isRemoteFailure` で障害と local defect を区別し、defect は rethrow。Remote call は reject しないため防御的 catch は不要で、assembly の誤りは crash すべき。

固定 Host fact は `ctx.remote.$host`: `home`・`isLoopback` は subscription・generation counter なしの plain 読みで、`home` は最初の ready frame まで `undefined`。再接続後は `connection/reset` か domain 自前の remote event で refresh する。unary call を abort したときは throw でなく error branch 上の `gateway/cancelled` になる。

### 5. テストする

owner 側（Host）は thrown code を断言する: catch 後 `remoteErrorOf` で復元し、`code` と関心のある details fields を `toMatchObject` で比較 — エラー object の deep 比較（`toEqual`）も `instanceof` 断言もしない。

```ts
it('refuses an unknown note before writing', async () => {
  const failure = await rename('n-404', 'fresh title').catch((error: unknown) => error)

  expect(remoteErrorOf(failure)).toMatchObject({
    code: 'note/not-found',
    details: { noteId: 'n-404' },
  })
})
```

Client-side double は本物 instance を返す: `RemoteError` と `TestRemote` の value import は `@deepseek-ai/dsh-client-test-runtime` から（`api-remotes` facade からの value import は未 build の assembly chain を load する）。`TestRemote.$host` は plain field なので spec が直接代入する。

### 検証

1. `pnpm run build:lib`: signature・code table・namespace・export 名を変えたら必須（Client 宣言と codec を生成するため）。
2. `pnpm run typecheck`: Host と Client program 両方。到達不能 package に merge した code も red になる。
3. 両側 spec を名前を付けて実行: `npx vitest run <owner spec> <client spec>`。
4. product-visible 面に届く endpoint には recorded-session snapshot を testing policy どおり追加する。

## 注意

- `catch` は任意の provider 例外の code 化にだけ使い、domain error class 族・exit mapping 関数・防御的 catch を書かない。
- error branch の処理は code が意味を持つ位置（store 側）に置き、取りこぼしを上流へ丸投げしない。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-remote-api.md>
