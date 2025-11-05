## フロントエンドアーキテクチャ概要

本ドキュメントは、以下の 4 記事の内容をもとに、フロントエンドのアーキテクチャ構成をわかりやすく整理したものです。

- [全体像・コンポーネント設計](https://zenn.dev/knowledgework/articles/91a3dd575f99a2)
- [Resource Set（Model/Repository/Usecase）](https://zenn.dev/knowledgework/articles/99f8047555f700?redirected=1)
- [State 管理（SWR/Recoil/useState）](https://zenn.dev/knowledgework/articles/607ec0c9b0408d?redirected=1)
- [設計の補足・議論ポイント](https://zenn.dev/knowledgework/articles/32371c83e68cbe?redirected=1#discuss)

---

## 目的と設計原則

- **責務分離**: UI・状態管理・ドメイン・外部 I/O を明確に分離し、変更影響を局所化する。
- **変更容易性**: 「画面の見た目」「ユースケースの変更」「API 変更」が互いに波及しにくい構成にする。
- **ドメイン指向**: ビジネスルールは UI から切り離し、ユースケース/モデルに集約する。
- **疎結合・明確な依存方向**: UI → Usecase → Repository → 外部 API（下向き一方向）。

---

## 構成要素（レイヤ）

- **Component**: 画面を構成する React コンポーネント群。
- **Global State**: アプリ全体で共有する状態（例: 認証、トースト）。
- **Resource Set**: ドメイン処理（Model / Repository / Usecase）を束ねた単位。
- **Library**: 共通ユーティリティ、UI 基盤、SDK ラッパ等。

---

## 推奨ディレクトリ構成（例）

```
src/
├── components/
│   ├── page/          # ページを表すコンポーネント（Next.js の pages はルーティング専用）
│   ├── model/         # 特定のドメインモデルに関心を持つコンポーネント
│   ├── ui/            # モデル非依存の汎用 UI（Button, Modal など）
│   └── functional/    # 機能的コンポーネント（例: KeyBind）
├── globalStates/      # Recoil 等のグローバルステート定義
├── models/            # Model レイヤ（型・ドメインロジック）
├── repositories/      # Repository レイヤ（外部I/O・API クライアント）
├── usecases/          # Usecase レイヤ（ビジネスロジック）
└── libraries/         # 共通ライブラリ
```

---

## Component の 4 分類と役割

- **page**

  - 1 ページの実体。ルーティングは `pages/`（Next.js）に任せ、実体は `components/page` に置く。
  - 画面構造・データ取得の起点・ユースケース呼び出しを担う。

- **model**

  - 特定ドメイン（例: User, Article）に関心を持つ見た目付きコンポーネント。
  - 型・表示仕様の結びつきが強い UI 部品（例: `UserAvatar`）。

- **ui**

  - モデルに依存しない純粋な見た目の部品（ボタン、入力、モーダルなど）。
  - 再利用性・Storybook 単位の検証に適する。

- **functional**
  - 見た目を伴わない、または見た目に依存しない振る舞い提供（例: キーバインド、アクセシビリティ補助）。

---

## Resource Set の構造（Model / Repository / Usecase）

Resource Set はリソース（例: User）単位で以下の 3 レイヤに分割します。

```
src/
├── models/
│   └── user/
│       ├── type.ts       # ドメイン型定義
│       └── selector.ts   # ドメインロジック（純粋関数）
├── repositories/
│   └── user/
│       ├── repository.ts # API 呼び出しの集約
│       └── converter.ts  # API ↔ ドメイン型の変換
└── usecases/
    └── user/
        └── useUserList.ts # 具体的な業務手続き（UI から呼ばれる）
```

- **Model**

  - `type.ts` にドメイン型、`selector.ts` に計算・整形などの純粋ロジックを配置。
  - UI に依存しない。テスト容易。

- **Repository**

  - 外部通信（REST/GraphQL/SDK）を担当。
  - `converter.ts` で API 応答をドメイン型へ（および逆変換）。

- **Usecase**
  - UI から呼ばれるビジネス手続きの本体。
  - Model ロジックと Repository を組み合わせ、ユースケース単位の関数として提供。

依存方向は UI → Usecase → Repository → 外部 API（下流）。Model は横断的に Usecase から参照されるが、UI/Repository へは依存しない。

---

## State 管理ポリシー

- **サーバーデータのキャッシュ**: `SWR` を採用。フェッチ＋キャッシュは UI ではなくデータ層として扱い、グローバルステートと分離。
- **グローバルステート**: `Recoil` でアプリ横断の状態（認証、トースト、UI モード等）を管理。
- **ローカルステート**: ページをまたがない UI の一時状態は各コンポーネントで `useState`。

ガイドライン:

- サーバーデータを安易にグローバルステートへ入れない（キャッシュ戦略は SWR に委譲）。
- 導出可能な状態（derived state）は Recoil ではなく Model の `selector.ts`（純粋関数）で扱う。
- フォームなどは UI 層で管理し、永続化は Usecase 経由で行う。

---

## データフロー（概念）

1. Component（page/model/ui/functional）からユースケース関数を呼ぶ。
2. Usecase が必要に応じて Repository を呼び、外部 API から取得。
3. Repository が `converter` で API 形式をドメイン型に変換。
4. Usecase が Model のロジック（selector）で整形・検証等を実施。
5. Component は結果を受け取り、UI を描画。
6. キャッシュが関与する読み取りは SWR、共有 UI 状態は Recoil、局所 UI 状態は useState。

---

## 実装レシピ（新規ページ例: ユーザー一覧）

1. `models/user/type.ts` にドメイン型を定義。
2. `repositories/user/{repository,converter}.ts` を実装（API と型変換）。
3. `usecases/user/useUserList.ts` を作成（ページで必要な処理を関数化）。
4. `components/model/user/UserList` と `components/ui` を組み合わせて表示部品を構築。
5. `components/page/UserList` でページ実体を作成し、SWR でデータ取得＋ユースケース連携。
6. 必要な共有状態のみ `globalStates` へ切り出し（不要なら局所 state）。

---

## テスト戦略（要点）

- Model のロジック（selector）は純粋関数としてユニットテストしやすい形に。
- Usecase は副作用を伴うため、Repository をモックして手続きの結果を検証。
- UI は Storybook 単位＋コンポーネントテストで振る舞いを担保。

---

## よくある議論ポイント（抑えどころ）

- **SWR と Recoil の境界**: 取得・キャッシュは SWR、アプリ横断 UI 状態は Recoil。
- **型変換の責務**: API ↔ ドメインの変換は `converter.ts` に集約し、UI/Usecase に漏らさない。
- **フォルダ設計の柔軟性**: 大規模化に応じてリソース単位の分割や階層の深さを調整。

---

## 参考

- [全体像・コンポーネント設計](https://zenn.dev/knowledgework/articles/91a3dd575f99a2)
- [Resource Set（Model/Repository/Usecase）](https://zenn.dev/knowledgework/articles/99f8047555f700?redirected=1)
- [State 管理（SWR/Recoil/useState）](https://zenn.dev/knowledgework/articles/607ec0c9b0408d?redirected=1)
- [設計の補足・議論ポイント](https://zenn.dev/knowledgework/articles/32371c83e68cbe?redirected=1#discuss)
