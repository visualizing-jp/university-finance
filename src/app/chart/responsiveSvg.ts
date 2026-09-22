/** https://visualizing.jp/responsive-d3/ — viewBox で描き、親の幅に合わせる */

export const SVG_MEET = "xMidYMid meet";

export function responsiveSvgProps(frameW: number, frameH: number, containerW: number) {
  const aspect = frameW / frameH;
  const height = containerW > 0 ? Math.round(containerW / aspect) : undefined;
  return {
    viewBox: `0 0 ${frameW} ${frameH}`,
    preserveAspectRatio: SVG_MEET,
    width: "100%" as const,
    ...(height != null ? { height } : {}),
  };
}
