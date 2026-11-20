// Without WebGL, or with reduced motion: a still drawing of the row, the nearest pair large.
function Pair({ x, y, s, label, fade }: { x: number; y: number; s: number; label: string; fade?: number }) {
  const fork = (cx: number, L: number) => {
    const w = 15, g = 22, ro = g / 2 + w, ri = g / 2, yc = -70 - ro;
    const d = `M${cx - ro} ${yc - L} L${cx - ro} ${yc} A${ro} ${ro} 0 0 0 ${cx + ro} ${yc} L${cx + ro} ${yc - L} L${cx + ri} ${yc - L} L${cx + ri} ${yc} A${ri} ${ri} 0 0 1 ${cx - ri} ${yc} L${cx - ri} ${yc - L} Z`;
    return (
      <g key={cx}>
        <rect x={cx - 6} y={-72} width={12} height={72} fill="#9ea6ac" />
        <rect x={cx - 3} y={-72} width={3} height={72} fill="#eef1f3" />
        <path d={d} fill="#a9b1b7" />
        <rect x={cx - ro + 3} y={yc - L + 4} width={4} height={L} fill="#f4f6f7" />
        <rect x={cx + ri + 3} y={yc - L + 4} width={4} height={L} fill="#f4f6f7" />
        <rect x={cx - ro + 10} y={yc - L + 4} width={3} height={L} fill="#6f777d" />
        <rect x={cx + ri + 10} y={yc - L + 4} width={3} height={L} fill="#6f777d" />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={fade ?? 1}>
      <ellipse cx={0} cy={44} rx={150} ry={10} fill="#1d2326" opacity={0.12} />
      {fork(-62, 300)}
      {fork(62, 200)}
      <rect x={-130} y={0} width={260} height={44} rx={7} fill="#141618" />
      <text x={0} y={33} textAnchor="middle" fill="#a9b1b6" fontFamily="'EB Garamond Variable', Georgia, serif" fontSize={30}>{label}</text>
    </g>
  );
}

export default function Still() {
  return (
    <svg className="fk-still" viewBox="0 0 700 640" role="img" aria-label="Pairs of polished tuning forks standing on black bases along a pale grey sweep">
      <Pair x={622} y={360} s={0.36} label="e" fade={0.5} />
      <Pair x={468} y={430} s={0.58} label="i" fade={0.75} />
      <Pair x={210} y={560} s={1} label="a" />
    </svg>
  );
}
