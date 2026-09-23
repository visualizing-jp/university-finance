# 学校法人の経営状況

美術・芸術系の学校法人の計算書類を見る。visualizing.jp 向けのスタンドアロン（dataviz.jp のサブスクツールではない）。

- 収支: 事業活動収入が支出と基本金組入前収支差額へ分かれる Sankey
- 資産・負債: 貸借対照表の左右
- 資金の流れ: 活動区分資金収支のウォーターフォール
- 経年変化: 収入・支出・ストック・収支差額の折れ線
- 大学比較: 経常収入などを分母にした比率を、1指標ずつ横棒と折れ線で並べる
- 経営構造: 純資産比率と教育活動収支差額比率の散布図、収入・支出の積み上げ、6指標のドット、選んだ指標の推移

画面に出すのは多摩美術大学、武蔵野美術大学、東京造形大学、女子美術大学。日本大学のJSONは法人全体のため描画対象に入れていない。出典は [`docs/sources.md`](docs/sources.md)。

## 開発

```bash
npm install
npm run verify
npm run dev
```

公開サイト https://university-finance.visualizing.jp/ は Vite の `dist` を出す。GitHub Pages が `main` 直下を配信するため、ビルド結果をルートにも置く。開発時は `index.vite.html` が入口。

ルート（`/`）は比較ページへ置き換える。

```
/?mode=compare&year=2025
/?mode=structure&year=2025
/?id=tamabi&year=2024
/?id=musabi&year=2025
/?id=zokei&year=2025
/?id=joshibi&year=2025
```

比較の既定指標 `educationRatio` と、個別大学の既定 `view=income` は URL から省く。

数値の正本は公式の会計報告PDF。科目の畳み方は [`docs/accounts.md`](docs/accounts.md)。PDF は `data/raw/<id>/fyYYYY.pdf`。抽出は `python3 scripts/extract_tamabi.py <pdf dir> <output json> <id>`。多摩美術大学の令和6年度はフォントが抜けるため、同じディレクトリの `fy2024.txt` を読む。
