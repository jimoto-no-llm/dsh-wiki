# 防御パターン（defensive-patterns/ 深掘り）

## 導入

上流の docs/defensive-patterns/ は、実際に出荷済ま、あるいは出荷寸前だった欠陥クラスを
「再発を防ぐ規則」の形で固定した規則集です。レビューで強制される要件であり、各規則には
「守るべきこと」「レビュアーが判定する条件」「境界と例外の承認者」「正例と誤例」が揃っています。
コードを変更する前に、触れようとする成果物に対応するページを読む運用が前提です。

## 五つの習慣

README は次の5つの習慣で本文書群の大部分が説明できるとしています。

1. **正しさを明示的に作る**: 名前付きの呼び点、明示的なライフサイクル、明示的な条件と型として、
   構造の中に正しさを書き込みます。後からタイミングで取り繕いません。
2. **単一の真実の源**: データ1本に対して1つの読み経路、事実1つに1つの家、共有状態に1つの
   所有者を持たせます。
3. **登録済みの seam で拡張する**: 新しい能力は登録によって加えます。既存の担い手は
   新規ロジックを受け止めない仕様にし、中で枝を伸ばしません。
4. **変更面＝レビュー面**: 変更は声明した挙動変更に要する行だけを運び、移行は書き直しではなく
   移動で行い、性能が敏感な変更には計測を伴わせます。
5. **証拠を求める**: 主張は反証可能で再計算可能にします。前後の計測か、ゲートによる検査かです。

## general.md の主要規則

general.md は全成果物共通の規則集です。主な項目は次のとおりです。

- **直交する結果は独立に報告する**: 1つのプロセスが「タイムアウトした AND exit 0」という
  状態を取り得るため、timedOut・signal・exitCode をそれぞれ独立して提示します。
  別のフラグの報告を別の条件の分岐の中へ入れないことで、短くなった実行がきれいな成功と
  読めなくなるのを防ぎます。
- **公開契約は両側で守る**: LlmAdapter.stream() の実装は throw も
  finish {kind:'error'|'aborted'} もあり得ますが、LlmRuntime.stream() はモデル要求の失敗を
  terminal finish chunk に正規化します。内部ヘルパーは自由に throw してよく、規則が
  縛るのは消費者が越える境界です。
- **非同期状態は同期状態ではない**: agent.followup() に per-message の完了や結果の概念は
  存在しません。agent/status や whenIdle() を一件の follow-up の結果と見なさないという
  警告、run 区間を真正に所有する呼び出し側が区間を明示すること、「待つべきものが
  何もない」分岐を明示的に扱うことまで規則に書かれています。
- **タイミングは正しさを運ばない**: microtask・setTimeout の位置に正しさを依存させるのは、
  軽負荷では成立し高負荷やバッチングの変更で静かに壊れる形です。React の effect が
  「描画の直後」 ordering を supply するのも同型として退けられます。
- **任意入力は両挙動を声明する**: 任意パラメータは「あり」の場合と「なし」の場合の
  両方の挙動を契約に書きます。?. の連鎖が「あえてその字段があるかどうかの判断」の
  代用になっていないかをレビューで判定します。
- **一つの値は一事実を表す**: 未取得、取得済みで空、判定不能は3つの別々の事実であり、
  1つの undefined/null では代表的に持ちません。判別用 union や列挙値で明示的に分けます。
- **新たな active/current シングルトンは拒否されます**。
- **共有状態には1つの所有者**がいます。モジュールレベルのキャッシュ、singleton、global の
  WeakMap、Symbol.for や globalThis・window.__X__ による bypass は所有者を消して
  teardown より長く生き延びるため、所有者は名前の付いた service か instance とします。
- **ビジネス能力は自分自身を所有します**: 機能は自パッケージに住み、registry・slots.inject・
  waterfall・イベント購読などの登録面で接続します。runtime・controller・manager・gateway は
  汎用の orchestrator として registry 構造と disposal ライフサイクルを持ち、中央の固定表に
  業務行を書き込みません。
- **変更には性能証拠を伴わせます**。
- **移行は挙動を保存します**: 移行はコードを書き替えるのではなく運びます。
- **dispose は quiescence に届いて初めて完了です**。要求しただけでは済みません。
- **dispatcher 内でコールバック例外を封じます**: 各リスナーの例外を捕捉・報告し、
  dispatch の promise を reject させず、後続リスナーを飢えさせません。
- **信頼されない出力に ambient 環境や予測可能な path を渡しません**: spawn する子には
  *KEY* / *SECRET* / *TOKEN* / *PASSWORD* を落とした scrub 環境を渡します。temp・spill
  ファイルは 0700 の非公開ディレクトリ、乱数名、wx と 0600 の排他的な owner-only open で作り、
  予測可能で世界読みの path が symlink race と漏えいを招かないようにします。
- **link 形は unlink で外します**: symlink や Windows junction の可能性がある path は
  lstatSync().isSymbolicLink() で判定して unlinkSync します。unlink は link だけを削除し
  実ディレクトリを拒むため、link の先へ追従しません。Windows では rmSync(link) が junction に
  ERR_FS_EISDIR を投げ、再帰的な削除は junction を越えて target に落ちる可能性があります。

## ディレクトリの姿勢

| 変更対象 | 対応ページ |
|---|---|
| パッケージ export・外形・build face・依存宣言 | package-surface.md |
| Remote サービス・@Remote メソッド・API dispatch・API 層の所有 | remote-and-api.md |
| Client コンポーネント・slots・store・hooks・effects | client-components.md |
| Session 読み・retention・conversation ノード・renderer | conversation-and-session.md |
| タイミング・状態表現・共有所有・分散・加重な再構成・移行・性能証拠・disposal・コールバック・子プロセス | general.md |

型定義と subsystem ごとの意味論は subsystems/ に置かれ、このディレクトリは規則だけを持ちます。
dsh-code-review スキルが PR 判定時にこのディレクトリを読み、Development が AGENTS.md から
同じ表を経由します。

## 注意

- 規則は DSH リポジトリ内で review が強制するものですが、エージェント実装の欠陥クラスへの
  見立てとして読む価値が高い文書群です。
- 本wikiでは docs/deep/testing.md と docs/develop/extension-cookbook.md が隣接します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/defensive-patterns/README.md
UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/defensive-patterns/general.md
