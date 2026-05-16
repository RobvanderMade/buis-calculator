import { centerlineLengthMm } from './pipeCenterline3D'
import { DEFAULT_PRICING } from './pricing'

export function segmentLength(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z)
}

/** Som van tabelsegmentlengtes (delta X/Y/Z per regel, zonder bochtcorrectie) */
export function sumSegmentLengths(lines) {
  let total = 0
  for (const line of lines) {
    total += segmentLength(line.x, line.y, line.z)
  }
  return total
}

/** Gestrekte lengte langs middenlijn (rechte stukken + bochten volgens radiusMm) */
export function calculateTotalLength(lines, radiusMm = 0) {
  return centerlineLengthMm(cumulativePoints(lines), radiusMm)
}

/** Cumulatieve punten vanaf oorsprong: [0,0,0], dan eindpunten */
export function cumulativePoints(lines) {
  let cx = 0
  let cy = 0
  let cz = 0
  const points = [{ x: 0, y: 0, z: 0 }]
  for (const line of lines) {
    cx += line.x
    cy += line.y
    cz += line.z
    points.push({ x: cx, y: cy, z: cz })
  }
  return points
}

/** Lengte per tabelregel (zelfde als oorspronkelijke tabelweergave) */
export function rowSegmentLengths(lines) {
  return lines.map((line) => segmentLength(line.x, line.y, line.z))
}

export function rowSegmentStatuses(lines, material) {
  const fallback = lines.map(() => ({
    ok: false,
    message: 'Geen materiaal geselecteerd.',
  }))
  if (!material) return fallback

  const { klemLengte, radius } = material
  const nonZero = []
  for (let i = 0; i < lines.length; i++) {
    const { x, y, z } = lines[i]
    if (x !== 0 || y !== 0 || z !== 0) {
      nonZero.push({ rowIndex: i, length: segmentLength(x, y, z) })
    }
  }

  const firstRowIndex = nonZero[0]?.rowIndex
  const lastRowIndex = nonZero[nonZero.length - 1]?.rowIndex

  return lines.map((line, rowIndex) => {
    const length = segmentLength(line.x, line.y, line.z)
    if (line.x === 0 && line.y === 0 && line.z === 0) {
      return { ok: false, message: 'Geen lijn ingevuld.' }
    }

    if (rowIndex === firstRowIndex && length <= klemLengte + radius) {
      return {
        ok: false,
        message: `Eerste lijn moet langer zijn dan ${klemLengte + radius} mm.`,
      }
    }

    if (rowIndex === lastRowIndex && length < 280) {
      return { ok: false, message: 'Laatste lijn moet minimaal 280 mm zijn.' }
    }

    if (rowIndex !== firstRowIndex && rowIndex !== lastRowIndex && length <= klemLengte + 2 * radius) {
      return {
        ok: false,
        message: `Tussenlijn moet langer zijn dan ${klemLengte + 2 * radius} mm.`,
      }
    }

    return { ok: true, message: 'Regellengte akkoord.' }
  })
}

/**
 * Validatie volgens oorspronkelijke regels (alleen niet-nul segmenten).
 * @returns {{ ok: true, message: string } | { ok: false, message: string }}
 */
export function validateLines(lines, material) {
  if (!material) {
    return { ok: false, message: 'Geen materiaal geselecteerd.' }
  }
  const { klemLengte, radius } = material
  const nonZero = []
  for (let i = 0; i < lines.length; i++) {
    const { x, y, z } = lines[i]
    if (x !== 0 || y !== 0 || z !== 0) {
      const length = segmentLength(x, y, z)
      nonZero.push({ length, rowIndex: i })
    }
  }
  if (nonZero.length === 0) {
    return { ok: false, message: 'Geen lijnen ingevuld om te controleren.' }
  }
  const first = nonZero[0]
  if (first.length <= klemLengte + radius) {
    return {
      ok: false,
      message: `De eerste lijn is te kort. Deze moet langer zijn dan ${klemLengte + radius} mm.`,
    }
  }
  const last = nonZero[nonZero.length - 1]
  if (last.length < 280) {
    return {
      ok: false,
      message: 'De laatste lijn is te kort. Deze moet minimaal 280 mm zijn.',
    }
  }
  for (let j = 1; j < nonZero.length - 1; j++) {
    const line = nonZero[j]
    if (line.length <= klemLengte + 2 * radius) {
      return {
        ok: false,
        message: `Lijn ${line.rowIndex + 1} is te kort. Deze moet langer zijn dan ${klemLengte + 2 * radius} mm.`,
      }
    }
  }
  return { ok: true, message: 'Alle lijnen zijn correct! Je kunt doorgaan.' }
}

/**
 * Prijs per stuk (zelfde formule als origineel, met guards voor randgevallen).
 * @param {typeof DEFAULT_PRICING} [pricing]
 */
export function calculatePricePerStuk(totalLength, prijsPerMTR, aantalStuks, lines, pricing = DEFAULT_PRICING) {
  const maxLengte = pricing.maxGestrekteLengteMm ?? DEFAULT_PRICING.maxGestrekteLengteMm
  if (totalLength >= maxLengte) {
    return {
      error: `De totale lengte is te lang. Deze moet korter zijn dan ${maxLengte} mm.`,
      value: 0,
    }
  }
  if (totalLength <= 0) {
    return { error: null, value: 0 }
  }
  let pricePerPiece = 0
  let totalLines = 0
  for (let i = 1; i < lines.length; i++) {
    const { x, y, z } = lines[i]
    if (x !== 0 || y !== 0 || z !== 0) totalLines++
  }
  pricePerPiece += totalLines * (pricing.prijsPerLijn ?? DEFAULT_PRICING.prijsPerLijn)
  const pricePerTube =
    (pricing.buisMeterFactor ?? DEFAULT_PRICING.buisMeterFactor) * prijsPerMTR
  const buisLengte = pricing.buisLengteMm ?? DEFAULT_PRICING.buisLengteMm
  const stuksUitBuis = Math.max(1, Math.floor(buisLengte / totalLength))
  pricePerPiece += pricePerTube / stuksUitBuis
  pricePerPiece += (pricing.vasteKosten ?? DEFAULT_PRICING.vasteKosten) / Math.max(1, aantalStuks)
  return { error: null, value: pricePerPiece }
}

export function angleBetween2D(v1, v2) {
  const dx1 = v1.dx ?? 0
  const dy1 = v1.dy ?? 0
  const dz1 = v1.dz ?? 0
  const dx2 = v2.dx ?? 0
  const dy2 = v2.dy ?? 0
  const dz2 = v2.dz ?? 0
  const dot = dx1 * dx2 + dy1 * dy2 + dz1 * dz2
  const m1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1)
  const m2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2)
  if (m1 === 0 || m2 === 0) return null
  const c = Math.min(1, Math.max(-1, dot / (m1 * m2)))
  return (Math.acos(c) * 180) / Math.PI
}
