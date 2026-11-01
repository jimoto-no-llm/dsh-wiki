---
title: "Session ログフォーマットバージョン追加ガイド"
desc: "公開済みデータを書き換えずに、次の Session ログフォーマットバージョンを導入する。version/status の権威ドキュメントを読んで checkpoint write"
cat: "develop"
catLabel: "開発ガイド"
chars: 7669
slug: "develop/adding-a-session-format-version"
---

# Session ログフォーマットバージョン追加ガイド

## 目的

公開済みデータを書き換えずに、次の Session ログフォーマットバージョンを導入する。version/status の権威ドキュメントを読んで checkpoint writer と最新の released format を特定し、verified released format を N、target を N+1 とする（名前と metadata には実際の数値を当てる）。working な contributor checkout があることが前提。合わせて package checklist・format library・released-format 決定の各ドキュメントを読むこと。

## 前提

- Session format integer が、パッケージ release version・SQLite schema version・projection-unit version・protocol-wrapper version とは別物であることを理解していること。
- 隣接 migration（adjacent migration）パッケージを追加する形で作業する。

## 手順

### 1. バージョンと release base を選ぶ

効果的な discriminator では安全でない解釈を防げないときにだけ bump する。headers・event envelopes・event 意味・再構成への構造的変更は reader-compatibility rule の評価対象であり、自動 bump ではない。安全な同バージョン進化は type-change（persistence change）手順で記録する。bump が要るとき、N は version/status にある accepted（または published）version であり、accepted V4 後の bump は V4 出版の記録前でも V5 になる。

N+1 には共有の `release/*` integration base を使う。base 変更は writer・codec・catalog 配線・identity migration・検証を入れ、独立した子 branch は各々 base から切って release branch 宛に PR を出す（他の子 branch 宛にしない）。各子は同じ隣接 migration パッケージへ構造変換・validator・consumer・テストを足す。review 順のために余分な version 号を割り当てない。reviewed child を PR で release branch へ merge し、release 前に統合結果を検証する。release branch の force-push／削除保護を尊重し、force-sync しない。

writer を変える前に [archive コマンド](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/cookbook)（リポジトリ内の persistence-changes 履歴手順）で完全な persistence schema を保全し、`docs/persistence-changes/historical-formats/vN.*` に bilingual format reference を追加する。古い記録はすべて保全する。format coverage チェックは、新しい writer より下の各 integer が自身のドキュメントを持つことを要求する。

### 2. identity edge を追加する

package checklist に従い、mount される plugin ではなく N→N+1 のライブラリを作る。identity body 変換はあくまで初期配線用の scaffold。V2→V3 仕様は明示的変換と preservation rule の固定例であり、identity 変換として拡張対象にしない。

`dsh.sessionFormatMigration` に numeric な `from: N`・`to: N+1`、export path、export 済みの migration・source codec・target codec・target-header validator・target restorer を宣言する。source codec は前 edge パッケージが export した物を再利用し、そのパッケージに依存する（released codec を複製・再定義しない）。target codec と validator は新しいパッケージから export。edge を catalog の direct dependency に加え、workspace の TypeScript paths と project references を足す。

`SESSION_FORMAT_VERSION` を core Session types で N+1 にし、新しい edge 宣言と並べて catalog を生成する:

```sh
pnpm run gen-session-format-catalog
```

generator は 0 から writer version までの各 step にちょうど 1 つの隣接パッケージ（ディレクトリ／パッケージ名一致・codec export 一致・依存宣言済み）を要求し、欠落・重複・余分な edge・未知 metadata・peer＋dev で Session を共有しない catalog を reject する。宣言を直すこと。`generated.ts` を手で直さない。catalog は build-static で、plugin mount が歴史的可読性を決めてはならない。

### 3. per-artifact stage と validation を実装する

whole-artifact の array-to-array migrator ではなく Stage interfaces を使う。不変の `SessionFormatMigration` 宣言は `migrateHeader`・`validateTargetHeader`・`createStage` を供給する。`createStage` の各呼び出しは 1 source artifact 分の独立 state を作る。counter・pending events・reference map はそこに置き、可変 stage を Session 間で共有しない。

`transformEvent(event, context)`・`transformRun(run, context)`・`finish(context)` を実装し、`context.emitEvent` ／ `context.emitRun` で同期的に出す（1 呼び出しで 0〜多数の出力）。stage は codec 所有の compact run を直接消費するか、中間配列を具体化せず `run.expand()` を回す。呼び出し側が scheduling を所有し、chain は上流 stage を下流より先に完了させる。

継承 cut は論理 event 数として扱う。EOF 前に判明する場合のみ `headerInheritedEventCount` を公開し、`finish` が正確な target cut を返す。未知の cut に 0 を代入しない。cardinality 変更 edge がある seeded multi-hop 復元を、直接 N だけでなく各 supported 歴世代から N+1 まで検証する。新 edge の event 受理と変換規則は README に明示する。equal-version retention だけでは構造変換の安全を証明しない。target 意味を検証し、新受理 case には rejecting counterexample を付ける。古い edge を広げて未対応変換を隠さない。ignorable な `plugin:` namespace record は target が表現できるなら名前で carry forward し、drop する edge は README に明記する。変換 oracle は native writer 出力: 同じ入力を旧 writer と target writer で replay し、format 正規化 helper 前で比較、volatile field は記録済みの物だけ mask。Alpha converter は evidence のない歴史 case を明示的に拒否でき、部分 successor は publish しない。edge README を単一の完全な変換・受理 catalog として維持する（コードと同じ change で更新）。

strict 復元は `sessionFormatCatalog.createRestore(header, { recovery: 'strict', validation: 'current' })` で証明し、rows を順に投入して `finish()` まで呼ぶ。

### 4. current-version consumer を更新する

Session 作成・復元、JSONL filename 選択と publication、catalog の現行 encoder/restorer、projection-cache の generation identity、replay・snapshot 正規化、physical fixture-layout validation、TypeScript/Python SDK recordings を traceする。current を意味する value には writer constant よ、released codec と歴史 fixture には literal な歴史 version よ。無関係な version bump を自動で入れてはならない。読み取りと書き取り両経路を検証する。header-only listing は body を読まず publish しない。書き込み open は最終現行 successor のみ publish。source path・bytes・inode は不変。新しく無効な selected generation でも predecessor に fallback しないこと。publication timing は preparation 決定が所有する。

### 5. snapshot successor を作る

snapshot ownership と snapshot library の README を読む。corpus policy の baseline は replay input として保持される（writer bump で refresh 不要）。current-generation successor が要るときは owning scenario を選び、歴史ファイルすべてを残し、target version の canonical な parent／child filename を使う。predecessor を target filename に rename したり header だけ変えたりしない。

変更なし replay input には owner へ keyless refresh し、write-back なしで replay。tool は `text-turn` と checkout の writer version を使う。N+1 を使ってその version を生成する前に実装・配線を終えること:

```sh
pnpm run test:snapshot:refresh snapshots/sdk/sdk.snapshot.ts -t text-turn
pnpm run test:snapshot snapshots/sdk/sdk.snapshot.ts -t text-turn
```

壊れた generation・sidecar・protocol output はあわせて reviewする。歴史の predecessor は byte-identical 半目。selection は数値最大 generation を選ぶため、owner の selected parent への共有参照を更新する。packed-layout migrator を version upgrader として使わない。

### 6. 統合結果を検証する

repository root から。catalog 宣言・Stage composition・released V2→V3 edge・generation selection をチェック（baseline、新 edge の focused coverage も足す）:

```sh
pnpm run verify-session-format-catalog
pnpm exec vitest run scripts/gen-session-format-catalog.spec.ts packages/session/session-format/tests packages/session/session-format-v2-to-v3/tests packages/session/session-format-catalog/tests
pnpm run test:snapshot scripts/session-snapshot-corpus.corpus.ts
```

新 edge 実装後、そのテスト path を focused run に追加し、diff に応じて JSONL・replay・projection・SDK テストを要求する。strict migration 成功・skeleton の identity 保持・malformed／unknown-required-event 拒否・deterministic 再復元・独立並行 stage・seeded multi-hop cut・predecessor 不変・no fallback を必須にする。報告は exact なコマンドと失敗で行い、推測の full-suite 結果を出さない。owning Agent Note を更新し（重複 decision record を作らない）、release record は publication まで無変更。bilingual prose を同時に更新し:

```sh
pnpm run verify-translation-pairing --write docs/cookbook/adding-a-session-format-version.md
pnpm run test:docs
pnpm run doc-sync
pnpm run lint
git diff --check
```

### 参考: Developer V4 corpus trial と最終 V3 語彙

writer が V4 の contributor checkout から one-time migration script（`pnpm run migrate:sessions-to-v4`。既定 root は `~/.dsh/sessions`）で既存 corpus を V4 移行できる。開始前に対象 root を使う DSH process を止める。失敗は各 Session ごとに報告され、summary.json が残る。V3 が released で V4 が integration writer の間、master は有効な V3 event type を追加できる。V4 初出版前に migration 所有の `RELEASED_V3_EVENT_TYPES` と最新 V3-writer commit を `pnpm run verify-v3-event-vocabulary --source-ref "$(git rev-parse --verify 'origin/master^{commit}')"` で照合し、差分は V3 payload・必要変換・target 受理・消費者とともに reviewする。`developer/message` は V4 専用で frozen V3 set に入れてはならない。publisher は remote の新鮮さを検証する（このコマンドは fetch しない）。

## 注意

- 同バージョンログは隣接 migration を通らず、resume 後に歴史と新 record variant が混ざる。次の outgoing migration がそれを扱えること。same-version migration を足したり `restoreCurrent` だけに頼って正規化しようとしてはならない。
- 中間 integration format の検証は disposable で隔離された Harness home で行う。実ユーザーの home を使わない。
- release branch の force-push・削除保護を尊重し、force-sync しない。

## 出典

UPSTREAM: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-session-format-version.md>
