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

## 京都精華大学（学校法人京都精華大学）

- 公開: https://www.kyoto-seika.ac.jp/about/houjin/
- 使うファイル: 2025年度は「計算書類」PDF 1冊。2024年度は貸借対照表・活動区分資金収支計算書・事業活動収支計算書の個別PDFを `pdfunite` で1冊にする
- 取得できた年度: 2024–2025
- 2024年度の貸借対照表は総括表だけで、現金預金・借入金・未払金がない。そのため2025年度計算書類の前年度末列から読む。資産合計は2024年度の総括表と一致することを確かめている
- 2020–2023年度も Internet Archive に同じ様式のPDFが残るが、貸借対照表が総括表だけなので使わない。2016–2019年度のPDFは公式サイトにもアーカイブにも無い
- 2025年度は改正後の会計基準の様式。PDFの字の位置がずれ、`固定資産` が `固定産資` のように読める行がある。抽出側は、字を並べ替えると科目名になる行をその科目として読む

```
python3 scripts/collect_pdfs.py seika
python3 scripts/extract_tamabi.py data/raw/seika public/data/seika.json seika
```

## 嵯峨美術大学（学校法人大覚寺学園）

- 公開: https://www.kyoto-saga.ac.jp/about/info/
- 使うファイル: 2025年度は「計算書類等」PDF。2024年度以前は事業活動収支計算書・活動区分資金収支計算書・貸借対照表の個別PDFを、Internet Archive の版から取り `pdfunite` で1冊にする（公式サイトは同じURLを毎年差し替えてきた）
- 取得できた年度: 2020・2021・2023・2024・2025。2022年度の3表はどの版にも残っていない。画面では欠けとして扱い、経年の線をそこで切る
- 2020年度は貸借対照表が残っていないので、2021年度の前年度末列から読む
- 計算書類は法人全体。嵯峨美術短期大学を含む
- 太字の科目・合計行と表題が文字でなく図形で描かれ、テキスト層に無い。`scripts/ocr_pdf.swift`（macOS の Vision）で、テキスト層の語はそのまま使い、無い部分だけをOCRで補った `fyYYYY.txt` を作る。抽出は `.txt` があればそちらを読む
- OCRが太字行を読み違えた3か所（2023年度の人件費・流動資産、2024年度の繰越収支差額の符号）は、`extract_tamabi.py` の `ocr_fixes` で直す。正しい値は内訳行の合計で確かめた
- 照合: 抽出した全年度・全項目を、同法人の事業報告書（R6年度版・R7年度版）の経年表（千円）と突き合わせ、千円未満の差に収まることを確かめた。2025年度の施設整備等活動・その他の活動の資金収支差額だけは事業報告書と2,000万円ずつ逆にずれるが、計算書類のテキスト層の値（施設整備等 △287,196,427円、その他 8,378,646円）を正とする

```
python3 scripts/collect_pdfs.py saga
for y in 2020 2021 2023 2024 2025; do swift scripts/ocr_pdf.swift data/raw/saga/fy$y.pdf > data/raw/saga/fy$y.txt; done
python3 scripts/extract_tamabi.py data/raw/saga public/data/saga.json saga
```

## 京都美術工芸大学（学校法人二本松学院）

- 公開: https://www.kyobi.ac.jp/nihonmatsu/ （2015–2025年度の「財務情報」PDF）
- 画面には入れない。計算書類は法人全体で、専門学校2校（京都建築大学校・京都伝統工芸大学校）を含み、2025年度の教育活動収入のうち大学は約45%にとどまる

## 成安造形大学（学校法人京都成安学園）

- 公開: https://www.seian.ac.jp/about/public_info/
- 使うファイル: 各年度の「計算書類」PDF
- 取得できた年度: 2015–2025
- 計算書類は法人全体。成安幼稚園を含む。2024年度の事業活動収支内訳表では、事業活動収入のうち幼稚園は約5%

```
python3 scripts/collect_pdfs.py seian
python3 scripts/extract_tamabi.py data/raw/seian public/data/seian.json seian
```

## 日本大学芸術学部

芸術学部だけの事業活動収支計算書・貸借対照表は、学部サイトにも法人の情報公開にも無い。公開されているのは学校法人日本大学の決算書（全学部・附属校を含む）。

- 公開: https://www.nihon-u.ac.jp/disclosure/financial/report/
- 使うファイル: 各年度の「決算書」（事業報告書ではない）
- 取得できた年度: 2019–2025。2024年度PDFはCIDフォントでテキストが抜け、OCR待ち
- 法人全体の規模は美術大学単体と並べられない。画面の描画対象には入れない。JSONは `public/data/nichidai.json` に残す

```
python3 scripts/extract_tamabi.py data/raw/nichigei public/data/nichidai.json nichidai
```
