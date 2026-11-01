# スコープ付き段階停止 (Scoped staged stop)

管理されたACPとWeb profileの起動は、runごとに1つのカーネルプロセスグループを所有します。DSHは元のargv・同梱profile・ツール・agent loopを保持します。入力キャンセル、graceful exit、期限切れの強制終了、子孫検証は独立した段階であり、rootのexitだけではrunの停止を確認できません。

## 対応する所有権の仕組み

Windowsは `@deepseek-ai/dsh-win32-process` 0.2.0-rc.2 を再利用します。create suspended→無名kill-on-close Jobへの割り当て→resumeの順であり、終了は保持したJobハンドルで行います。Breakaway制限は有効化しません。通常のCreateProcessで作られた子孫（detachedなfixtureを含む）は全て所有対象です。外部ブローカ経由で作られたプロセスや、権限コードで故意に移籍させたプロセスはこのライフサイクル契約の外です。これらの制御はOSのsecurity sandboxではありません。

Linuxではcgroup v2、呼び出し元の現在グループ直下の書き込み可能グループ、`cgroup.kill` とlibcのpidfd対応が必要です。固定ランチャがexecの前に新しい乱数のcgroupへjoinし、所有権の記録まで待ちます。グループのディレクトリ・kill・eventsデスクリプタは開いたままにします。TERMはpidfdで実行し、現存メンバーシップを検証し、PID数字によるフォールバックはありません。強制は保持していた `cgroup.kill` デスクリプタへの書き込みで、同時のforkやネストしたcgroupもカバーします。populated 0だけが子孫exitを確定します。PID列挙は観察手段であり、完全とは限りません。

mount、controller有効化、プロセス名検索は行いません。ネイティブ対応が無い環境では `ownership_unavailable` でprofile起動が停止し、macOSにはここでのバックエンドがありません。履歴リーダーからはカーネルのハンドルを再作成できません。rootの不在やPIDの再利用は、子孫の未検証のままresume/checkpoint runを許可しません。

非rootのLinux運用には、権限を委譲されたsystemdサービスを用意します。CIは既存のrunnerアカウント上で、Delegate=yes・DelegateSubgroup=supervisor付きの使い捨てトランジェントサービスでテストします。テストpayloadをrootで走らせたり、他のサービスグループを変更したりしません。subgroupプロパティにはsystemd 254以上が必要です。

Windows→WSLのWebモードはLinuxのsupervisorと別のframed制御チャンネルを使います。ネイティブのstdin/stdout/stderrバイトはdataのまま保たれます。`RDSH_WSL_NODE` が元のNode pathを指定し（既定は /root/.local/opt/rdsh-node/bin/node）、既存の `RDSH_WSL_DISTRO`・`RDSH_WSL_HARNESS_BIN` がdistributionとwrapperを選びます。

`RDSH_WSL_NODE` が元のNode pathを置き換える設定項目である点以外、既存の変数の意味は変わりません。distributionとwrapperの選択は、この停止の制御よりも前からある既存の仕組みです。

Windowsのinstallerは既存のWSL distributionのx64/arm64 architectureを検出し、pinしたLinux prebuiltを並行インストールします。setupではdistributionを作らず、DSH wrapperを実行しません。Windowsの npm ci を直接走らせるなら、対応する同時WSL prebuiltを手動インストールします。Windows/WSL x64の場合:`RDSH_WSL_NODE` が元のNode pathを指定し（既定は /root/.local/opt/rdsh-node/bin/node）、既存の `RDSH_WSL_DISTRO`・`RDSH_WSL_HARNESS_BIN` がdistributionとwrapperを選びます。

Windowsのinstallerは既存のWSL distributionのx64/arm64 architectureを検出し、pinしたLinux prebuiltを並行インストールします。setupではdistributionを作らず、DSH wrapperを実行しません。Windowsの npm ci を直接走らせるなら、対応する同時WSL prebuiltを手動インストールします。Windows/WSL x64の場合:

```powershell
cd dashboard
npm install --no-save --package-lock=false --ignore-scripts --force @koromix/koffi-linux-x64@3.1.1
```

このコマンドはpinされたバージョンのLinux依存をこのチェックアウトに入れます。ネイティブLinuxの npm ci は自動で自分のprebuiltを選びます。それ以外のarchitecture組合せはcheck-in済みevidenceで検証されていません。

## 停止の段階と持久化

adapterは6つの操作を保持し、stop_stages capabilityはキャンセル・ graceful close/EOF・OS強制終了・強制・検証を説明します。ACPのcancelはnotificationであり、interruptionの確認はcancelされたpromptの結果だけが行います。Webにはinputキャンセルcapabilityがありません。WindowsでのTERMは明示的に非対応で、プロトコル/EOFと期限切れのJob終了が使えます。

所有の意図はprofile起動前にfsyncします。privateなrun履歴はowner ID・run ID・rootの出生/scope観察・カーネルグループのdescriptorを紐付けます。要求は効果の前に記録し、その後に結果と設定済みの期限を書きます。journalへの書き込みが失敗しても、生きている所有handleを使ったcleanupは可能ですが、durableな検証済み完了は生みません。gracefulと強制の待ちには別々のbudgetがあり、期限切れのプロトコルcallbackが確認済みacknowledgementに化けることはありません。

重複・同時の要求は1つのstop promiseを共有します。monitor喪失・読めないグループ・最終期限後も残る子孫・未確認の履歴は、検証不能な結果のまま残ります。保存されたPIDが標的を推測することはありません。supervisor EOF後のcleanupはこのグループに限られ、monitor喪失後のクライアント側の証明を生みません。管理リソースの解放はプロセスexitの証明とは別です。つまり「handleを閉じた」と「子孫も含めて止まったと確認した」は別の事実で、API応答と表示では後者だけが停止の完成を示します。

## 段階の対照

| 段階 | 何をするか | 完了の根拠 |
| --- | --- | --- |
| inputキャンセル | ACPのcancelを通知する | cancelされたpromptの結果 |
| graceful close | プロトコルのEOF/正常終了を待つ | プロトコル上のclose |
| OS強制終了 | Jobハンドル / `cgroup.kill` を使う | 既存のライブハンドル |
| 子孫検証 | 全員が exited したか確認する | populated 0またはJob空のみ |

## 人間UIとAPI

## 人間UIとAPI

Harness 入口ページは、running・stopping・確認済み空の子孫・検証不能の各stateを、run ID・残所有PID/count・段階履歴と共に表示します。停止ボタンは即座に無効化され、ページは確認のために残ります。

GET `/_rdsh/api/managed-process` はそのスコープ付き結果を返します。認証付き人間か管理者がPOST `/_rdsh/api/managed-stop` を許可し、202応答は要求の受理だけで停止の完了確認ではありません。非認証やMCP credentialは操作できず、既存のhost/origin確認とブラウザcookie bootstrapが適用されます。

POST `/_rdsh/api/stop` は管理者専用のままです。dashboardを閉じる前に管理されたHarnessのexitを確認し、検証できない停止は409応答でdashboardとinstance lockを保持します。独立したDSH インスタンスや人間の端末に、このrunの所有は発生せずsignalも送られません。

## 検証

実際のキャプチャ・fixture出力・ネイティブWeb起動・Windows→WSLのバイト保持は `docs/evidence/scoped-stop.md` を参照します。カーネル契約の参照源: [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)、[Linux cgroups](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[pidfdシグナル](https://man7.org/linux/man-pages/man2/pidfd_send_signal.2.html)、[systemd delegation](https://systemd.io/CGROUP_DELEGATION/)。

## 実務上の注意

- rootプロセスの終了を見てもrunの停止の証明にはなりません。API応答では「子孫検証済み」と「検証不能」が区別されます。検証不能なままで次の作業に進めるのは安全な理由が必ずあってからです。
- Linuxはcgroup v2とpidfdがある環境だけで動きます。非root運用は権限を委譲されたsystemdサービスの整備が前提で、足りなければ起動時点で `ownership_unavailable` として停止します。

## 出典

UPSTREAM: https://github.com/jimoto-no-llm/rustdsh/blob/main/docs/SCOPED-STOP.md
