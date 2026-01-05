# GPK Utility
![Image](https://github.com/user-attachments/assets/706d0026-5f85-492e-bf3a-8cf3270cd40f)

[README (English)](./README.md)

**GPK Utility**は、トラックパッドおよびキーボードのための設定ユーティリティです。<br>
デバイスに応じたカスタマイズ機能を提供します。<br>
本アプリケーションは、アクティブウィンドウの状態を常時監視し、レイヤー切り替え機能を提供するため、ウィンドウを閉じた後もタスクトレイ（またはシステムトレイ）に常駐します。<br>
なお、機能を利用しない場合には、メニュー設定により「ウィンドウを閉じた際にアプリケーションを終了する」動作への切り替えも可能です。

#### 注意
GPK Utilityを起動する前にVialなどデバイスと通信するアプリケーションを起動しないでください。<br>
同時に立ち上げ、デバイスが認識しない場合は、アプリケーションを全て終了し、デバイスを接続し直してから、GPK Utilityを起動してください。
Device Polling Interval、トラックパッドの設定は設定内容によりデバイスの動作に支障をきたす場合があります。<br>
設定変更の際は十分にご確認のうえ慎重に操作してください。<br>
万が一、動作に問題が生じた場合は、Device Polling Intervalを1000msec、トラックパッドはVial Userタブにある「EEPROM Clear」ボタンを設定し押すことで、デバイス設定を初期化することが可能です。<br>
EEPROM Clearはトラックパッド以外の全ての設定もクリアされます。

![Image](https://github.com/user-attachments/assets/b9a13791-89b5-4eea-942b-cd967c2d444d)

#### Linux: Auto Layer SwitchにはX11が必要
**Auto Layer Switch**機能はLinuxでは**X11**が必要です。<br>
Waylandでネイティブ動作しているウィンドウは検出できません。<br>
この機能を使用するには、**X11セッション**（ログイン画面で「Ubuntu on Xorg」など）でログインしてください。<br>


## Feature Tabs

### Common

#### Layer
各レイヤー（モード）の設定を管理します。<br>異なる操作モードを切り替えて使用することができます。

- **Trackpad Layer**: トラックパッドを触れている間は専用のレイヤーへ移動する
- **Haptic Feedback on Layer Change**: レイヤー変更時の触覚フィードバックの有効/無効とパターン設定 (Hapticセクションを参照)
- **Auto Layer Switch**: アプリケーションごとに自動的にレイヤーを切り替える設定
  - 特定のアプリケーションがアクティブになったときに指定したレイヤーに自動的に切り替わる
- **登録方法**: 設定したいアプリケーションをアクティブにするとセレクトリストに登録されます<br>リストに登録されるアプリケーションは最新の10件のみです<br>アプリケーションを起動し直すと初期化されます  

https://github.com/user-attachments/assets/ba6a7bcf-7245-4bfc-9b17-367660a74c7d

#### Haptic
触覚フィードバックの設定を管理します。
- **Haptic Feedback on Layer Change**: レイヤー変更時の触覚フィードバックの有効/無効を設定します。
- **Haptic Feedback Pattern**: レイヤー変更時の触覚フィードバックのパターンを選択します。

### Trackpad Features

#### Mouse
マウスの動作速度の動作をカスタマイズします。

- **Speed**: ポインタの移動速度を0.1から5.0の範囲で調整（値が大きいほど速い）

#### Scroll
スクロールの速度、方向の設定を調整します。<br>スムーズなスクロールや方向反転などを設定できます。

- **Reverse Vertical Direction**: 垂直スクロール方向を反転する設定（標準/反転）
- **Reverse Horizontal Direction**: 水平スクロール方向を反転する設定（標準/反転）
- **Short Scroll**: 短いスクロール操作で多量スクロールの有効/無効にする設定
- **Scroll Term**: スクロールコマンドを発行する間隔を0-300msの範囲で調整
- **Scroll Step**: 1回のスクロールで移動する行数を1-16行の間で調整
- **Short Scroll Term**: ショートスクロールが有効になるまでの時間を0-500msの範囲で調整

#### Drag & Drop
ドラッグアンドドロップの挙動を設定します。

- **Drag & Drop**: ドラッグ＆ドロップ機能の有効/無効
- **Mode**: ドラッグモードの選択
  - Term: 時間ベースのドラッグ制御
  - Strength: 強度ベースのドラッグ制御
- **Term**: ドラッグ状態になるまでの時間を0-1000msの範囲で調整
- **Strength**: ドラッグ状態になるまでの強さを1-12の範囲で調整

#### Timer
ポモドーロタイマーの時間管理機能を設定します。<br>
作業時間と休憩時間の調整が可能です。  
![Image](https://github.com/user-attachments/assets/bc964f72-80b5-40a8-9988-5310a1126fa4)  
デバイスの起動時はオフになっているので、Pomodoro Toggleを押してタイマーをスタートさせます。<br>

- **Work Time**: ポモドーロタイマーの作業時間を1-60分の範囲で設定
- **Break Time**: 短い休憩時間を1-30分の範囲で設定
- **Long Break Time**: 長い休憩時間を1-60分の範囲で設定
- **Work Interval Count**: 長い休憩が始まるまでの作業/休憩サイクル数を1-10の範囲で設定
- **Pomodoro Cycle Count**: 作業インターバル数を繰り返す回数を1-10の範囲で設定
- **Haptic Feedback**: 作業開始、休憩開始時の触覚フィードバックパターンを設定
- **Continuous Mode**: 手動介入なしに次のセッション（作業/休憩）を自動的に開始します。
- **Desktop Notification**: ポモドーロのフェーズ変更時にデスクトップ通知を有効/無効にします。<br>
GPK Utilityがアクティブでない時に通知されます。
- **Haptic Notification**: ポモドーロのフェーズ変更時に触覚通知を有効/無効にします。<br>
Break、Long Break時は30秒間通知されます。<br>
通知が解除されないとトラックパッドのタップ操作が行えないので、ダブルタップして通知を解除してください。<br>
対応デバイスは状態に合わせて、LEDの一部が光ります(solid_color時のみ)

Work - RED  
![RED](https://github.com/user-attachments/assets/18df9665-6e15-411e-a44b-80f67e20b3cb)  
Break - GREEN  
![GREEN](https://github.com/user-attachments/assets/07c4853a-408d-4321-897a-69f009da559b)  
Long Break - BLUE  
![BLUE](https://github.com/user-attachments/assets/d8f952c1-e35a-46e3-b6fd-e4bd8a21cbc8)  

#### Gesture
トラックパッドのジェスチャー設定を構成します。
- **Tap Term**: 次のタップが使用できるまでの間隔（0-500ms）
- **Swipe Term**: 次のスワイプが使用できるまでの間隔（0-500ms）
- **Pinch Term**: 次のピンチジェスチャーが使用できるまでの間隔（0-500ms）
- **Pinch Distance**: 次のピンチジェスチャーが使用できるまでの間隔（0-500）

### Keyboard Features

#### OLED
キーボードのOLEDディスプレイ用の表示設定

- **Time Display**: OLEDディスプレイの最後の一行に現在時刻を表示します

#### LED
デバイスの状態やレイヤーごとのLEDカラー設定

- **スピードインジケーター**: マウススピード加速、スクロールステップ加速、水平スクロールインジケーターの色を設定
- **ポモドーロカラー**: 作業、休憩、長期休憩フェーズの色を設定（フェーズ変更時に5秒間点灯）
- **レイヤーカラー**: 各レイヤーごとに個別の色を設定
  - カラーピッカーを開くと自動的にそのレイヤーに切り替わります
  - カラーピッカーを閉じるとレイヤー0に戻ります
  - 注意：トラックパッドレイヤーが有効な場合は、色を設定する前にレイヤータブからオフにしてください
- **重要**: LEDインジケーターはRGBエフェクトがSolid Colorモードの時のみ動作します

### Application Settings

- **Language**: アプリケーションの言語を変更
- **Import/Export Settings**: すべてのデバイス・アプリ設定をファイルでインポート/エクスポート
- **System Tray**: 閉じた時にトレイに最小化、起動時にトレイに最小化して開始
- **Device Polling Interval**: デバイス状態の取得間隔を調整（200-2000ms）
- **Updates**: 最新の10件のアップデート情報

## 使用方法

1. 対応するGPKデバイスをPCに接続します
2. GPK Utilityを起動します
3. 上部タブからデバイスを選択します
4. 左側のメニューから設定したい機能を選択します
5. 各設定を調整し、デバイスに適用します

## カスタム
https://github.com/darakuneko/vial-qmk/tree/gpk-utility

ご自身のVialキーボードを対応させたい場合はgpk-utilityブランチを使用して、rules.mkにGPKRC_ENABLE = yes
を必ず追加してください

rules.mk<br>
GPKRC_ENABLE = yes

### 定義
- **Application**: 
https://github.com/darakuneko/vial-qmk/blob/gpk-utility/quantum/gpk_rc.h  
- **Application**: 
https://github.com/darakuneko/gpk-utility/blob/main/gpkrc.js  
  
### 作例:   
keyboard(Auto Layer Switch/OLED): [gpk60_47gr1re_vial](https://github.com/darakuneko/keyboard/tree/main/qmk/gpk60_47gr1re_vial)   
trakpad: [numnum bento](https://github.com/darakuneko/keyboard/tree/main/qmk/numnum_bento)   

**仕様は予告なく変更されます**

## 開発者サポート

**コーヒーを奢る**  
[Amazon Wishlist](https://www.amazon.co.jp/hz/wishlist/ls/66VQJTRHISQT) | [Ko-fi](https://ko-fi.com/darakuneko)

---

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

<div align="center">

**GPK FWMaker - QMK/Vialファームウェア生成をもっと簡単に**

Made with ❤️ by [darakuneko](https://github.com/darakuneko)

</div>