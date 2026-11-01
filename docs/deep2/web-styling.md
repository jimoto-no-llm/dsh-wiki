# Web UI Style Reference（web-styling.md 深掘り）

## 導入

上流の docs/web-styling.md は、ブラウザクライアントパッケージのスタイルの所有権と
コンポーネント規則を定めた参照文書です。トークンの現在値は
packages/client/ui-theme/src/styles/ の生成前の在庫に任せ、この文書は所有と規則だけを扱います。

## 所有の階層

- **ui-theme** が --dsw-* の静的スケール、セマンティック alias、typography、motion、gradient、
  shadow、scrollbar スタイル、light/dark 設定を所有します。
- **ui-layout** が解決済みのテーマ snapshot を document に適用します。
- **feature パッケージ**はセマンティック alias を消費し、自身で別の全体テーマを作りません。
- グローバルの stylesheet は ui-theme/src/styles/ に置かれ、component の style はその component の
  隣に CSS Modules として置きます。component の layout や見た目の契約に属する値には
  その場の local custom property が認められ、共有の色・typography・elevation・motion は
  theme パッケージの所有です。

## コンポーネント規則の要点

原文に並ぶ主要な決まりは次のとおりです。

- 再スタイルの前に **ui-primitives の component catalog** を再利用します。feature
  パッケージを跨ぐ唯一の通路で、意図的な見た目の差はそちらの prop に置き、コピーを増やしません。
- CSS Modules と clsx を使う。component ライブラリや Tailwind を導入しない。
- feature コンポーネントは --dsw-alias-* のセマンティック token を使い、静的パレット値や
  リテラルな色を書かない。
- theme の selector を feature の CSS に含めない。light/dark の上書きは theme の所有物。
- font size と line height をペアにする。既存の role があるときは theme の typography 変数を使う。
- ソーステキスト・ターミナル出力・diff 行は契約で列保存を要求されるときには折り返さず、
  scrollbar は共有スタイルを使って component 固有の選択子を避けます。
- 見た目は CSS に置く。inline の React style は component-local の custom property 値の
  通行は認めつつ、theme への分岐の符号化をしてはなりません。
- plugin stylesheet 内の相対 url() は src/client/assets/ を指し、ビルドが package asset の
  URL へ再書きします。data:、#fragment、/_rooted、scheme、空の url('') はそのまま残され、
  fragment や query 付きの相対参照はビルドで失敗し、依存の stylesheet は再書きされません。
- :hover は @media (hover: hover) の内側に置く。selected・expanded・pressed・keyboard focus は
  その条件の外に残します。hover が使えないときは操作が明示の制御可視か到達可能にし、
  keyboard focus の可視性と reduced-motion を保つ。
- corner radius は ui-theme の corner-shape.css が貼る superellipse 平滑を対応 engine で継承し、
  50%・100%・pill radius など完全に丸くなる border-radius ごとに corner-shape: round を
  ペアにします。ui-theme の corner-shape spec がこのペアを強制します。
- 浮いた面（menu・popover・modal・panel・浮動ボタン・composer）は border: 0 を宣言し
  box-shadow: var(--dsw-elevation-panel)、var(--dsw-elevation-prominent)、composer では
  var(--dsw-elevation-soft) を取ります。0.5px の hairline は shadow の第1層で、
  --dsw-elevation-stroke-color が面や状態ごとに再結合・無効化できる仕組みです。--dsw-alias-border-* の
  border を lv/elevation shadow と併用するのを elevation spec が拒否し、状態色の border（warn パネル）
  は本物の border として残ります。
- dropdown・context・submenu・selection menu は Menu を使うか、custom content を MenuSurface で
  包みます。material は theme が所有する --dsw-menu-surface-fill と --dsw-menu-backdrop-filter で、
  feature・platform CSS がどちらも上書きできません。TaskMenu・ClockPicker は明示的な例外として
  schedule 側の所有で現容器と material を保ちます。
- modal backdrop（settings・confirmation dialog を含む）は blur 無しの半透明 dark mask で留まります。
  theme は --dsw-mask-blur を none にします。Desktop由来の modal overlay も親ページをフィルタしません。
- menu の背景フィルタは独立した階層に置き、nested menu と fixed overlay の位置や backdrop を
  保ちます。macOS では MenuSurface が menu の境界内だけ page content の裏に opaque backing を
  加えて、Chromium に native vibrancy 上へ blur をかけさせます。backing 無しでは
  --dsw-specific-menu の theme 所有 fill が 94% 不透明となり下地の文字の bleed through を防ぎます。
- 中性 --dsw-alias-border-* を使う flat border・separator は 0.5px で描きます。button・input・card・
  行の divider、充填箱としての separator（menu separator・conversation header の継ぎ目・
  markdown の hr・縦の rail）がこの hairline 重量を共有します。dashed のアフォーダンスと
  状態色 border は 1px に残り、spinner ring の track は spec の許可リストで width を保ちます。
  elevation spec はより太い中性 solid border を拒否します。
- クリック可能な artifact link（markdown anchor・prose の file mention・web source/fetch link・
  produced-file chip・workflow member link）は --dsw-alias-link の色で font-weight 500、
  静止時は下線無し、hover/focus で offset 3px の dotted 下線です。text-leading の anchor は
  ui-primitives の LinkIconMedium 系 glyph が currentColor に乗り、既知の外部 host では
  globe の代わりにその site の刻印が出ます。workflow member link と画像だけの anchor は
  glyph 無し、tool の行の file link は灰色の dotted アフォーダンスを保ちます。

## Input capabilities

- pointer と hover は browser が選んだ主な pointing device に関する query で、any-hover は
  あらゆる pointing device を見ます。none は物理 keyboard を検出しません。
- (pointer: coarse) は指しの精度に依存する見た目（touch 向きの制御や text field）に使います。
- CSS hover の効果は (hover: hover) の下に置き、touch-first の配列でも hover 無しで成立させます。
- JavaScript の hover preview は mouse の進入を受けるときは (any-hover: hover) を使い、
  touch の進入を無視します。二次の mouse は、touchscreen が主 pointer でも preview を
  出せます。全 CSS hover を any-hover で有効化してしまうと、touch 由来の :hover 状態でも
  効果が発動してしまう矛盾を避ける設計です。
- 混合入力の機器では、主 pointer の CSS hover 状態が非アクティブのまま、mouse preview が
  出現し得ます。keyboard focus と shortcut hint は capability query とは独立に実際の keyboard
  操作に従います。

## Corner radius と settings card

corner radius の統一規格は docs/ui-radius.md にあり、radius スケール・component の size map・
circle と capsule の例外・nested hover geometry・settings-card の fill と stroke を定義します。

## Changing the system

- 共有トークンの追加や変更は owner の ui-theme の sheet で行い、feature はその semantic alias を
  消費します。公開の styling 契約が変わるときは owner の package 参照を更新します。
- 見た目の挙動は testing policy（docs/testing.md）に従い、styling system の経緯は
  archived styling-system Agent Note に記録されています。

## 注意

- 値の在庫は ui-theme の生成由源の棚に置かれ、この文書は重複を持ちません。
  トークン値の正本は packages/client/ui-theme/src/styles/ に当たってください。
- 本wikiでは docs/deep/testing.md と docs/subsystems/ の各ページが隣接します。

## 出典

UPSTREAM: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/web-styling.md
