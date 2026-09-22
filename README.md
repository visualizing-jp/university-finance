# 学校法人の経営状況

美術・芸術系の学校法人の計算書類を見る。visualizing.jp 向けのスタンドアロン（dataviz.jp のサブスクツールではない）。

- 収支: 事業活動収入が支出と基本金組入前収支差額へ分かれる Sankey
- 資産・負債: 貸借対照表の左右
- 資金の流れ: 活動区分資金収支のウォーターフォール
- 経年変化: 収入・支出・ストック・収支差額の折れ線

いま JSON があるのは多摩美術大学、東京造形大学、女子美術大学、日本大学（法人全体）。出典は [`docs/sources.md`](docs/sources.md)。

## 開発

```bash
npm install
npm run verify
npm run dev
```

ルート（`/`）は比較ページへ置き換える。

```
/?mode=compare&year=2025
/?id=tamabi&year=2024
/?id=zokei&year=2025
/?id=joshibi&year=2025
/?id=nichidai&year=2025
```

比較の既定指標 `educationRatio` と、個別大学の既定 `view=income` は URL から省く。

数値の正本は公式の会計報告PDF。科目の畳み方は [`docs/accounts.md`](docs/accounts.md)。PDF は `data/raw/<id>/fyYYYY.pdf`。抽出は `python3 scripts/extract_tamabi.py <pdf dir> <output json> <id>`。
