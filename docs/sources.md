# 計算書類の出典

数値の正本は各学校法人が公開している計算書類（単位は円。千円表記の年は1000倍して円にする）。事業報告書の総括や万円概要は使わない。PDFそのものは `data/raw/` に置き、リポジトリには入れない。

多摩美術大学のPDFはローカル作業で既に揃えている。こちらでは再取得しない。武蔵野美術大学のJSONは main 側で抽出済みのものを使う。

## 東京造形大学（学校法人桑沢学園）

- 公開: https://www.kuwasawa.ac.jp/report.html
- 使うファイル: `kessanYYYY.pdf`（決算概要及び決算報告書）
- 取得できた年度: 2021–2025。2015–2020 の同名URLは 404
- 計算書類は学園全体。専門学校桑沢デザイン研究所を含む。2025年度のセグメント注記では、基本金組入前当年度収支差額のうち大学が約2億300万円、研究所が約2,000万円
- 大学部門だけの事業活動内訳は、同じページの `hiritsuYYYY.pdf` にある。貸借対照表は学園全体のみ

```
python3 scripts/extract_tamabi.py data/raw/zokei public/data/zokei.json zokei
```

## 女子美術大学（学校法人女子美術大学）

- 公開: https://www.joshibi.ac.jp/about/report/details
- 使うファイル: 各年度の「計算書類」PDF
- 取得できた年度: 令和2–7年度（2020–2025）。ページ上、平成27–令和元年度の計算書類リンクはない
- 2020–2024 は千円。2025 は円

```
python3 scripts/extract_tamabi.py data/raw/joshibi public/data/joshibi.json joshibi
```

## 日本大学芸術学部

芸術学部だけの事業活動収支計算書・貸借対照表は、学部サイトにも法人の情報公開にも無い。公開されているのは学校法人日本大学の決算書（全学部・附属校を含む）。

- 公開: https://www.nihon-u.ac.jp/disclosure/financial/report/
- 使うファイル: 各年度の「決算書」（事業報告書ではない）
- 取得できた年度: 2019–2025。2024年度PDFはCIDフォントでテキストが抜け、OCR待ち
- 法人全体の規模は美術大学単体と並べられない。画面の名前は「日本大学」とし、芸術学部単独とは書かない

```
python3 scripts/extract_tamabi.py data/raw/nichigei public/data/nichidai.json nichidai
```
