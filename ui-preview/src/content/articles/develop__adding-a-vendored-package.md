---
title: "Vendored パッケージ追加ガイド"
desc: "Harness が別の upstream Cordis パッケージ（例 @cordisjs/plugin-http）を必要としたとき、npm 依存に加えず vendor/ 配下の "
cat: "develop"
catLabel: "開発ガイド"
chars: 3523
slug: "develop/adding-a-vendored-package"
---

# Vendored パッケージ追加ガイド

## 目的

Harness が別の upstream Cordis パッケージ（例 `@cordisjs/plugin-http`）を必要としたとき、npm 依存に加えず `vendor/` 配下の pinned source として **vendored** する。vendor/README.md が理由と既存パッケージの *更新* を扱い、本ガイドは **新規** 追加の file-by-file checklist（既存 vendored 集合に照らして検証済み）。

## 前提

- upstream の package name rescope 規則（rescope ドキュメント）と公開 release member の要件を理解していること。
- transitive upstream 依存も vendored 済みか既に存在すること（例: `@cordisjs/plugin-http` は `@cordisjs/fetch-file` を引き込む）。

## 手順

### 1. source をコピーする

```
vendor/＼dir］/
  package.json     # from upstream; rescope the name, keep exports/type (publishable release member, no private flag)
  tsconfig.json    # extends ../../tsconfig.base.json (see configuration below)
  src/             # the upstream src/ verbatim
  README.md LICENSE # if upstream ships them
```

`tsconfig.json` は他 vendored ボンを mirror: `rootDir: src`・`outDir: lib/types`・upstream code に要る strictness の緩和・import する他 vendored ボンの `references`:

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src", "outDir": "lib/types",
    "noUncheckedIndexedAccess": false, "exactOptionalPropertyTypes": false,
    "noImplicitOverride": false, "noUnusedLocals": false, "noUnusedParameters": false
  },
  "include": ["src"],
  "references": [{ "path": "../cordis" }, { "path": "../cosmokit" }]
}
```

`package.json` の不変条件: `name` を rescope（upstream の `exports`/`type` は保持）、宣言 metadata を `lib/types` へ向ける（`.d.ts` と `.d.ts.map` を publish）、cordis 依存を `peerDependencies` に列挙（upstream manifest に一致）。vendored パッケージは publishable release member なので `private: true` は不許可・`publishConfig.access: public` は必須。`version` は harness release sequence に従う。

vendored TypeScript source 内のローカル相対 import/export はコピー後、明示 `.ts` specifier に変更する。これは repo-local の build 差異: `rewriteRelativeImportExtensions` が runtime import を `.js` に emit し、宣言は NodeNext/Node16 消費者が解決できる `.ts` のまま。

### 2. root 設定に登録する

| ファイル | 変更 |
|---|---|
| `tsconfig.base.json` | `paths` に `"＼npm-name］": ["./vendor/＼dir］/src"]` を追加 |
| `tsconfig.host.json` | `references` へ `{ "path": "./vendor/＼dir］" }` を追加（`packages/*` entry の前。vendored code は host aggregate を通じて graph に参入） |
| `vendor/README.md` | manifest 表に行（dir、npm name、version、upstream repo、commit SHA）を追加し、ローカル変更を記録 |
| `scripts/publint-all.ts` | vendored ボン自体がここから publish される場合だけ（普通の vendored 依存はしないので skip） |

glob で自動カバーされ編集不要: root `package.json` workspaces（`vendor/*`）・`tsdown.config.ts`・`vitest.config.ts`・`.oxlintrc.json`。per-package `vendor/＼dir］/tsdown.config.ts` は build 設定が root 既定と異なる（dual ESM/CJS、複数 entry — `vendor/schemastery`・`vendor/logger-console` 参照）ときだけ必要で、entry は `lib/types` に emit された JS を読む。

### 3. manifest guard に気をつける

`scripts/check-vendor-manifest.sh`（pre-commit hook）は、`vendor/README.md` も staging されずに `vendor/*/src` 配下が staging されると失敗する。manifest 更新を source と一緒に stage して commit を通す。

### 4. 検証する

```sh
pnpm install        # registers the workspace
pnpm run typecheck
pnpm run build && pnpm run constraints
```

testing policy が選定する behavior チェックを実行する。source `paths` map は `tsconfig.base.json` に 1 箇所あり、graph 全体に効く。重要な隔離境界は project-reference graph: vendored source は自前の `vendor/＼dir］/tsconfig.json` を通じて参照され、aggregate の strict program には引き込まれてはならない。

## 注意

- vendored source は `src/` の原形（verbatim）を保つ。手入れは vendored 集合の manifest に記録する形で行う。
- private flag・access 設定の取り違えは publishable member として破綻するので、README の要件どおりにする。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-vendored-package.md>
