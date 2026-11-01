---
title: "APIゲートウェイ"
desc: "Typert API Gatewayの現状リファレンスです。ビジネスサービスがunary（一元呼び出し）とstreamのRemoteメソッドをどのように宣言し、ビルドがHostとC"
cat: "deep"
catLabel: "深掘り"
chars: 7717
slug: "deep/api-gateway"
---

# APIゲートウェイ

Typert API Gatewayの現状リファレンスです。ビジネスサービスがunary（一元呼び出し）とstreamのRemoteメソッドをどのように宣言し、ビルドがHostとClientの契約をどう生成し、呼び出しがどうConnectionのRPCと /api ルートを再利用するかを扱います。セッションイベントや差分データなど別系統のストリーミングプロトコルは対象外で、同じConnectionを使えてもRemoteメソッド記述子は使いません。

## プログラミングモデル

- ビジネスサービスは `@Remote` または `@RemoteScope` でClientへ公開するメソッドを選択します。無印のメソッドは生成されたClient型にも実行時の貢献にも入らず、`ctx.remote` 経由では呼べません。
- `@Remote` はルートHost Contextに登録されたCordisサービスの呼び出しを示します。複雑なHostオブジェクトはネットワーク越しにそのまま渡せないため、ビジネスパッケージが `TypertLookupMap` でネットワーク識別子との関連を宣言し、実行時は `ctx.typert.lookups` に既定の解決プロバイダを登録します。例えばHostシグネチャの `Agent` 型パラメータ agent は agentId というネットワーク項目を生み、Gatewayはビジネスメソッドの呼び出し前にそのidをHostオブジェクトへ解決します。Host側は `ctx.typert.lookups.configure()` で、パラメータ名・ネットワーク項目・正規の型シンボルを変えずにlookup keyの解決ポリシーを上書きできます。
- `@RemoteScope(key)` はまず `ctx.typert.contexts` で識別子をscoped Contextに解決し、そのContextからサービスを取り出して呼び出します。メソッド自体がscoped構成に依存し、Agentなどのオブジェクトを明示的に受け取る必要がない場合に使います。
- `@Remote` はexport名または { name?, mode?, resources? } を受け取り、`@RemoteScope(key, option?)` はexport名（例 `@RemoteScope('agent', 'current')`）か、第2引数に { name?, resources? } を受け取ります。resources はアクセス制御のため、1回の呼び出しが触れるリソースの識別子を返す種類ごとのreaderを持ちます。ほとんどのメソッドはreaderを宣言しません。Gatewayはlookupパラメータ、resource を宣言するscoped Context、`typert.resources` の既定項目やresolverからも識別子を読むためです。
- サービスは通常 `TypertRemoteService` を継承し、コンストラクタでCordisサービスキーと既定のRemote名前空間を明示的に束縛します。別の基底クラスを持つ場合は `readonly typertRemote = bindTypertRemote(this, serviceKey)` を宣言できます。どちらの形式も検査可能なpublic束縛を残し、コンパイラがコンストラクタへシンボルを注入することに依存しません。

```ts
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TypertRemoteService, Remote, RemoteScope } from '@deepseek-ai/dsh-typert-protocol'
import type { Context } from '@deepseek-ai/cordis'

export class GoalService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'goals')
  }

  @Remote('create')
  createForClient(agent: Agent, request: CreateGoalRequest, signal: AbortSignal): CreateGoalResult {
    signal.throwIfAborted()
    return this.create(agent, request)
  }

  @RemoteScope('agent', 'current')
  currentForClient(): CreateGoalResult {
    return { accepted: true }
  }
}
```

Remoteメソッドは同期的に値を返すかPromiseを返せます。協調キャンセルのために、Hostシグネチャの最終パラメータはグローバル型の `signal: AbortSignal` でなければならず、記述子に記録されて args には入らず、生成されたClientメソッドは省略可能な最終 AbortSignal を受け取ります。

`@Remote({ mode: 'stream' })` は `Iterable`・`AsyncIterable`・`RemoteStream of Out and In` を返すメソッドを示します。GatewayはHostメソッドが生んだ各項目を、多重化された /api/remote.mux WebSocketまたはプロセス内carrierで届けます。生成されたClientメソッドは項目を列挙し、同一の論理ストリームに対するClientからHostへの上流（uplink）のための send・end・dispose を備える `RemoteStreamHandle of Out and In` を返します。`RemoteStream of Out and In` の第2型引数が上流項目の型を宣言し、上流項目はブラウザ由来のため、Hostは `this.ctx.invocation.uplink In` で読む前に生成された In コーデックで検証されます。上流は args やパラメータリストに入りません。フレーム・half-close・キャンセル・inbox束縛の契約はGateway READMEが所有します。

Client側はJavaScript Proxyではなく、普通のオブジェクト上の具象関数を使います。直接呼び出しとscoped呼び出しは `ctx.remote[namespace]` と `agentCtx.remote[namespace]` に現れます。各名前空間は remote[namespace] として登録されたtracedなCordis子サービスで、Client構成は `ctx.remote.$mount()` で貢献をマウントし、最後のメソッドが引き下げられると名前空間が卸されます。依存宣言は実際の呼び出し側に属します。`ctx.remote[namespace]` を読むビジネスパッケージだけが自分の inject で remote と remote[namespace] の両方を宣言し、単に貢献をマウントするだけの構成や、その名前空間を呼び出さない上位ランタイムは代理で宣言しません。`@Remote` メソッドがlookupパラメータを1つだけ持ち、同名の `TypertContextMap` が同じネットワーク識別子を使うとき、生成されたscopedシグネチャはその識別子パラメータを省略します。`@RemoteScope` はscoped呼び出しインターフェイスだけを生成します。

Clientアプリケーションは `@deepseek-ai/dsh-api-remotes` だけを組み込みます。このパッケージは選ばれたビジネスパッケージの /remote サブパスを実行値のままimportし、`ctx.remote.$mount()` で貢献をマウントし、同じファイルからの宣言マージを再exportします。Host Remoteパッケージを追加するかはClient構成の所有者の明示的な選択で、ビジネスコンポーネントがTypert GatewayやビジネスパッケージのRemote JSを別途読み込む必要はありません。api-remotes構成と `ctx.remote` 契約はReact非依存で、Client構成から見えるHostメソッドは生成時に選ばれたRemoteメソッドに限られます。

## コンポーネントの責任

| 区分 | パッケージまたは入口 | 責任 |
| --- | --- | --- |
| 共有 | `@deepseek-ai/dsh-typert-protocol` | デコレータ、Gateway束縛、マージで拡張可能なプロトコルマップ、呼び出し記述子、プロバイダ型を宣言。TypeScript解析を開始せずCordisサービスも登録しない |
| ビルド | `@deepseek-ai/dsh-typert-generator` | Hostの`ts.Program`からRemoteシグネチャ、型グラフ、lookup、Context、出所を厳密に解析し、HostとHost-for-Clientの成果物を生成 |
| Host | `@deepseek-ai/dsh-typert-registry` とLoader | 生成されたHost記述子・スキーマ・ビジネスパッケージ登録を `ctx.typert` に置き、lookupとContextのプロバイダを保持 |
| Host | `@deepseek-ai/dsh-api-session-controller` | アプリケーションのAgent/Session識別ポリシーを所有し、対応するTypert lookupを設定 |
| Host | `@deepseek-ai/dsh-api-gateway` | `ctx.typertGateway` を提供し、Remoteエンドポイントを要求し、リクエスト値を検証、オブジェクトかContextを解決、生きているCordisサービスを呼び出す |
| Host | `@deepseek-ai/dsh-api-remote-access` | ビジネス登録の役割ベースポリシーで、非所有者のPeerが呼べるRemoteメソッドを決め、一覧結果をフィルタし、Peerごとのアクセスsnapshotを配信。Gatewayはこれを必須とする |
| Client | `@deepseek-ai/dsh-api-gateway/client` | `ctx.remote` と remote[namespace] の子サービスを提供し、生成された記述子を具象メソッドとしてマウントし、Connection経由で呼び出しを開始・キャンセルする |
| Client | `@deepseek-ai/dsh-api-remotes/client` | アプリケーションが許す /remote 貢献を選んで明示的にマウントし、対応する宣言マージをビジネスコードへ持ち込む |
| 両方 | `@deepseek-ai/dsh-client-connection` | RPC carrier、リクエスト相関、信頼境界、キャンセル、応答envelope、/api のHTTPブリッジを提供 |

API GatewayパッケージはHostディスパッチャとClient Remoteエンドポイントをpeerエントリとして所有しますが、両方のビルドが同一の `ts.Program` に入ることはありません。Host入口はClient側Cordis `Context` マージをimportせず、Client入口はHost Gatewayサービスをimportしません。

## 厳密な生成パイプライン

ルートビルドはまず `scripts/generate-typert.ts` によるソースのみのHost解析を行い、その後にHostとClientのフェーズ、そしてWebをコンパイル・バンドルします。ジェネレータはHost aggregateを唯一の `ts.Program` シードとし、パッケージコンパイルの前にRemote宣言を書き込みます。Host tsdownパスはメタデータを再生成せずにソースデコレータを下げ、Clientパスがその宣言と実行時貢献を消費します。

貢献するビジネスパッケージは、ソースディレクトリではなく自分の `lib/` ディレクトリへ生成ファイルを書き込みます。

| ファイル | 消費者 | 内容 |
| --- | --- | --- |
| `typert.host.js` | Host Loader | Host側の実行時reflection、厳密な呼び出し記述子、スキーマ登録値 |
| `typert.host.d.ts` | Host型システム | Host側の生成宣言 |
| `typert.remote-client.js` | api-remotes | 厳密な記述子と実行時コーデックを含む、マウント可能な `TypertRemoteContribution` |
| `typert.remote-client.d.ts` | Client型システム | `TypertRemoteNamespaceMap` と `TypertRemoteScopeMap` の宣言マージとClient安全な型参照 |
| `typert.remote-client.d.ts.map` | エディタ | 生成されたメソッドプロパティをHostパッケージのRemoteメソッド宣言へ写像 |

ビジネスパッケージはHost Loader入口を `./typert` で、Host-for-Client入口を `./remote` で公開します。ジェネレータはこれらのパッケージexportと公開ファイル一覧も検証し、対応する入口を備えた明示的な貢献パッケージだけに成果物を生成します。

## 開発モード

Web開発は1つのコマンドで、現行のHost・Client・Web成果物をビルドし、ソースのHostを起動し、Clientバンドルを再ビルドし続けます。

```sh
pnpm run dev:web
```

dsh はHostソースをtsx経由で起動するため、HostはSRC fallbackを使えます。dev:web のwatcherはソース編集時にclient側の型emit、Clientプラグイン・ライブラリバンドル、Web shellを再ビルドしますが、Hostのデコレータ解析やRemote ClientのDTS生成は行いません。それを行うのは dev:web が最初に実行する完全ビルド（または `pnpm run build`）です。

Remoteメソッドの契約を変えずに実装本体だけを変える Typert ファイルの再生成は不要です。デコレータの追加・削除や、export名・namespace・パラメータ・戻り値・lookup・Context・キャンセルシグネチャを変えたときは、順序付きのlibビルドを再実行して、Clientがコンパイル・バンドルする前にHostが厳密な契約を生成します。

```sh
pnpm run build:lib
```

実行中のClient watcherは再バンドル時にこの生成物を消費します。`pnpm run build:lib:host` でHost契約を更新済みなら `pnpm run build:lib:client` でClient側だけを完了できますが、cleanなワークツリーでHostフェーズを飛ばすことはできません。

## 境界

Remoteが扱うのは、1リクエスト1結果のunaryメソッドと、項目がHostからClientへ流れ、Client側の項目が `this.ctx.invocation.uplink()` 経由で実行中のHostメソッドへ届くstreamメソッドです。セッションイベントストリーム、ページング、差分reduce、投影、エンティティサブストリームは別のデータプロトコルと登録モデルを必要とし、同じConnectionを再利用しても、Remoteメソッドのふりをして呼び出し記述子に入ってはいけません。API層は remotes → gateway → connection → webserver の順に整理され、BFF層とTypert RPC層は packages/api に置かれます。`Uint8Array` を含むunary結果（ネストの項目や配列要素を含む）はbinary Remote transferを使い、RPC envelopeの外側の応答が要る機能は正確なConnection Fetchルートを登録します。

Lookupポリシーはkeyごとに設定されるため、agentやsessionパラメータはコールドリジュームの挙動を共有します。生きたオブジェクトのみを受け入れるにはper-parameterまたはper-endpointのポリシーを明示的に要求することになりますが、それは存在せず、ビジネスメソッドはオブジェクトが復元から来たかどうかを推測してはいけません。

packages/api は転送・呼び出し形状・セッションライフサイクルを所有します。ビジネスルールは独立したビジネスパッケージに属し、登録面や投影データを通じてこの層へ届きます。ここの変更が満たすべき要件（4つの `@Remote` 規律、追加のみの名前規則、この層が保つ境界）はRemote and API rulesページが所有し、レビューはそこで確認します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/api-gateway.md