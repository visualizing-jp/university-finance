/** 西暦の決算年度を和暦表記にする。 */
export function formatEraYear(year: number): string {
  if (year >= 2019) {
    const n = year - 2018;
    return n === 1 ? "令和元年度" : `令和${n}年度`;
  }
  if (year >= 1989) {
    const n = year - 1988;
    return n === 1 ? "平成元年度" : `平成${n}年度`;
  }
  return `${year}年度`;
}
