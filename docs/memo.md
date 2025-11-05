# メモ

- fast bunkai使う
https://zenn.dev/gvatech_blog/articles/cbc9e663238b66
- notionライクに実装
- フォントも変えられたらいいね

https://medium.com/@shreyasmanolkar123/building-notion-clone-part-1-planning-the-architecture-f50342e58019

- BlockNote

https://www.blocknotejs.org/

- zotion

https://github.com/adityaphasu/notion-clone?tab=readme-ov-file

- convex

https://zenn.dev/taroosg/articles/20250609173737-3ea3f2062a8cbd

- フロントエンドアーキ

https://zenn.dev/knowledgework/articles/91a3dd575f99a2

https://zenn.dev/knowledgework/articles/32371c83e68cbe?redirected=1#discuss

- comprehend（デフォルト：positive, negative, neutral, mixの4分類）

https://dev.classmethod.jp/articles/analysis-sentiment-using-analysis-jobs-on-amazon-comprehend/

- カスタム分類で独自の感情分類を組めそう → まだ日本語対応してない

https://techblog.ap-com.co.jp/entry/2024/07/01/093000

# アプリ名

kibi - 感情の**機微（きび）**を発見する日記サービス

## 作りたいもの

- Notionのような快適な書き心地で、日記を書くとその文面からそのときの感情を分析してくれる日記サービス
- なぜ作りたい？
    - 面白そうだから
    - 自分が毎日どういう感情なのか知りたいけど、日記を書くのは気が乗らないし、書いてもどういう感情か結局わからない
    - 今自分ってどういう感情になってること多いんだっけ？をメタ認知できたら色んな人救える気がした

## デザイン

![image.png](./docs/design-image.png)

## 仕様

- ユーザーが日記を書いて保存ボタンを押すと内容が保存される
- 保存ボタンを押すとバックエンドの感情分析機能が実行され結果が返される
- 書いている途中でページを離れようとするとアラートのダイアログが表示される
    - 書いている途中：差分があるとき（新規 or 更新）
- 日記ごとに、感情の割合によって生成されるアイコンが違う
    - 三角形の組み合わせ（色と大きさ）
    - こういうイメージ
        
        ![スクリーンショット 2025-11-05 9.35.55.png](./docs/overview-image.png)
        
    - 生成されたアイコンはその日記のアイコンとしてページに表示される
- 一覧と時系列の2種類で感情の変化を見れる
    - 時系列は、横軸が時間軸（日付）で、アイコンが並んでいる
    - アイコンをクリックするとその日記ページに飛ぶことができる
- サイドバーの日記ごとの部分にも生成したアイコンが表示される
- 感情
    - プルチックの感情の輪に基づく8種類
        - 喜び（Joy）
        - 信頼（Trust）
        - 恐怖（Fear）
        - 驚き（Surprise）
        - 悲しみ（Sadness）
        - 嫌悪（Disgust）
        - 怒り（Anger）
        - 期待（Anticipation）
- 今回は個人用のサービスで、共同編集は想定しないため、Convexを用いたリアルタイムデータベース仕様にはしない

```jsx
保存ボタン押下
├── API1: 日記保存（高速）
└── API2: 感情分析 → 結果を後から更新
```

## 技術選定

- Next.js, TypeScript
- BlockNote（Notionライクに書く）
- fast bunkai？
- AWS Comprehend（感情分析）
- Amazon S3（テキスト保存）
- AWS Lambda（S3にアップされたことをトリガーに感情分析）
- Amazon Cognito（認証）
- DynamoDB（結果やアイコンなどの保存）
- Amazon Translate（Comprehendのカスタム分類に投げる前に英語に翻訳）
- AWS CDK（TypeScript）

### フロントエンドアーキ

https://zenn.dev/knowledgework/articles/91a3dd575f99a2

https://zenn.dev/knowledgework/articles/99f8047555f700?redirected=1

https://zenn.dev/knowledgework/articles/607ec0c9b0408d?redirected=1

https://zenn.dev/knowledgework/articles/32371c83e68cbe?redirected=1#discuss

## TODO

- フロントエンドアーキの理解
- DB設計（Dynamo）
- 感情アイコンのアルゴリズム考案 & 実装
- Comprehendで使うカスタム分類モデルの構築
- 英語翻訳対応
- 日記記述ページ実装
- 一覧画面実装
- 時系列表示画面実装
- CDK構築（TypeScript）