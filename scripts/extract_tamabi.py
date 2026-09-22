"""学校法人多摩美術大学の計算書類PDFから、画面用の年度JSONを作る。

対象はこの法人の公開PDFだけ。科目は空白を除いた行頭が勘定科目名と一致する行を使う。
決算列（事業活動収支）・本年度末（貸借対照表）・金額（活動区分資金収支）を取る。
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import unicodedata
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
    "特別寄付金",
    "一般寄付金",
    "国庫補助金",
    "地方公共団体補助金",
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
    "経常収支差額",
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
    "長期借入金",
    "短期借入金",
    "1年以内返済予定長期借入金",
    "一年以内返済予定長期借入金",
    "返済期限が1年以内の長期借入金",
    "学校債",
    "1年以内償還予定学校債",
    "一年以内償還予定学校債",
    "未払金",
    "支払手形",
    "手形債務",
}
LOAN_NAMES = (
    "長期借入金",
    "短期借入金",
    "1年以内返済予定長期借入金",
    "一年以内返済予定長期借入金",
    "返済期限が1年以内の長期借入金",
)
BOND_NAMES = ("学校債", "1年以内償還予定学校債", "一年以内償還予定学校債")
NOTE_NAMES = ("支払手形", "手形債務")
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


def clean_label(label: str) -> str:
    label = collapse(label)
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
    if best is None and "+" not in label and "小計" not in label:
        for name in sorted(names, key=len, reverse=True):
            if not label.endswith(name):
                continue
            prefix = label[: len(label) - len(name)]
            header = "科目予算決算差異"
            if prefix.startswith(header):
                prefix = prefix[len(header) :]
            # 「外」は教育活動外の縦書きの切れ端。
            noise = prefix == "" or all(
                ch in MARGIN or "ぁ" <= ch <= "ん" or ch == "外" for ch in prefix
            )
            if len(prefix) <= 4 and noise and "特別" not in prefix:
                best = name
            break
    if best is None or not label.endswith(best):
        return best
    prefix = label[: len(label) - len(best)]
    # 「特別」は縦書きの切れ端ではなく、特別寄付金のような子科目の一部。
    if "特別" in prefix:
        return None
    return best


def pdf_text(path: Path) -> str:
    text = subprocess.check_output(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
        text=True,
        errors="replace",
    )
    return unicodedata.normalize("NFKC", text)


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
        # 757.117,058 のように、桁区切りのカンマが点になる。
        line = re.sub(r"(?<=\d)\.(?=\d{3}(?:,\d{3})+)", ",", line)
        line = re.sub(r"(?<![A-Za-z0-9])A\s+(?=\d)", "△", line)
        lines.append(line)
    return unicodedata.normalize("NFKC", "\n".join(lines))


def load_year_text(raw: Path, year: int) -> str:
    ocr = raw / f"fy{year}.txt"
    if ocr.exists():
        return normalize_ocr(ocr.read_text(encoding="utf-8"))
    return pdf_text(raw / f"fy{year}.pdf")


JP = re.compile(r"[一-龥ぁ-んァ-ヶ]")
Hit = tuple[str, int, bool, int]


def line_segments(line: str) -> list[tuple[str, list[int]]]:
    """左右に並んだ計算書を、科目と金額の組に分ける。"""
    spans: list[tuple[int, int, int]] = []
    for match in AMOUNT.finditer(line):
        raw = match.group(0)
        negative = any(mark in raw for mark in "△▲−－-")
        digits = re.sub(r"[^\d]", "", raw)
        if digits == "":
            continue
        value = int(digits)
        spans.append((match.start(), match.end(), -value if negative else value))
    if not spans:
        return []
    groups: list[list[tuple[int, int, int]]] = []
    current: list[tuple[int, int, int]] = []
    for span in spans:
        if current and JP.search(line[current[-1][1] : span[0]]):
            groups.append(current)
            current = []
        current.append(span)
    if current:
        groups.append(current)
    segments: list[tuple[str, list[int]]] = []
    label_from = 0
    for group in groups:
        segments.append((line[label_from : group[0][0]], [value for _, _, value in group]))
        label_from = group[-1][1]
    return segments


def section_for(title: str) -> str | None:
    if title == "資金収支計算書":
        return ""
    if title in {"活動区分資金収支計算書", "活動区分資金収支計算書(注記)"}:
        return "cash"
    if title == "事業活動収支計算書":
        return "activity"
    if title == "貸借対照表":
        return "bs"
    return None


def rows_from_text(text: str, *, ocr: bool = False) -> dict[str, list[Hit]]:
    section: str | None = None
    pending = ""
    buckets: dict[str, list[Hit]] = {"activity": [], "bs": [], "cash": []}
    names = {"activity": ACTIVITY_NAMES, "bs": BS_NAMES, "cash": CASH_NAMES}
    columns = {"activity": 1, "bs": 0, "cash": 0}
    for line in text.splitlines():
        found_section = section_for(collapse(line))
        if found_section is not None:
            section = found_section or None
            pending = ""
            continue
        title = collapse(line)
        if section == "bs" and (title.startswith("注記") or title.startswith("(注)") or "重要な会計方針" in title):
            section = None
            pending = ""
            continue
        if section is None:
            continue
        segments = line_segments(line)
        if not segments:
            pending = ""
            for part in re.split(r" {4,}", line):
                if match_name(clean_label(part), names[section]):
                    pending = part
                    break
            continue
        if pending and match_name(clean_label(segments[0][0]), names[section]) is None:
            segments[0] = (pending + segments[0][0], segments[0][1])
        pending = ""
        for label_text, values in segments:
            name = match_name(clean_label(label_text), names[section])
            if name is None:
                continue
            if section == "bs" and ocr and len(values) == 2:
                chosen = values[0] + values[1]
            elif section == "activity" and ocr and len(values) == 2:
                chosen = values[0] if abs(values[0]) >= abs(values[1]) else values[1]
            else:
                index = columns[section]
                if index >= len(values):
                    continue
                chosen = values[index]
            parenthesized = "(" in label_text or "（" in label_text
            buckets[section].append((name, chosen, parenthesized, len(values)))
    return buckets


def hits_of(rows: list[Hit], name: str) -> list[Hit]:
    return [row for row in rows if row[0] == name]


def choose(rows: list[Hit], name: str, year: int) -> list[Hit]:
    hits = hits_of(rows, name)
    if not hits:
        raise SystemExit(f"{year}: {name} が 0 件")
    widest = max(row[3] for row in hits)
    hits = [row for row in hits if row[3] == widest]
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


def only(rows: list[Hit], name: str, year: int) -> int:
    return choose(rows, name, year)[0][1]


def regular_subsidy(rows: list[Hit], year: int) -> int:
    if hits_of(rows, "経常費等補助金"):
        return only(rows, "経常費等補助金", year)
    total = optional(rows, "国庫補助金", year) + optional(rows, "地方公共団体補助金", year)
    if total == 0:
        raise SystemExit(f"{year}: 経常費等補助金 が 0 件")
    return total


def sum_optional(rows: list[Hit], names: tuple[str, ...], year: int) -> int:
    return sum(optional(rows, name, year) for name in names)


def external_liabilities(rows: list[Hit], year: int) -> dict[str, int]:
    """借入金・学校債・未払金・手形債務。長期未払金はリースなので含めない。"""
    parts = {
        "loans": sum_optional(rows, LOAN_NAMES, year),
        "bonds": sum_optional(rows, BOND_NAMES, year),
        "unpaid": optional(rows, "未払金", year),
        "notes": sum_optional(rows, NOTE_NAMES, year),
    }
    total = sum(parts.values())
    liabilities = only(rows, "固定負債", year) + only(rows, "流動負債", year)
    if total > liabilities:
        raise SystemExit(f"{year}: 外部負債 {total} が総負債 {liabilities} を超える")
    return {"total": total, **parts}


def optional(rows: list[Hit], name: str, year: int) -> int:
    hits = hits_of(rows, name)
    if not hits:
        return 0
    return choose(rows, name, year)[0][1]


def build_year(year: int, text: str, *, ocr: bool = False, school: str = "tamabi") -> dict:
    buckets = rows_from_text(text, ocr=ocr)
    activity = buckets["activity"]
    bs = buckets["bs"]
    cash = buckets["cash"]
    if year == 2024 and school == "tamabi":
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
        bs.append(("流動資産", current_assets, False, 1))
        bs.append(("特定資産", specific, False, 1))
        bs.append(("有価証券", securities, False, 1))

    kifu = only(activity, "寄付金", year)
    named_parts = optional(activity, "特別寄付金", year) + optional(activity, "一般寄付金", year)
    special_gift = 0
    # 武蔵野は左右2段組で、特別収入の現物寄付が教育活動収入計より先に読める。
    if school == "musabi" and named_parts:
        edu_gift = kifu - named_parts
        used_edu_gift = edu_gift == 0
        for name, value, _marked, _width in activity:
            if name != "現物寄付":
                continue
            if not used_edu_gift and value == edu_gift:
                used_edu_gift = True
                continue
            special_gift += value
        if not used_edu_gift:
            raise SystemExit(f"{year}: 教育活動の現物寄付 {edu_gift} が見つからない")
    else:
        edu_income_seen = False
        for name, value, _marked, _width in activity:
            if name == "教育活動収入計":
                edu_income_seen = True
            elif name == "現物寄付" and edu_income_seen:
                special_gift += value

    facility_donation = optional(activity, "施設設備寄付金", year)
    facility_subsidy = optional(activity, "施設設備補助金", year)
    if any(name == "その他の特別収入" for name, _value, _marked, _width in activity):
        special_other = (
            only(activity, "その他の特別収入", year)
            - facility_donation
            - facility_subsidy
            - special_gift
        )
    else:
        special_other = 0
        in_special_income = False
        for name, value, _marked, _width in activity:
            if name == "資産売却差額":
                in_special_income = True
            elif name == "特別収入計":
                in_special_income = False
            elif name == "過年度修正額" and in_special_income:
                special_other += value

    income = {
        "tuition": only(activity, "学生生徒等納付金", year),
        "subsidies": regular_subsidy(activity, year) + facility_subsidy,
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
    securities = [value for name, value, _marked, _width in bs if name == "有価証券"]
    education_income = only(activity, "教育活動収入計", year)
    non_education_income = only(activity, "教育活動外収入計", year)
    education_expense = only(activity, "教育活動支出計", year)
    # 支出がゼロの年は、合計行に金額が載らない。経常収支差額との一致でゼロだと確認する。
    non_education_expense = optional(activity, "教育活動外支出計", year)
    ordinary_income = education_income + non_education_income
    ordinary_expense = education_expense + non_education_expense
    ordinary_balance = only(activity, "経常収支差額", year)
    if ordinary_balance != ordinary_income - ordinary_expense:
        raise SystemExit(
            f"{year}: 経常収支差額 {ordinary_balance} ≠ {ordinary_income - ordinary_expense}"
        )
    debt = external_liabilities(bs, year)
    return {
        "year": year,
        "income": income,
        "expense": expense,
        "activityIncome": only(activity, "事業活動収入計", year),
        "activityExpense": only(activity, "事業活動支出計", year),
        "balanceBeforeReserve": only(activity, "基本金組入前当年度収支差額", year),
        "educationIncome": education_income,
        "nonEducationIncome": non_education_income,
        "educationExpense": education_expense,
        "nonEducationExpense": non_education_expense,
        "ordinaryIncome": ordinary_income,
        "ordinaryExpense": ordinary_expense,
        "ordinaryBalance": ordinary_balance,
        "ordinarySubsidy": regular_subsidy(activity, year),
        "ordinaryDonation": kifu,
        "externalLiabilities": debt["total"],
        "externalLiabilityParts": {
            "loans": debt["loans"],
            "bonds": debt["bonds"],
            "unpaid": debt["unpaid"],
            "notes": debt["notes"],
        },
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


SCHOOLS = {
    "tamabi": {
        "name": "多摩美術大学",
        "corporation": "学校法人多摩美術大学",
        "source": "学校法人多摩美術大学 計算書類",
        "sourceUrl": "https://www.tamabi.ac.jp/about/public-information/financial/",
    },
    "musabi": {
        "name": "武蔵野美術大学",
        "corporation": "学校法人武蔵野美術大学",
        "source": "学校法人武蔵野美術大学 計算書類",
        "sourceUrl": "https://www.musabi.ac.jp/outline/disclose/financial/",
    },
}


def main() -> None:
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/tamabi")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("public/data/tamabi.json")
    school_id = sys.argv[3] if len(sys.argv) > 3 else out.stem
    school = SCHOOLS.get(school_id)
    if school is None:
        raise SystemExit(f"unknown school {school_id}")
    years = []
    for year in range(2015, 2026):
        path = raw / f"fy{year}.pdf"
        if not path.exists():
            raise SystemExit(f"missing {path}")
        ocr_path = raw / f"fy{year}.txt"
        text = load_year_text(raw, year)
        if "事業活動収支計算書" not in collapse(text):
            raise SystemExit(f"{year}: テキストを読めない")
        years.append(build_year(year, text, ocr=ocr_path.exists(), school=school_id))
    payload = {
        "id": school_id,
        "name": school["name"],
        "corporation": school["corporation"],
        "unit": "円",
        "source": school["source"],
        "sourceUrl": school["sourceUrl"],
        "years": years,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(years)} years)")


if __name__ == "__main__":
    main()
