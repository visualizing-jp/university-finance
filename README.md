# 学校法人の経営状況

多摩美術大学と武蔵野美術大学の計算書類を、2015年度以降について見る。visualizing.jp 向けのスタンドアロン（dataviz.jp のサブスクツールではない）。

- 収支: 事業活動収入が支出と基本金組入前収支差額へ分かれる Sankey
- 資産・負債: 貸借対照表の左右
- 資金の流れ: 活動区分資金収支のウォーターフォール
- 経年変化: 収入・支出・ストック・収支差額の折れ線

## 開発

```bash
npm install
npm run verify
npm run dev
```

アドレスバーが、見ている年度と切り口です。

```
/?id=tamabi&year=2024
/?id=musabi&year=2025
/?id=tamabi&year=2024&view=balance
/?id=tamabi&year=2024&view=cash
/?id=tamabi&year=2024&view=trend
```

`view` の既定 `income` は URL から省く。経年変化でも `year` は残し、年度のある画面へ戻したときに使う。

数値の正本は公式の会計報告PDF。科目の畳み方は [`docs/accounts.md`](docs/accounts.md)。PDFを置き直すときは `python3 scripts/extract_tamabi.py <pdfのあるディレクトリ> <出力json>`。ファイル名は `fy2015.pdf` のように年度。多摩美術大学の令和6年度はフォントが抜けるため、同じディレクトリの `fy2024.txt`（行に戻したOCR）を読む。武蔵野美術大学は `data/raw/musabi` から `public/data/musabi.json` を作る。
