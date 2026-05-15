import * as THREE from 'three'

/**
 * Buigpunt in 3D: raakpunten Q1,Q2 en boogmiddelpunt O (centerline-radius r in mm).
 * Zelfde meetkunde als 2D-fillet, in het vlak van inkomend en uitgaand been.
 */
function computeFillet3D(A, P, B, rMm) {
  if (rMm <= 1e-9) return null
  const u1 = new THREE.Vector3().subVectors(P, A)
  const u2 = new THREE.Vector3().subVectors(B, P)
  const len1 = u1.length()
  const len2 = u2.length()
  if (len1 < 1e-9 || len2 < 1e-9) return null
  u1.multiplyScalar(1 / len1)
  u2.multiplyScalar(1 / len2)
  const inc = u1.clone().negate()
  const outD = u2.clone()
  const cosPhi = Math.min(1, Math.max(-1, inc.dot(outD)))
  const phi = Math.acos(cosPhi)
  if (phi < 1e-4 || Math.abs(phi - Math.PI) < 1e-4) return null
  let t = rMm / Math.tan(phi / 2)
  const tMax = Math.min(len1, len2) * 0.499
  let rEff = rMm
  if (t > tMax) {
    t = tMax
    rEff = t * Math.tan(phi / 2)
  }
  if (rEff < 0.5) return null
  const Q1 = P.clone().add(inc.clone().multiplyScalar(t))
  const Q2 = P.clone().add(outD.clone().multiplyScalar(t))
  const bis = inc.clone().add(outD)
  if (bis.lengthSq() < 1e-14) return null
  bis.normalize()
  const dist = rEff / Math.sin(phi / 2)
  const O = P.clone().add(bis.multiplyScalar(dist))
  return { Q1, Q2, O, r: rEff, P }
}

function pushLine(out, from, to, maxStepMm) {
  const dist = from.distanceTo(to)
  if (dist < 1e-6) return
  const steps = Math.max(2, Math.ceil(dist / maxStepMm))
  for (let i = 1; i <= steps; i++) {
    const p = new THREE.Vector3().lerpVectors(from, to, i / steps)
    if (out.length && p.distanceTo(out[out.length - 1]) < 1e-4) continue
    out.push(p)
  }
}

function filletArcLengthMm(O, r, Q1, Q2) {
  const u = new THREE.Vector3().subVectors(Q1, O)
  const rLen = u.length()
  if (rLen < 1e-6) return 0
  u.multiplyScalar(1 / rLen)
  const cross = new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(Q1, O),
    new THREE.Vector3().subVectors(Q2, O),
  )
  if (cross.lengthSq() < 1e-14) return Q1.distanceTo(Q2)
  const axis = cross.normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  const w2 = new THREE.Vector3().subVectors(Q2, O)
  const cosSigma = Math.min(1, Math.max(-1, w2.dot(u) / rLen))
  const sinSigma = w2.dot(v) / rLen
  const sigma = Math.atan2(sinSigma, cosSigma)
  return r * Math.abs(sigma)
}

function pushArc(out, O, r, Q1, Q2) {
  const u = new THREE.Vector3().subVectors(Q1, O)
  const rLen = u.length()
  if (rLen < 1e-6) return
  u.multiplyScalar(1 / rLen)
  const cross = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(Q1, O), new THREE.Vector3().subVectors(Q2, O))
  if (cross.lengthSq() < 1e-14) {
    pushLine(out, Q1, Q2, 30)
    return
  }
  const axis = cross.normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  const w2 = new THREE.Vector3().subVectors(Q2, O)
  const cosSigma = Math.min(1, Math.max(-1, w2.dot(u) / rLen))
  const sinSigma = w2.dot(v) / rLen
  const sigma = Math.atan2(sinSigma, cosSigma)
  const segs = Math.max(4, Math.min(56, Math.ceil((Math.abs(sigma) * rLen) / 28)))
  for (let i = 1; i <= segs; i++) {
    const tt = (i / segs) * sigma
    const p = O.clone()
      .addScaledVector(u, rLen * Math.cos(tt))
      .addScaledVector(v, rLen * Math.sin(tt))
    if (out.length && p.distanceTo(out[out.length - 1]) < 1e-4) continue
    out.push(p)
  }
}

/**
 * Dichte 3D-middenlijnpunten (mm) met rechte stukken en cirkelbochten volgens R.
 * @param {{x:number,y:number,z:number}[]} cumulativePoints van cumulativePoints()
 */
export function buildCenterlinePoints(cumulativePoints, radiusMm) {
  /** Three.js: Y+ omhoog; invoer volgt dezelfde conventie (positieve Y = omhoog). */
  const V = cumulativePoints.map((p) => new THREE.Vector3(p.x, -p.y, p.z))
  const n = V.length
  const out = []
  if (n === 0) return out
  out.push(V[0].clone())
  if (n === 1) return out

  const R = Math.max(0, radiusMm || 0)
  let pos = V[0].clone()

  for (let e = 0; e < n - 1; e++) {
    const endV = V[e + 1]
    const hasNext = e + 2 < n
    let bend = null
    if (hasNext && e + 1 >= 1 && e + 1 <= n - 2 && R > 1e-9) {
      bend = computeFillet3D(V[e], V[e + 1], V[e + 2], R)
    }
    if (bend) {
      pushLine(out, pos, bend.Q1, 32)
      pushArc(out, bend.O, bend.r, bend.Q1, bend.Q2)
      pos.copy(bend.Q2)
    } else {
      pushLine(out, pos, endV, 32)
      pos.copy(endV)
    }
  }

  return out
}

/**
 * Werkelijke gestrekte lengte (mm) langs middenlijn met bochten volgens R.
 * Zelfde meetkunde als buildCenterlinePoints, analytisch (geen discretisatie).
 */
export function centerlineLengthMm(cumulativePoints, radiusMm) {
  const V = cumulativePoints.map((p) => new THREE.Vector3(p.x, -p.y, p.z))
  const n = V.length
  if (n <= 1) return 0

  const R = Math.max(0, radiusMm || 0)
  let pos = V[0].clone()
  let total = 0

  for (let e = 0; e < n - 1; e++) {
    const endV = V[e + 1]
    const hasNext = e + 2 < n
    let bend = null
    if (hasNext && e + 1 >= 1 && e + 1 <= n - 2 && R > 1e-9) {
      bend = computeFillet3D(V[e], V[e + 1], V[e + 2], R)
    }
    if (bend) {
      total += pos.distanceTo(bend.Q1)
      total += filletArcLengthMm(bend.O, bend.r, bend.Q1, bend.Q2)
      pos.copy(bend.Q2)
    } else {
      total += pos.distanceTo(endV)
      pos.copy(endV)
    }
  }

  return total
}

/** Voor TubeGeometry: vloeiende polyline door mm-punten. */
export class PolylineCurve3 extends THREE.Curve {
  constructor(points) {
    super()
    this.type = 'PolylineCurve3'
    this.points = points.length > 0 ? points : [new THREE.Vector3()]
    this.arcLengths = [0]
    this.totalLength = 1
    this._recompute()
  }

  _recompute() {
    let acc = 0
    this.arcLengths = [0]
    for (let i = 1; i < this.points.length; i++) {
      acc += this.points[i].distanceTo(this.points[i - 1])
      this.arcLengths.push(acc)
    }
    this.totalLength = Math.max(acc, 1e-6)
  }

  getLength() {
    return this.totalLength
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const u = Math.min(1, Math.max(0, t)) * this.totalLength
    let j = 0
    while (j < this.arcLengths.length - 1 && this.arcLengths[j + 1] < u) j++
    const s0 = this.arcLengths[j]
    const s1 = this.arcLengths[j + 1]
    const alpha = s1 > s0 ? (u - s0) / (s1 - s0) : 0
    return optionalTarget.copy(this.points[j]).lerp(this.points[j + 1], alpha)
  }
}
