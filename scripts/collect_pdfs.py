"""公開ページから計算書類PDFを data/raw へ置く。多摩美の原本は再取得しない。"""

from __future__ import annotations

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


def fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        dest.write_bytes(res.read())
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")


def main() -> None:
    for year, url in ZOKEI.items():
        fetch(url, ROOT / "zokei" / f"fy{year}.pdf")
    for year, url in JOSHIBI.items():
        fetch(url, ROOT / "joshibi" / f"fy{year}.pdf")
    for year, url in NICHIDAI.items():
        fetch(url, ROOT / "nichigei" / f"fy{year}.pdf")


if __name__ == "__main__":
    main()
