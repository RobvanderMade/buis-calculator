import { useMemo } from 'react'
import { angleBetween2D, cumulativePoints } from './pipeMath'

const COLORS = ['blue', 'red', 'green', 'orange', 'purple', 'cyan']

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

/** SVG elliptische boog Q1→Q2 (straal r); kiest korte boog die het dichtst bij hoekpunt P ligt */
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

/** Assen-label in hoek (zelfde layout als origineel) */
function Axes({ view }) {
  const ap = 20
  const al = 50
  const arr = 5
  if (view === 'XY') {
    return (
      <g aria-hidden>
        <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke="red" strokeWidth={2} />
        <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill="red" />
        <text x={ap + al + 10} y={ap + 4} fill="red" fontSize={16}>
          X
        </text>
        <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke="green" strokeWidth={2} />
        <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill="green" />
        <text x={ap} y={ap + al + 15} fill="green" fontSize={16}>
          Y
        </text>
      </g>
    )
  }
  if (view === 'XZ') {
    return (
      <g aria-hidden>
        <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke="red" strokeWidth={2} />
        <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill="red" />
        <text x={ap + al + 10} y={ap + 4} fill="red" fontSize={16}>
          X
        </text>
        <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke="blue" strokeWidth={2} />
        <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill="blue" />
        <text x={ap} y={ap + al + 15} fill="blue" fontSize={16}>
          Z
        </text>
      </g>
    )
  }
  return (
    <g aria-hidden>
      <line x1={ap} y1={ap} x2={ap + al} y2={ap} stroke="blue" strokeWidth={2} />
      <polygon points={arrowPoints(ap + al, ap, arr, 0)} fill="blue" />
      <text x={ap + al + 10} y={ap + 4} fill="blue" fontSize={16}>
        Z
      </text>
      <line x1={ap} y1={ap} x2={ap} y2={ap + al} stroke="green" strokeWidth={2} />
      <polygon points={arrowPoints(ap, ap + al, arr, -90)} fill="green" />
      <text x={ap} y={ap + al + 15} fill="green" fontSize={16}>
        Y
      </text>
    </g>
  )
}

export default function PipeCanvas({ lines, view, radiusMm = 0 }) {
  const W = 800
  const H = 600
  const padding = 30

  const pipeLayer = useMemo(() => {
    const pts3 = cumulativePoints(lines)
    let minX = 0
    let minY = 0
    let minZ = 0
    let maxX = 0
    let maxY = 0
    let maxZ = 0
    for (const p of pts3) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      minZ = Math.min(minZ, p.z)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
      maxZ = Math.max(maxZ, p.z)
    }
    const scaleX = (W - 2 * padding) / (maxX - minX || 1)
    const scaleY = (H - 2 * padding) / (maxY - minY || 1)
    const scaleZ = (H - 2 * padding) / (maxZ - minZ || 1)
    const scale = Math.min(scaleX, scaleY, scaleZ)
    const offsetX = -minX * scale + padding
    const offsetY = -minY * scale + padding
    const offsetZ = -minZ * scale + padding

    const project = (p) => {
      if (view === 'XY') return { sx: p.x * scale + offsetX, sy: p.y * scale + offsetY }
      if (view === 'XZ') return { sx: p.x * scale + offsetX, sy: p.z * scale + offsetZ }
      return { sx: p.z * scale + offsetZ, sy: p.y * scale + offsetY }
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

    const linesOut = []
    let current = { x: projected[0].sx, y: projected[0].sy }

    for (let seg = 0; seg < n - 1; seg++) {
      const endVertex = seg + 1
      const isInterior = endVertex >= 1 && endVertex <= n - 2
      const c = isInterior ? corners[endVertex] : null
      const endPt = c
        ? { x: c.Q1.x, y: c.Q1.y }
        : { x: projected[endVertex].sx, y: projected[endVertex].sy }
      const color = COLORS[seg % COLORS.length]

      linesOut.push(
        <line
          key={`l-${seg}`}
          x1={current.x}
          y1={current.y}
          x2={endPt.x}
          y2={endPt.y}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      )

      if (c) {
        const d = `M ${c.Q1.x} ${c.Q1.y} ${arcA(c.O, c.r, c.Q1, c.Q2, c.P)}`
        linesOut.push(
          <path
            key={`arc-${endVertex}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        )
        current = { x: c.Q2.x, y: c.Q2.y }
      } else {
        current = { x: projected[endVertex].sx, y: projected[endVertex].sy }
      }
    }

    const anglesOut = []
    let prevDir = null
    for (let i = 1; i < projected.length; i++) {
      const a = projected[i - 1]
      const b = projected[i]
      let dir
      if (view === 'XY') dir = { dx: b.sx - a.sx, dy: b.sy - a.sy }
      else if (view === 'XZ') dir = { dx: b.sx - a.sx, dz: b.sy - a.sy }
      else dir = { dz: b.sx - a.sx, dy: b.sy - a.sy }

      if (i > 1 && prevDir) {
        const ang = angleBetween2D(prevDir, dir)
        if (ang != null) {
          anglesOut.push(
            <text
              key={`a-${i}`}
              x={(a.sx + b.sx) / 2}
              y={(a.sy + b.sy) / 2 - 10}
              fill="black"
              fontSize={16}
            >
              {ang.toFixed(1)}°
            </text>,
          )
        }
      }
      prevDir = dir
    }

    return (
      <g>
        {linesOut}
        {anglesOut}
      </g>
    )
  }, [lines, view, W, H, padding, radiusMm])

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
      {radiusMm > 0 ? (
        <text x={W - 12} y={H - 16} textAnchor="end" fill="#333" fontSize={15}>
          {`Buigradius: ${radiusMm} mm (2D-weergave)`}
        </text>
      ) : null}
    </svg>
  )
}
