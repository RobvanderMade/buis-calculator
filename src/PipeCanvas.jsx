import { useMemo } from 'react'
import { cumulativePoints, segmentLength } from './pipeMath'

function arrowPoints(x, y, size, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [
    { x, y },
    { x: x - size * cos - size * sin, y: y + size * sin - size * cos },
    { x: x - size * cos + size * sin, y: y + size * sin + size * cos },
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

/** Buigboog in 2D (geschaald); null bij rechte lijn of te korte segmenten */
function cornerFillet2D(A, P, B, radiusPx) {
  if (radiusPx <= 0) return null
  const dx1 = P.x - A.x
  const dy1 = P.y - A.y
  const dx2 = B.x - P.x
  const dy2 = B.y - P.y
  const len1 = Math.hypot(dx1, dy1)
  const len2 = Math.hypot(dx2, dy2)
  if (len1 < 1e-9 || len2 < 1e-9) return null
  const e1 = { x: dx1 / len1, y: dy1 / len1 }
  const e2 = { x: dx2 / len2, y: dy2 / len2 }
  const dot = Math.min(1, Math.max(-1, -e1.x * e2.x - e1.y * e2.y))
  const phi = Math.acos(dot)
  if (phi < 1e-3 || Math.abs(phi - Math.PI) < 1e-3) return null
  let t = radiusPx / Math.tan(phi / 2)
  const tMax = Math.min(len1, len2) * 0.499
  let rEff = radiusPx
  if (t > tMax) {
    t = tMax
    rEff = t * Math.tan(phi / 2)
  }
  if (rEff < 0.5) return null
  const Q1 = { x: P.x - t * e1.x, y: P.y - t * e1.y }
  const Q2 = { x: P.x + t * e2.x, y: P.y + t * e2.y }
  const sx = -e1.x + e2.x
  const sy = -e1.y + e2.y
  const slen = Math.hypot(sx, sy)
  if (slen < 1e-9) return null
  const bis = { x: sx / slen, y: sy / slen }
  const dist = rEff / Math.sin(phi / 2)
  const O = { x: P.x + dist * bis.x, y: P.y + dist * bis.y }
  return { Q1, Q2, O, r: rEff, P }
}

/** SVG-boog Q1→Q2 op cirkel rond O (buigradius in aanzicht) */
function arcA(O, r, Q1, Q2, cornerP) {
  const ang1 = Math.atan2(Q1.y - O.y, Q1.x - O.x)
  const ang2 = Math.atan2(Q2.y - O.y, Q2.x - O.x)
  let d = ang2 - ang1
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const midShort = {
    x: O.x + r * Math.cos(ang1 + d / 2),
    y: O.y + r * Math.sin(ang1 + d / 2),
  }
  const dLong = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI
  const midLong = {
    x: O.x + r * Math.cos(ang1 + dLong / 2),
    y: O.y + r * Math.sin(ang1 + dLong / 2),
  }
  const useShort =
    Math.hypot(midShort.x - cornerP.x, midShort.y - cornerP.y) <=
    Math.hypot(midLong.x - cornerP.x, midLong.y - cornerP.y)
  const eff = useShort ? d : dLong
  const largeArc = Math.abs(eff) > Math.PI ? 1 : 0
  const sweep = eff > 0 ? 1 : 0
  return `A ${r} ${r} 0 ${largeArc} ${sweep} ${Q2.x} ${Q2.y}`
}

/** Punten op boog voor bbox */
function arcSamplePoints(O, r, Q1, Q2, cornerP) {
  const a1 = Math.atan2(Q1.y - O.y, Q1.x - O.x)
  const a2 = Math.atan2(Q2.y - O.y, Q2.x - O.x)
  let d = a2 - a1
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const midShort = {
    x: O.x + r * Math.cos(a1 + d / 2),
    y: O.y + r * Math.sin(a1 + d / 2),
  }
  const dLong = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI
  const midLong = {
    x: O.x + r * Math.cos(a1 + dLong / 2),
    y: O.y + r * Math.sin(a1 + dLong / 2),
  }
  const useShort =
    Math.hypot(midShort.x - cornerP.x, midShort.y - cornerP.y) <=
    Math.hypot(midLong.x - cornerP.x, midLong.y - cornerP.y)
  const eff = useShort ? d : dLong
  const pts = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    const ang = a1 + t * eff
    pts.push({ x: O.x + r * Math.cos(ang), y: O.y + r * Math.sin(ang) })
  }
  return pts
}

/** Totale buitenmaat van het aanzicht (projectie + halve buis rond middenas) */
function OverallViewDimensions({ bbox, scale, view, H, W }) {
  if (view === 'ISO') return null

  const { minSx, maxSx, minSy, maxSy } = bbox
  const widthMm = (maxSx - minSx) / scale
  const heightMm = (maxSy - minSy) / scale
  if (widthMm < 0.5 && heightMm < 0.5) return null

  const horizAxis = view === 'XY' ? 'X' : view === 'XZ' ? 'X' : 'Z'
  const vertAxis = view === 'XY' ? 'Y' : view === 'XZ' ? 'Z' : 'Y'
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1))

  let yDim = maxSy + 34
  if (yDim > H - 40) {
    yDim = minSy - 34
    if (yDim < 26) yDim = Math.min(H - 36, maxSy + 28)
  }
  const dimBelow = yDim > maxSy
  const yRef = dimBelow ? maxSy : minSy
  const yTick = dimBelow ? 1 : -1

  /** Ruimte voor verticale maat + gedraaide tekst binnen het SVG (grid) */
  const xEdgeSafe = 64
  let xDim = minSx - 32
  let xRef = minSx
  if (xDim < xEdgeSafe) {
    xDim = maxSx + 32
    xRef = maxSx
  }
  if (xDim > W - xEdgeSafe) {
    xDim = minSx - 32
    xRef = minSx
    if (xDim < xEdgeSafe) xDim = xEdgeSafe
  }
  xDim = Math.max(xEdgeSafe, Math.min(W - xEdgeSafe, xDim))

  const tick = 6
  const wLab = `Breedte (${horizAxis}): ${fmt(widthMm)} mm`
  const hLab = `Hoogte (${vertAxis}): ${fmt(heightMm)} mm`
  const midY = (minSy + maxSy) / 2

  return (
    <g className="pipe-dimension-overall" aria-hidden>
      <line
        x1={minSx}
        y1={yRef}
        x2={minSx}
        y2={yDim - yTick * tick}
        stroke="#555"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line
        x1={maxSx}
        y1={yRef}
        x2={maxSx}
        y2={yDim - yTick * tick}
        stroke="#555"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line x1={minSx} y1={yDim} x2={maxSx} y2={yDim} stroke="#111" strokeWidth={1.5} />
      <line x1={minSx} y1={yDim - tick} x2={minSx} y2={yDim + tick} stroke="#111" strokeWidth={1.5} />
      <line x1={maxSx} y1={yDim - tick} x2={maxSx} y2={yDim + tick} stroke="#111" strokeWidth={1.5} />
      <text
        x={(minSx + maxSx) / 2}
        y={yDim + (dimBelow ? 18 : -12)}
        fill="#111"
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        paintOrder="stroke"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={4}
      >
        {wLab}
      </text>

      <line x1={xRef} y1={minSy} x2={xDim} y2={minSy} stroke="#555" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={xRef} y1={maxSy} x2={xDim} y2={maxSy} stroke="#555" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={xDim} y1={minSy} x2={xDim} y2={maxSy} stroke="#111" strokeWidth={1.5} />
      <line x1={xDim - tick} y1={minSy} x2={xDim + tick} y2={minSy} stroke="#111" strokeWidth={1.5} />
      <line x1={xDim - tick} y1={maxSy} x2={xDim + tick} y2={maxSy} stroke="#111" strokeWidth={1.5} />
      <text
        x={xDim}
        y={midY}
        fill="#111"
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        paintOrder="stroke"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={4}
        transform={`rotate(-90 ${xDim} ${midY})`}
      >
        {hLab}
      </text>
    </g>
  )
}

/** Maatlijn: snijlijn / as midden (3D-lengte tabelregel), evenwijdig aan getekend recht stuk */
function SnijlijnDimension({
  x1,
  y1,
  x2,
  y2,
  lengthMm,
  pathCx,
  pathCy,
  seg,
}) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenPx = Math.hypot(dx, dy)
  if (lenPx < 12) return null
  const ux = dx / lenPx
  const uy = dy / lenPx
  let nx = -uy
  let ny = ux
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  if ((mx - pathCx) * nx + (my - pathCy) * ny < 0) {
    nx = -nx
    ny = -ny
  }
  const baseOff = 26 + (seg % 4) * 7
  const ox = nx * baseOff
  const oy = ny * baseOff
  const ax1 = x1 + ox
  const ay1 = y1 + oy
  const ax2 = x2 + ox
  const ay2 = y2 + oy
  const tick = 5
  const tnx = nx * tick
  const tny = ny * tick
  const lenLabel =
    Math.abs(lengthMm - Math.round(lengthMm)) < 0.05
      ? String(Math.round(lengthMm))
      : lengthMm.toFixed(1)
  const label = `${lenLabel} mm`
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angleDeg > 90) angleDeg -= 180
  if (angleDeg < -90) angleDeg += 180
  const tcx = (ax1 + ax2) / 2
  const tcy = (ay1 + ay2) / 2

  return (
    <g className="pipe-dimension" aria-hidden>
      <line
        x1={x1}
        y1={y1}
        x2={ax1}
        y2={ay1}
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={x2}
        y1={y2}
        x2={ax2}
        y2={ay2}
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={ax1 - tnx}
        y1={ay1 - tny}
        x2={ax1 + tnx}
        y2={ay1 + tny}
        stroke="#222"
        strokeWidth={1.2}
      />
      <line
        x1={ax2 - tnx}
        y1={ay2 - tny}
        x2={ax2 + tnx}
        y2={ay2 + tny}
        stroke="#222"
        strokeWidth={1.2}
      />
      <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} stroke="#222" strokeWidth={1.2} />
      <text
        x={tcx}
        y={tcy}
        fill="#111"
        fontSize={12}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="middle"
        paintOrder="stroke"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={4}
        transform={`rotate(${angleDeg} ${tcx} ${tcy})`}
      >
        {label}
      </text>
    </g>
  )
}

/** Assen-label in hoek (zelfde layout als origineel) */
function Axes({ view }) {
  const ap = 20
  const al = 50
  const arr = 5
  const ax = '#4a4a4a'
  const tx = '#222'
  if (view === 'ISO') {
    return (
      <g aria-hidden>
        <line x1={ap} y1={ap + 35} x2={ap + 44} y2={ap + 10} stroke={ax} strokeWidth={2} />
        <polygon points={arrowPoints(ap + 44, ap + 10, arr, 30)} fill={ax} />
        <text x={ap + 52} y={ap + 8} fill={tx} fontSize={16}>
          X
        </text>
        <line x1={ap} y1={ap + 35} x2={ap - 2} y2={ap + 86} stroke={ax} strokeWidth={2} strokeDasharray="6 4" />
        <polygon points={arrowPoints(ap - 2, ap + 86, arr, -92)} fill={ax} />
        <text x={ap - 2} y={ap + 104} fill={tx} fontSize={16}>
          Y
        </text>
        <line x1={ap} y1={ap + 35} x2={ap + 44} y2={ap + 60} stroke={ax} strokeWidth={2} />
        <polygon points={arrowPoints(ap + 44, ap + 60, arr, -30)} fill={ax} />
        <text x={ap + 52} y={ap + 68} fill={tx} fontSize={16}>
          Z
        </text>
      </g>
    )
  }
  if (view === 'XY') {
    return (
      <g aria-hidden>
        <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke={ax} strokeWidth={2} />
        <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill={ax} />
        <text x={ap + al + 10} y={ap + 4} fill={tx} fontSize={16}>
          X
        </text>
        <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke={ax} strokeWidth={2} strokeDasharray="6 4" />
        <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill={ax} />
        <text x={ap} y={ap + al + 15} fill={tx} fontSize={16}>
          Y
        </text>
      </g>
    )
  }
  if (view === 'XZ') {
    return (
      <g aria-hidden>
        <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke={ax} strokeWidth={2} />
        <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill={ax} />
        <text x={ap + al + 10} y={ap + 4} fill={tx} fontSize={16}>
          X
        </text>
        <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke={ax} strokeWidth={2} strokeDasharray="6 4" />
        <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill={ax} />
        <text x={ap} y={ap + al + 15} fill={tx} fontSize={16}>
          Z
        </text>
      </g>
    )
  }
  return (
    <g aria-hidden>
      <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke={ax} strokeWidth={2} />
      <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill={ax} />
      <text x={ap + al + 10} y={ap + 4} fill={tx} fontSize={16}>
        Z
      </text>
      <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke={ax} strokeWidth={2} strokeDasharray="6 4" />
      <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill={ax} />
      <text x={ap} y={ap + al + 15} fill={tx} fontSize={16}>
        Y
      </text>
    </g>
  )
}

export default function PipeCanvas({ lines, view, radiusMm = 0, diameterMm = 0 }) {
  const W = 800
  const H = 600
  const padding = 30

  const pipeLayer = useMemo(() => {
    const pts3 = cumulativePoints(lines)

    const projectRaw = (p) => {
      if (view === 'XY') return { x: p.x, y: p.y }
      if (view === 'XZ') return { x: p.x, y: p.z }
      if (view === 'YZ') return { x: p.z, y: p.y }

      const cos30 = Math.sqrt(3) / 2
      const sin30 = 0.5
      return {
        x: (p.x - p.z) * cos30,
        y: p.y + (p.x + p.z) * sin30,
      }
    }

    const rawProjected = pts3.map(projectRaw)
    let minRawX = 0
    let minRawY = 0
    let maxRawX = 0
    let maxRawY = 0
    for (const p of rawProjected) {
      minRawX = Math.min(minRawX, p.x)
      minRawY = Math.min(minRawY, p.y)
      maxRawX = Math.max(maxRawX, p.x)
      maxRawY = Math.max(maxRawY, p.y)
    }

    const spanRawX = maxRawX - minRawX || 1
    const spanRawY = maxRawY - minRawY || 1
    let scale = Math.min((W - 2 * padding) / spanRawX, (H - 2 * padding) / spanRawY)
    /** Extra marge zodat dikke buis (stroke) niet afsnijdt; kort schaal licht in */
    for (let iter = 0; iter < 3; iter++) {
      const sw = diameterMm > 0 ? Math.max(1, diameterMm * scale) : 4
      const padExtra = sw / 2 + 8
      scale = Math.min(
        (W - 2 * padding - 2 * padExtra) / spanRawX,
        (H - 2 * padding - 2 * padExtra) / spanRawY,
      )
    }
    const strokeW = diameterMm > 0 ? Math.max(1, diameterMm * scale) : 4
    const padExtra = strokeW / 2 + 8
    const offsetX = -minRawX * scale + (W - spanRawX * scale) / 2
    const offsetY = -minRawY * scale + (H - spanRawY * scale) / 2

    const project = (p) => {
      const projected = projectRaw(p)
      return { sx: projected.x * scale + offsetX, sy: projected.y * scale + offsetY }
    }

    const projected = pts3.map(project)
    const n = projected.length
    const radiusPx = radiusMm * scale

    const corners = new Array(n).fill(null)
    for (let vi = 1; vi <= n - 2; vi++) {
      const A = { x: projected[vi - 1].sx, y: projected[vi - 1].sy }
      const P = { x: projected[vi].sx, y: projected[vi].sy }
      const B = { x: projected[vi + 1].sx, y: projected[vi + 1].sy }
      corners[vi] = cornerFillet2D(A, P, B, radiusPx)
    }

    let pathCx = 0
    let pathCy = 0
    for (const p of projected) {
      pathCx += p.sx
      pathCy += p.sy
    }
    pathCx /= n
    pathCy /= n

    let pathD = `M ${projected[0].sx} ${projected[0].sy}`
    const dims = []
    let current = { x: projected[0].sx, y: projected[0].sy }

    for (let seg = 0; seg < n - 1; seg++) {
      const endVertex = seg + 1
      const isInterior = endVertex >= 1 && endVertex <= n - 2
      const c = isInterior ? corners[endVertex] : null
      const endPt = c
        ? { x: c.Q1.x, y: c.Q1.y }
        : { x: projected[endVertex].sx, y: projected[endVertex].sy }
      const row = lines[seg]
      const lengthMm = segmentLength(row.x, row.y, row.z)
      const dimStart = projected[seg]
      const dimEnd = projected[endVertex]
      dims.push({
        x1: dimStart.sx,
        y1: dimStart.sy,
        x2: dimEnd.sx,
        y2: dimEnd.sy,
        lengthMm,
        seg,
      })

      pathD += ` L ${endPt.x} ${endPt.y}`
      if (c) {
        pathD += ` ${arcA(c.O, c.r, c.Q1, c.Q2, c.P)}`
        current = { x: c.Q2.x, y: c.Q2.y }
      } else {
        current = { x: projected[endVertex].sx, y: projected[endVertex].sy }
      }
    }

    const hartLijnStroke = Math.min(2, Math.max(1, 1.25))
    const midStrokeW = Math.max(1, strokeW * 0.72)
    const highlightStrokeW = Math.max(0.6, strokeW * 0.22)
    const pipeGraphics = (
      <g>
        {view === 'ISO' ? (
          <path
            d={pathD}
            fill="none"
            stroke="#111827"
            strokeWidth={Math.max(2, strokeW * 0.85)}
            strokeLinecap="butt"
            strokeLinejoin="round"
            opacity={0.16}
            transform="translate(16 22)"
          />
        ) : null}
        <path
          d={pathD}
          fill="none"
          stroke="#4b5563"
          strokeWidth={strokeW}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth={midStrokeW}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#f8fafc"
          strokeWidth={highlightStrokeW}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity={0.85}
        />
        <path
          d={pathD}
          fill="none"
          stroke="#1f2937"
          strokeWidth={hartLijnStroke}
          strokeDasharray="6 5"
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity={0.55}
        />
      </g>
    )

    let bbMinSx = Infinity
    let bbMaxSx = -Infinity
    let bbMinSy = Infinity
    let bbMaxSy = -Infinity
    const expandBbox = (x, y) => {
      bbMinSx = Math.min(bbMinSx, x)
      bbMaxSx = Math.max(bbMaxSx, x)
      bbMinSy = Math.min(bbMinSy, y)
      bbMaxSy = Math.max(bbMaxSy, y)
    }
    for (const p of projected) expandBbox(p.sx, p.sy)
    for (let vi = 1; vi <= n - 2; vi++) {
      const cor = corners[vi]
      if (!cor) continue
      expandBbox(cor.Q1.x, cor.Q1.y)
      expandBbox(cor.Q2.x, cor.Q2.y)
      expandBbox(cor.P.x, cor.P.y)
      for (const q of arcSamplePoints(cor.O, cor.r, cor.Q1, cor.Q2, cor.P)) expandBbox(q.x, q.y)
    }
    const halfStroke = strokeW / 2
    const bbox = {
      minSx: bbMinSx - halfStroke,
      maxSx: bbMaxSx + halfStroke,
      minSy: bbMinSy - halfStroke,
      maxSy: bbMaxSy + halfStroke,
    }

    const dimensionsOut = dims.map((d) => (
      <SnijlijnDimension
        key={`dim-${d.seg}`}
        x1={d.x1}
        y1={d.y1}
        x2={d.x2}
        y2={d.y2}
        lengthMm={d.lengthMm}
        pathCx={pathCx}
        pathCy={pathCy}
        seg={d.seg}
      />
    ))

    return (
      <g>
        {pipeGraphics}
        {dimensionsOut}
        <OverallViewDimensions bbox={bbox} scale={scale} view={view} H={H} W={W} />
      </g>
    )
  }, [lines, view, W, H, padding, radiusMm, diameterMm])

  return (
    <svg
      className="pipe-canvas grid-bg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Buisvisualisatie"
    >
      <Axes view={view} />
      {pipeLayer}
      {radiusMm > 0 || diameterMm > 0 ? (
        <text x={W - 12} y={H - 16} textAnchor="end" fill="#333" fontSize={15}>
          {[
            diameterMm > 0 ? `Ø ${diameterMm} mm` : null,
            radiusMm > 0 ? `R ${radiusMm} mm` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          {view === 'ISO' ? ' (ISO-weergave)' : ' (2D-weergave)'}
        </text>
      ) : null}
    </svg>
  )
}
