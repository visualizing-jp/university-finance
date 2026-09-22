"""学校法人多摩美術大学の計算書類PDFから、画面用の年度JSONを作る。

対象はこの法人の公開PDFだけ。科目は空白を除いた行頭が勘定科目名と一致する行を使う。
決算列（事業活動収支）・本年度末（貸借対照表）・金額（活動区分資金収支）を取る。
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

MARGIN = set("事業活動収支の部教育支出特別入")
AMOUNT = re.compile(r"[△▲−－-]?\s*(?:\d{1,3}(?:,\d{3})+|0)(?!\d)")

ACTIVITY_NAMES = {
    "学生生徒等納付金",
    "手数料",
    "寄付金",
    "経常費等補助金",
    "付随事業収入",
    "雑収入",
    "受取利息・配当金",
    "その他の教育活動外収入",
    "資産売却差額",
    "その他の特別収入",
    "施設設備寄付金",
    "現物寄付",
    "施設設備補助金",
    "過年度修正額",
    "人件費",
    "教育研究経費",
    "管理経費",
    "徴収不能額等",
    "徴収不能額",
    "借入金等利息",
    "その他の教育活動外支出",
    "資産処分差額",
    "その他の特別支出",
    "事業活動収入計",
    "事業活動支出計",
    "基本金組入前当年度収支差額",
    "教育活動収入計",
    "教育活動外収入計",
    "特別収入計",
    "教育活動支出計",
    "教育活動外支出計",
    "特別支出計",
}
BS_NAMES = {
    "固定資産",
    "流動資産",
    "固定負債",
    "流動負債",
    "基本金",
    "繰越収支差額",
    "現金預金",
    "特定資産",
    "有価証券",
    "資産の部合計",
    "負債の部合計",
    "純資産の部合計",
}
CASH_NAMES = {
    "教育活動資金収支差額",
    "施設整備等活動資金収支差額",
    "その他の活動資金収支差額",
    "前年度繰越支払資金",
    "翌年度繰越支払資金",
}

SECTION_TITLES = {
    "活動区分資金収支計算書": "cash",
    "事業活動収支計算書": "activity",
    "貸借対照表": "bs",
}


def collapse(text: str) -> str:
    return re.sub(r"\s+", "", text)


def amounts(line: str) -> list[tuple[int, int]]:
    found: list[tuple[int, int]] = []
    for match in AMOUNT.finditer(line):
        raw = match.group(0)
        negative = any(mark in raw for mark in "△▲−－-")
        digits = re.sub(r"[^\d]", "", raw)
        if digits == "":
            continue
        value = int(digits)
        found.append((match.start(), -value if negative else value))
    return found


def line_label(line: str, start: int) -> str:
    label = collapse(line[:start])
    label = re.sub(r"^[0-9]+", "", label)
    return label.replace("（", "").replace("）", "").replace("(", "").replace(")", "")


def match_name(label: str, names: set[str]) -> str | None:
    """行頭の縦書き1〜3文字を外し、残りの最長一致を科目にする。"""
    best: str | None = None
    for cut in range(0, 4):
        if cut > len(label):
            break
        if cut and any(ch not in MARGIN for ch in label[:cut]):
            break
        head = label[cut:]
        if head in names and (best is None or len(head) > len(best)):
            best = head
    return best


def pdf_text(path: Path) -> str:
    return subprocess.check_output(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
        text=True,
        errors="replace",
    )


def normalize_ocr(text: str) -> str:
    """令和6年度PDFはフォントが抜け、OCR行を読む。誤認しやすい字だけ直す。"""
    text = (
        text.replace("收", "収")
        .replace("營", "管")
        .replace("营", "管")
        .replace("資產", "資産")
        .replace("资", "資")
        .replace("事菜", "事業")
        .replace("獎", "奨")
        .replace("•", "・")
        .replace("･", "・")
        .replace("·", "・")
        .replace("頟", "額")
        .replace("文出", "支出")
        .replace("徵", "徴")
        .replace("羞額", "差額")
    )
    lines: list[str] = []
    for line in text.splitlines():
        line = re.sub(r"(?<=\d),\s+", ",", line)
        line = re.sub(r"(?<=\d)、(?=\d)", ",", line)
        line = re.sub(r"(?<![A-Za-z0-9])A\s+(?=\d)", "△", line)
        lines.append(line)
    return "\n".join(lines)


def load_year_text(raw: Path, year: int) -> str:
    ocr = raw / f"fy{year}.txt"
    if ocr.exists():
        return normalize_ocr(ocr.read_text(encoding="utf-8"))
    return pdf_text(raw / f"fy{year}.pdf")


def rows_from_text(text: str, *, ocr: bool = False) -> dict[str, list[tuple[str, int, bool]]]:
    section: str | None = None
    buckets: dict[str, list[tuple[str, int, bool]]] = {"activity": [], "bs": [], "cash": []}
    names = {"activity": ACTIVITY_NAMES, "bs": BS_NAMES, "cash": CASH_NAMES}
    columns = {"activity": 1, "bs": 0, "cash": 0}
    for line in text.splitlines():
        title = collapse(line)
        if title == "活動区分資金収支計算書":
            section = "cash"
            continue
        if title == "資金収支計算書":
            section = None
            continue
        if title in SECTION_TITLES:
            section = SECTION_TITLES[title]
            continue
        if section == "bs" and (title.startswith("注記") or "重要な会計方針" in title):
            section = None
            continue
        if section == "activity" and (title.startswith("（注）") or title.startswith("(注)") or "予備費の使用額" in title):
            section = None
            continue
        if section is None:
            continue
        found = amounts(line)
        if not found:
            continue
        label = line_label(line, found[0][0])
        name = match_name(label, names[section])
        if name is None:
            continue
        values = [value for _, value in found]
        if section == "bs" and ocr and len(values) == 2:
            # 全文OCRが本年度末列を落とす行は「前年度末、増減」になる。
            chosen = values[0] + values[1]
        elif section == "activity" and ocr and len(values) == 2:
            # 予算か決算のどちらかが欠ける行。差額の方が小さい。
            chosen = values[0] if abs(values[0]) >= abs(values[1]) else values[1]
        else:
            index = columns[section]
            if index >= len(values):
                continue
            chosen = values[index]
        parenthesized = "(" in line or "（" in line
        buckets[section].append((name, chosen, parenthesized))
    return buckets


def hits_of(rows: list[tuple[str, int, bool]], name: str) -> list[tuple[str, int, bool]]:
    return [row for row in rows if row[0] == name]


def choose(rows: list[tuple[str, int, bool]], name: str, year: int) -> list[tuple[str, int, bool]]:
    hits = hits_of(rows, name)
    if len({row[1] for row in hits}) == 1:
        return hits[:1]
    marked = [row for row in hits if row[2]]
    if len(hits) > 1 and len({row[1] for row in marked}) == 1:
        return marked[:1]
    if len(hits) > 1 and len(marked) == 1:
        return marked
    if len(hits) != 1:
        raise SystemExit(f"{year}: {name} が {len(hits)} 件 {[row[1] for row in hits]}")
    return hits


def only(rows: list[tuple[str, int, bool]], name: str, year: int) -> int:
    return choose(rows, name, year)[0][1]


def optional(rows: list[tuple[str, int, bool]], name: str, year: int) -> int:
    hits = hits_of(rows, name)
    if not hits:
        return 0
    return choose(rows, name, year)[0][1]


def build_year(year: int, text: str, *, ocr: bool = False) -> dict:
    buckets = rows_from_text(text, ocr=ocr)
    activity = buckets["activity"]
    bs = buckets["bs"]
    cash = buckets["cash"]
    if year == 2024:
        # 資産の部の本年度末は全文OCRが落とす。金額列の切り出しと、前年度末+増減が
        # 固定資産・資産合計と一致することで確認した。
        fixed_assets = only(bs, "固定資産", year)
        asset_total = only(bs, "資産の部合計", year)
        current_assets = asset_total - fixed_assets
        tangible = 43_325_892_452
        specific = 21_211_209_104
        other_fixed = 2_866_727_279
        securities = 2_808_680_271
        if tangible + specific + other_fixed != fixed_assets:
            raise SystemExit(f"{year}: 固定資産の内訳が合わない")
        if current_assets != 11_814_471_931:
            raise SystemExit(f"{year}: 流動資産 {current_assets}")
        bs.append(("流動資産", current_assets, False))
        bs.append(("特定資産", specific, False))
        bs.append(("有価証券", securities, False))

    edu_income_seen = False
    special_gift = 0
    for name, value, _marked in activity:
        if name == "教育活動収入計":
            edu_income_seen = True
        elif name == "現物寄付" and edu_income_seen:
            special_gift += value

    facility_donation = optional(activity, "施設設備寄付金", year)
    facility_subsidy = optional(activity, "施設設備補助金", year)
    if any(name == "その他の特別収入" for name, _value, _marked in activity):
        special_other = (
            only(activity, "その他の特別収入", year)
            - facility_donation
            - facility_subsidy
            - special_gift
        )
    else:
        special_other = 0
        in_special_income = False
        for name, value, _marked in activity:
            if name == "資産売却差額":
                in_special_income = True
            elif name == "特別収入計":
                in_special_income = False
            elif name == "過年度修正額" and in_special_income:
                special_other += value

    income = {
        "tuition": only(activity, "学生生徒等納付金", year),
        "subsidies": only(activity, "経常費等補助金", year) + facility_subsidy,
        "donations": only(activity, "寄付金", year) + facility_donation + special_gift,
        "auxiliary": only(activity, "付随事業収入", year),
        "interest": only(activity, "受取利息・配当金", year),
        "other": (
            only(activity, "手数料", year)
            + only(activity, "雑収入", year)
            + optional(activity, "その他の教育活動外収入", year)
            + optional(activity, "資産売却差額", year)
            + special_other
        ),
    }
    uncollectible = optional(activity, "徴収不能額等", year)
    if uncollectible == 0:
        uncollectible = optional(activity, "徴収不能額", year)
    expense = {
        "personnel": only(activity, "人件費", year),
        "education": only(activity, "教育研究経費", year),
        "admin": only(activity, "管理経費", year),
        "other": (
            uncollectible
            + optional(activity, "借入金等利息", year)
            + optional(activity, "その他の教育活動外支出", year)
            + optional(activity, "資産処分差額", year)
            + optional(activity, "その他の特別支出", year)
        ),
    }
    securities = [value for name, value, _marked in bs if name == "有価証券"]
    return {
        "year": year,
        "income": income,
        "expense": expense,
        "activityIncome": only(activity, "事業活動収入計", year),
        "activityExpense": only(activity, "事業活動支出計", year),
        "balanceBeforeReserve": only(activity, "基本金組入前当年度収支差額", year),
        "assets": {
            "fixed": only(bs, "固定資産", year),
            "current": only(bs, "流動資産", year),
        },
        "liabilities": {
            "fixed": only(bs, "固定負債", year),
            "current": only(bs, "流動負債", year),
        },
        "netAssets": {
            "basicFund": only(bs, "基本金", year),
            "carried": only(bs, "繰越収支差額", year),
        },
        "operatingAssets": only(bs, "現金預金", year)
        + only(bs, "特定資産", year)
        + sum(securities),
        "cash": {
            "education": only(cash, "教育活動資金収支差額", year),
            "facility": only(cash, "施設整備等活動資金収支差額", year),
            "other": only(cash, "その他の活動資金収支差額", year),
            "opening": only(cash, "前年度繰越支払資金", year),
            "closing": only(cash, "翌年度繰越支払資金", year),
        },
        "cashDeposits": only(bs, "現金預金", year),
    }


def main() -> None:
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/tamabi")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("public/data/tamabi.json")
    years = []
    for year in range(2015, 2026):
        path = raw / f"fy{year}.pdf"
        if not path.exists():
            raise SystemExit(f"missing {path}")
        ocr_path = raw / f"fy{year}.txt"
        text = load_year_text(raw, year)
        if "事業活動収支計算書" not in collapse(text):
            raise SystemExit(f"{year}: テキストを読めない")
        years.append(build_year(year, text, ocr=ocr_path.exists()))
    payload = {
        "id": "tamabi",
        "name": "多摩美術大学",
        "corporation": "学校法人多摩美術大学",
        "unit": "円",
        "source": "学校法人多摩美術大学 計算書類",
        "sourceUrl": "https://www.tamabi.ac.jp/about/public-information/financial/",
        "years": years,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(years)} years)")


if __name__ == "__main__":
    main()
