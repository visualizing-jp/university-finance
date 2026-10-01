"""公開ページから計算書類PDFを data/raw へ置く。多摩美の原本は再取得しない。

    python3 scripts/collect_pdfs.py            # すべて
    python3 scripts/collect_pdfs.py seika seian
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (compatible; university-finance-collector/1.0)"
ROOT = Path(__file__).resolve().parents[1] / "data" / "raw"

ZOKEI = {
    year: f"https://www.kuwasawa.ac.jp/pdf/kessan{year}.pdf" for year in range(2021, 2026)
}
JOSHIBI = {
    2025: "https://www.joshibi.ac.jp/sites/default/files/common/file/%E4%BB%A4%E5%92%8C7%E5%B9%B4%E5%BA%A6%E3%80%80%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E.pdf",
    2024: "https://www.joshibi.ac.jp/sites/default/files/common/file/%E4%BB%A4%E5%92%8C6%E5%B9%B4%E5%BA%A6%E3%80%80%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E.pdf",
    2023: "https://www.joshibi.ac.jp/sites/default/files/paragraph_file/2024-06/R5%E5%B9%B4%E5%BA%A6%E3%80%80%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E.pdf",
    2022: "https://www.joshibi.ac.jp/sites/default/files/paragraph_file/2024-06/R4%E5%B9%B4%E5%BA%A6%E3%80%80%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E_1.pdf",
    2021: "https://www.joshibi.ac.jp/sites/default/files/paragraph_file/2023-07/%E4%BB%A4%E5%92%8C3%E5%B9%B4%E5%BA%A6%20%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E_0.pdf",
    2020: "https://www.joshibi.ac.jp/sites/default/files/paragraph_file/2022-06/%E4%BB%A4%E5%92%8C2%E5%B9%B4%E5%BA%A6%E8%A8%88%E7%AE%97%E6%9B%B8%E9%A1%9E.pdf",
}
NICHIDAI = {
    2025: "https://www.nihon-u.ac.jp/assets/2026073105874.pdf",
    2024: "https://www.nihon-u.ac.jp/assets/20250530174148.pdf",
    2023: "https://www.nihon-u.ac.jp/assets/20240531122649.pdf",
    2022: "https://www.nihon-u.ac.jp/assets/20230601110704.pdf",
    2021: "https://www.nihon-u.ac.jp/assets/20220525140009.pdf",
    2020: "https://www.nihon-u.ac.jp/assets/20210531173020.pdf",
    2019: "https://www.nihon-u.ac.jp/assets/20200915175331.pdf",
}

SEIAN_BASE = "https://www.seian.ac.jp/assets/pdf/about/public_info/"
SEIAN = {
    2025: SEIAN_BASE + "R7_keisanshorui.pdf",
    2024: SEIAN_BASE + "R6_keisanshorui.pdf",
    2023: SEIAN_BASE + "R5_keisanshorui.pdf",
    2022: SEIAN_BASE + "R4_keisanshorui.pdf",
    2021: SEIAN_BASE + "R3_keisanshorui.pdf",
    2020: SEIAN_BASE + "R2_keisanshorui.pdf",
    2019: SEIAN_BASE + "R1_keisanshorui.pdf",
    2018: SEIAN_BASE + "R1_31_H30HPkeisanshorui.pdf",
    2017: SEIAN_BASE + "30_01H29keisanshorui.pdf",
    2016: SEIAN_BASE + "01_H28keisansyorui.pdf",
    2015: SEIAN_BASE + "28_1_H27keisansyorui.pdf",
}

# 京都精華大学は2024年度まで、貸借対照表（総括表）・活動区分資金収支計算書・事業活動収支計算書を
# 別PDFで出す。総括表には現金預金・借入金・未払金がないため、2024年度の貸借対照表は
# 2025年度計算書類の前年度末列から読む（extract_tamabi.py の bs_from_next_year）。
# 2023年度以前は総括表しかなく、2016–2019年度はPDF自体が残っていないので扱わない。
SEIKA_HOUJIN = "https://www.kyoto-seika.ac.jp/about/houjin/pn05ej000000fnsg-att/"
SEIKA = {
    2025: [SEIKA_HOUJIN + "pn05ej000000tu8c.pdf"],
    2024: [
        SEIKA_HOUJIN + f"{name}.pdf"
        for name in ("gjh1lq0000005tmb", "gjh1lq0000005tm9", "gjh1lq0000005tm8")
    ],
}


def fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        body = res.read()
    if not body.startswith(b"%PDF"):
        raise SystemExit(f"PDFではない: {url}")
    dest.write_bytes(body)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")


def fetch_joined(urls: list[str], dest: Path) -> None:
    """1年度が複数PDFのとき、pdfunite で1冊にする。"""
    if len(urls) == 1:
        fetch(urls[0], dest)
        return
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for index, url in enumerate(urls):
            part = Path(tmp) / f"{index}.pdf"
            fetch(url, part)
            parts.append(str(part))
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["pdfunite", *parts, str(dest)], check=True)
    print(f"joined {dest}")


def main() -> None:
    wanted = set(sys.argv[1:])

    def want(name: str) -> bool:
        return not wanted or name in wanted

    if want("zokei"):
        for year, url in ZOKEI.items():
            fetch(url, ROOT / "zokei" / f"fy{year}.pdf")
    if want("joshibi"):
        for year, url in JOSHIBI.items():
            fetch(url, ROOT / "joshibi" / f"fy{year}.pdf")
    if want("nichidai"):
        for year, url in NICHIDAI.items():
            fetch(url, ROOT / "nichigei" / f"fy{year}.pdf")
    if want("seian"):
        for year, url in SEIAN.items():
            fetch(url, ROOT / "seian" / f"fy{year}.pdf")
    if want("seika"):
        for year, urls in SEIKA.items():
            fetch_joined(urls, ROOT / "seika" / f"fy{year}.pdf")


if __name__ == "__main__":
    main()
