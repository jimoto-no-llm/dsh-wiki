# ワークスペースパッケージ追加ガイド

## 目的

新しい `@deepseek-ai/dsh-＼name］` パッケージ追加の file-by-file checklist を確認する。この checklist は bash と adapter パッケージを template に検証済みであり、drift していたらこっちを直す（原文のルール）。

## 前提

- workspace（pnpm）と project references の仕組みを理解していること。
- package の役割に合う既存 group があるか確認すること（`core`, `llm`, `shell`, `compaction`, `subagent`, `todo`, `session`, `client`/`host`, `util`, `test-support`）。新 group も許されるが純 container で、`package.json` も source も持たず、パッケージは群の直下 1 level に置く。

## 手順

### 1. パッケージを作る

```
packages/＼group］/＼pkg］/
  package.json     # copy from packages/core/tools, adjust name/description/deps
  tsconfig.json    # extends ../../../tsconfig.base.json, rootDir src,
                   # outDir lib/types, references: ../../../vendor/cosmokit,
                   # ../../../vendor/cordis (+ ../../../vendor/schemastery if
                   # you use Config, + ../../＼group］/＼dep］ for each dsh dep)
  src/index.ts     # service default export or plugin (name/inject/apply/Config)
  locale/en.json   # optional display metadata: meta.title, meta.description, and meta.detail
  locale/zh.json   # translations using the same fields
  README.md        # service API, events, extension points, design notes,
                   # + gated Model Experience context blocks or short form
                   # + the gated "Known Limitations and Deferred Work" section
```

`package.json` の不変条件（`pnpm run constraints` が強制）: `private: true`・root `package.json` に一致する `version`・`type: module`・`main: "lib/index.js"`・`types: "lib/types/index.d.ts"`・`exports["."].types`／`exports["."].default`・`@deepseek-ai/cordis` を peerDependencies と devDependencies の両方（同 range）。dsh peer dependency を devDependencies に mirror。`@deepseek-ai/schemastery` は runtime validator なので `dependencies`。`files` は `lib/index.js`・`lib/types/**/*.d.ts`・gate が認める runtime artifact のみ。`src`・declaration map・JS map・stale root 宣言を publish しない。`bin` を持つ CLI app パッケージは `files` の `lib/index.js` 直後に `lib/bin.js` を入れる。

パッケージ内の相対 import は source で明示 `.ts` specifier（例 `export * from './types.ts'`）。compiler が出力 JS で `.js` に rewrite し、宣言は `.ts` を残して NodeNext/Node16 消費者が sibling `.d.ts` へ解決できる。

### 2. root 設定に登録する

| ファイル | 変更 |
|---|---|
| `tsconfig.base.json` | 既存 group なら編集不要。新 group は `@deepseek-ai/dsh-*` wildcard に `./packages/＼group］/*/src` candidate を追加 |
| `tsconfig.host.json`（Host package）か `tsconfig.client.json`（Client package） | `references` へ `{ "path": "./packages/＼group］/＼pkg］" }` を追加。普通のパッケージは必ずどちらか片方の aggregate に属する |

`packages/client/*` は `tsconfig.base.json` の代わりに `tsconfig.base.client.json` を継承し、client plugin パッケージは package.json で `dsh.client` を宣言し、`./client` を export し、共有 tsdown preset を呼ぶ。globs や package-manifest discovery で自動カバーされて編集不要なのは: root `package.json` workspaces、`scripts/publint-all.ts`、`tsdown.config.ts`、`.oxlintrc.json`、`scripts/check-workspace-constraints.ts`。

### 3. パッケージ topology を決める

swappable capability は、Service Definition／Service Provider／Consumer の役割が独立に進化するならパッケージを分ける。単一目的の plugin は 1 パッケージのまま。存在する役割に名付ける（最初の実装や将来拡張や Cordis base class ではなく、現状の安定責任）。interface パッケージは capability の名を、実装パッケージは mechanism・protocol・環境・vendor と区別する名を付ける。`local` は same-host 実行が契約の一部であるときだけ使う。

1 engine・runtime・policy・controller・resolver・store・現行設定には単数 `ctx` key、多数の named member を所有する registry や service には複数形 key。class 役割と key の単複は一致させる。host と client の非互換宣言で同じ Cordis `Context` key を再利用しない（declaration merging は別 runtime context でも両面を見る）。自然な複数形がすでに別の面に属するなら role suffix を足す。

主な役割語の使い分け（原文の表の要点）: `Controller`（コマンド／user 意図を受け既存 domain・表示 state を変える）、`Store`（1 데이터 집合を所有し CRUD・snapshot・subscription 提供する）、`Registry`（名付けた登録の動的集合と lifetime・disposal を所有）、`Runtime`（live work を実行し dispatch・cancellation・provider 協調を所有）、`Resolver`（入力から 1 答を算出し lifecycle を所有しない）、`Engine`（domain algorithm或有 state 実行モデル）、`Policy`（許可・選択・制限・観測を決める）、`Executor`（1 capability で 1 request／spec を実行）、`Gateway`（process・network・RPC・API 境界を適合）、`Provider`（capability 定義の実装を 1 供給）、`Backend`（定義 interface の背後で replaceable な下位 persistence・transport・実装）、`Handle`（1 live リソースを参照し制御・観測）、`Config`（1 解決済み設定值／緊密 bounded record を所有）、`Service`（上記で正しく言い切れない凝集 domain service）。`SDK` は対応 Python／TypeScript SDK 用の JSON-RPC client/server protocol だけに使う。製品綴りは canonical の `Typert`（`TypeRT` などは不可）。

### 4. パッケージ README を書く

service API・config・events・extension points・design notes を最初に置く。README を 4 kind（group・reference・library・bundle）の frontmatter `kind` で選び、該当 template に合わせる。README の末尾は canonical な `## Model Experience`（`### Request context and condition`、`#### What the model sees`、`#### Token effect`、`#### KV Cache effect`）と `## Known Limitations and Deferred Work` の順に終える。Model Experience は実装から埋め、 прям・conditional・capped・lifetime・auxiliary の各 model-context entry につき H3 ×3 つの H4 フィールド ＋ 各 1 段落。package が所有する稳定 text は引用（system-prompt prose は H5 ＋ `markdown` fence）。tool-schema entry は生成 tool catalog の anchored section を link し、そこの不在 delta だけ書く。KV Cache effect では append-only 成長／安定 repeated prefix／以前 token の置換／独立 model 要求を区別する。context 効果のない package は監査済み `None, as `／`Indirectly, through ` 文と`KV Cache effect` H4、1 段落を使う。

### 5. 省略可能な plugin 表示 metadata を足す

npm package plugin は `locale/en.json` で `meta.title`／`meta.description` を定め（他言語は同 fields）、package.json に `./package.json`・`./locale/*.json` exports と `files` の locale 追加を merge する。

```json
{
  "meta": {
    "title": "Workspace Tools",
    "description": "Tools for your workspace."
  }
}
```

言語ファイルは `locale/` にまとめ `en.json` が discovery entry。fields は任意で、有効な値は非空文字。`en.json` に現れる全 fields の `zh`・`ja`・`es`・`fr`・`de`・`ru`・`pt` を持つのが第一-party と template の要件（placeholder・slash command・API field 名の保持）。`pnpm run check:i18n` で検証する。fallback 鎖: title は locale `meta.title` → package-root plugin の `package.json.name` → Cordis plugin 名。description は `meta.description` → `package.json.description` → なし。icon は exported manifest に top-level `"icon": "./icon.svg"`、subpath plugin は自前の icon path。detail（`meta.detail`）は package root 相対の Markdown path（`docs/DETAIL.md`）で、ページは active UI 言語のファイルを表示。`meta.detail` がなければ package README。Install view は依然 npm registry 情報を使う。検証は `pnpm run verify-package-meta` と、英中切替の目視確認。

### 6. 検証する

```sh
pnpm install        # registers the workspace
pnpm run doc-sync
pnpm run constraints && pnpm run typecheck && pnpm run lint
pnpm run build && pnpm run hygiene
```

behavior 固有チェックと新パッケージに要る coverage は testing policy に従う。

## 注意

- `constraints` の manifest 不変条件は gate で強制される。手作業の合わせ込みでない形にする。
- README の Model Experience／limitations 構造は verifier が強制する。案配列の自由な書き換えはしない。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-package.md>
