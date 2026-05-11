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

export default function PipeCanvas({ lines, view }) {
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
    const linesOut = []
    const anglesOut = []
    let prevDir = null

    for (let i = 1; i < projected.length; i++) {
      const a = projected[i - 1]
      const b = projected[i]
      const color = COLORS[(i - 1) % COLORS.length]
      linesOut.push(
        <line
          key={`l-${i}`}
          x1={a.sx}
          y1={a.sy}
          x2={b.sx}
          y2={b.sy}
          stroke={color}
          strokeWidth={4}
        />,
      )
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
  }, [lines, view, W, H, padding])

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
    </svg>
  )
}
