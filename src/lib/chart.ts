/**
 * Geometry for the progress chart. Plain functions, no drawing, so they can be
 * reasoned about (and tested) on their own.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Places dates along the x axis by their real time, so scans a week apart
 * sit further apart than scans a day apart. `times` must be sorted. A single
 * moment (one scan, or several at the same instant) sits in the middle.
 */
export function timeToX(times: number[], left: number, right: number): number[] {
  const first = times[0];
  const last = times[times.length - 1];
  if (times.length === 0 || last === first) return times.map(() => (left + right) / 2);
  return times.map((time) => left + ((time - first) / (last - first)) * (right - left));
}

/** Maps a 0-100 score onto the plot's vertical range, 100 at the top. */
export function scoreToY(score: number, top: number, bottom: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return bottom - (clamped / 100) * (bottom - top);
}

/** The index of the point closest to `x` horizontally. On a tie, the later one. */
export function nearestIndex(xs: number[], x: number): number {
  let best = 0;
  for (let index = 1; index < xs.length; index += 1) {
    if (Math.abs(xs[index] - x) <= Math.abs(xs[best] - x)) best = index;
  }
  return best;
}

/**
 * Tangents for a monotone cubic curve (Fritsch-Carlson). The curve through
 * them never overshoots the data: between two scans it never rises above
 * the higher one or dips below the lower one, so the smoothing can't invent
 * a peak or a trough that isn't in the scores.
 */
function monotoneTangents(points: ChartPoint[]): number[] {
  const count = points.length;
  const secants: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const dx = points[index + 1].x - points[index].x;
    secants.push(dx === 0 ? 0 : (points[index + 1].y - points[index].y) / dx);
  }

  const tangents = points.map((_, index) => {
    if (index === 0) return secants[0] ?? 0;
    if (index === count - 1) return secants[count - 2];
    const before = secants[index - 1];
    const after = secants[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });

  for (let index = 0; index < count - 1; index += 1) {
    const secant = secants[index];
    if (secant === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const a = tangents[index] / secant;
    const b = tangents[index + 1] / secant;
    const magnitude = a * a + b * b;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[index] = scale * a * secant;
      tangents[index + 1] = scale * b * secant;
    }
  }
  return tangents;
}

interface Segment {
  from: ChartPoint;
  control1: ChartPoint;
  control2: ChartPoint;
  to: ChartPoint;
}

/** Each stretch between two points as a cubic Bezier: the exact form of the monotone curve. */
function monotoneSegments(points: ChartPoint[]): Segment[] {
  const tangents = monotoneTangents(points);
  const segments: Segment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const third = (to.x - from.x) / 3;
    segments.push({
      from,
      control1: { x: from.x + third, y: from.y + tangents[index] * third },
      control2: { x: to.x - third, y: to.y - tangents[index + 1] * third },
      to,
    });
  }
  return segments;
}

function shifted(point: ChartPoint, dy: number): string {
  return `${point.x} ${point.y + dy}`;
}

/** An SVG path for the smoothed line through `points`, which must be sorted by x. */
export function monotonePath(points: ChartPoint[], dy = 0): string {
  if (points.length === 0) return '';
  const commands = [`M ${shifted(points[0], dy)}`];
  for (const segment of monotoneSegments(points)) {
    commands.push(
      `C ${shifted(segment.control1, dy)} ${shifted(segment.control2, dy)} ${shifted(segment.to, dy)}`,
    );
  }
  return commands.join(' ');
}

/**
 * A closed SVG path for a band `offset` pixels above and below the smoothed
 * line: the same curve shifted up, then back along it shifted down.
 */
export function monotoneBandPath(points: ChartPoint[], offset: number): string {
  if (points.length < 2) return '';
  const segments = monotoneSegments(points);
  const commands = [`M ${shifted(points[0], -offset)}`];
  for (const segment of segments) {
    commands.push(
      `C ${shifted(segment.control1, -offset)} ${shifted(segment.control2, -offset)} ${shifted(segment.to, -offset)}`,
    );
  }
  commands.push(`L ${shifted(points[points.length - 1], offset)}`);
  for (const segment of [...segments].reverse()) {
    commands.push(
      `C ${shifted(segment.control2, offset)} ${shifted(segment.control1, offset)} ${shifted(segment.from, offset)}`,
    );
  }
  commands.push('Z');
  return commands.join(' ');
}
