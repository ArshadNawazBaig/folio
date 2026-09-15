// Website printouts clip ordinary text to cards, table cells and overflow boxes.
// A surrounding clip is not a reason to reject fully visible text. Only lift text
// out of clips when its ink bounds are contained by every supported convex path.
// This keeps hidden overflow and partially masked lettering out of the editor.
export function visibleClippedText(api, heap, clip, bounds, alloc, free) {
  const count = clip ? api.FPDFClipPath_CountPaths(clip) : 0;
  if (count <= 0) return true;
  if (!bounds || count > 32) return false;
  const ptr = alloc(8);
  try {
    for (let path = 0; path < count; path++) {
      const length = api.FPDFClipPath_CountPathSegments(clip, path);
      if (length < 3 || length > 256) return false;
      const segments = [];
      for (let i = 0; i < length; i++) {
        const segment = api.FPDFClipPath_GetPathSegment(clip, path, i);
        if (!api.FPDFPathSegment_GetPoint(segment, ptr, ptr + 4)) return false;
        const point = [heap.getValue(ptr, 'float'), heap.getValue(ptr + 4, 'float')];
        if (!point.every(Number.isFinite)) return false;
        segments.push({ point, type: api.FPDFPathSegment_GetType(segment) });
      }
      if (segments[0].type !== 2) return false;
      const polygon = [segments[0].point];
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        if (segment.type === 0) polygon.push(segment.point);
        else if (segment.type === 1 && segments[i + 1]?.type === 1 && segments[i + 2]?.type === 1) {
          const start = polygon.at(-1),
            a = segment.point,
            b = segments[i + 1].point,
            end = segments[i + 2].point;
          for (let n = 1; n <= 16; n++) {
            const t = n / 16,
              u = 1 - t;
            polygon.push(
              [0, 1].map(
                (c) =>
                  u ** 3 * start[c] +
                  3 * u ** 2 * t * a[c] +
                  3 * u * t ** 2 * b[c] +
                  t ** 3 * end[c],
              ),
            );
          }
          i += 2;
        } else return false;
      }
      const points = polygon.filter(
        (point, i) =>
          !i || Math.hypot(point[0] - polygon[i - 1][0], point[1] - polygon[i - 1][1]) > 0.0001,
      );
      if (Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) < 0.0001)
        points.pop();
      if (points.length < 3) return false;
      const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      let direction = 0;
      for (let i = 0; i < points.length; i++) {
        const turn = cross(
          points[i],
          points[(i + 1) % points.length],
          points[(i + 2) % points.length],
        );
        if (Math.abs(turn) < 0.0001) continue;
        if (direction && Math.sign(turn) !== direction) return false;
        direction = Math.sign(turn);
      }
      if (!direction) return false;
      for (const point of [
        [bounds[0], bounds[1]],
        [bounds[0], bounds[3]],
        [bounds[2], bounds[1]],
        [bounds[2], bounds[3]],
      ])
        for (let i = 0; i < points.length; i++) {
          const a = points[i],
            b = points[(i + 1) % points.length];
          // PDF font ink bounds can overhang a CSS clip by a fraction of a point.
          if (direction * cross(a, b, point) < -0.5 * Math.hypot(b[0] - a[0], b[1] - a[1]))
            return false;
        }
    }
    return true;
  } finally {
    free(ptr);
  }
}
