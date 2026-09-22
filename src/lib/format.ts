const YEN_PER_MAN = 10_000;
const YEN_PER_OKU = 100_000_000;
const YEN_PER_CHO = 1_000_000_000_000;

function groupInt(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 円を百万円に四捨五入し、兆・億・万で表記する。百万円未満は万円。 */
export function formatYen(yen: number): string {
  const sign = yen < 0 ? "△" : "";
  const abs = Math.abs(yen);
  const million = Math.round(abs / 1_000_000);
  if (million === 0) {
    if (abs === 0) return "0円";
    return `${sign}${groupInt(Math.round(abs / YEN_PER_MAN))}万円`;
  }
  const rounded = million * 1_000_000;
  const cho = Math.floor(rounded / YEN_PER_CHO);
  const oku = Math.floor((rounded % YEN_PER_CHO) / YEN_PER_OKU);
  const man = Math.floor((rounded % YEN_PER_OKU) / YEN_PER_MAN);
  let out = "";
  if (cho > 0) out += `${groupInt(cho)}兆`;
  if (oku > 0) out += `${groupInt(oku)}億`;
  if (man > 0) out += `${groupInt(man)}万`;
  return `${sign}${out}円`;
}

export function formatShare(value: number, total: number): string {
  if (total <= 0) return "—";
  return `${((Math.abs(value) / total) * 100).toFixed(1)}%`;
}
