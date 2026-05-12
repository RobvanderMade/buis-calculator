import { useLayoutEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { cumulativePoints } from './pipeMath'
import { buildCenterlinePoints, PolylineCurve3 } from './pipeCenterline3D'

function bboxMeters(points, diameterMm) {
  const box = new THREE.Box3()
  if (!points.length) return box
  for (const p of points) {
    box.expandByPoint(p.clone().multiplyScalar(0.001))
  }
  const tubeR = Math.max(0.001, ((diameterMm || 40) / 2) * 0.001)
  box.expandByScalar(tubeR * 1.15)
  return box
}

/** Ruimte tussen onderkant (bbox) en raster (y=0), in meters. */
const GROUND_CLEARANCE_M = 0.0035

function Rig({ layout }) {
  const { camera } = useThree()

  useLayoutEffect(() => {
    if (!layout) return
    const { target, radius } = layout
    const r = Math.max(radius, 0.07)
    const d = r * 2.55
    camera.position.set(target.x + d * 0.52, target.y + d * 0.4, target.z + d * 0.48)
    camera.near = Math.max(0.0002, r / 1200)
    camera.far = Math.max(45, r * 500)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
  }, [camera, layout])

  return null
}

function TubeMesh({ points, diameterMm }) {
  const geometry = useMemo(() => {
    if (points.length < 2) {
      const g = new THREE.BufferGeometry()
      return g
    }
    const curve = new PolylineCurve3(points)
    const len = curve.getLength()
    const d = Math.max(2, diameterMm || 40)
    const tubeRadius = d / 2
    const tubularSegments = Math.min(480, Math.max(24, Math.floor(len / 4)))
    return new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, 12, false)
  }, [points, diameterMm])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  if (points.length < 2) return null

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#8f97a8" metalness={0.52} roughness={0.4} envMapIntensity={0.85} />
    </mesh>
  )
}

function Scene3D({ lines, radiusMm, diameterMm }) {
  const points = useMemo(() => {
    const cum = cumulativePoints(lines)
    return buildCenterlinePoints(cum, radiusMm)
  }, [lines, radiusMm])

  const layout = useMemo(() => {
    if (!points.length) {
      return {
        position: new THREE.Vector3(0, 0, 0),
        target: new THREE.Vector3(0, 0, 0),
        radius: 0.12,
        groundY: -0.08,
        orbitTargetArr: [0, 0, 0],
      }
    }
    const box = bboxMeters(points, diameterMm)
    const c = box.getCenter(new THREE.Vector3())
    /** X/Z gecentreerd; Y: onderkant bbox net boven y=0 (raster), niet het midden op y=0. */
    const position = new THREE.Vector3(-c.x, -box.min.y + GROUND_CLEARANCE_M, -c.z)
    const shifted = new THREE.Box3(box.min.clone().add(position), box.max.clone().add(position))
    const sphere = shifted.getBoundingSphere(new THREE.Sphere())
    const target = sphere.center.clone()
    const groundY = Math.min(GROUND_CLEARANCE_M - 0.06, -0.05)
    return {
      position,
      target,
      radius: sphere.radius,
      groundY,
      orbitTargetArr: [target.x, target.y, target.z],
    }
  }, [points, diameterMm])

  return (
    <>
      <color attach="background" args={['#eceef2']} />
      <ambientLight intensity={0.58} />
      <hemisphereLight color="#f0f4ff" groundColor="#8890a0" intensity={0.45} />
      <directionalLight
        position={[2.2, 3.2, 2.0]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <group scale={0.001} position={layout.position}>
        <TubeMesh points={points} diameterMm={diameterMm} />
      </group>
      <Rig layout={layout} />
      <Grid
        args={[48, 48]}
        position={[0, 0, 0]}
        cellSize={0.06}
        cellThickness={0.55}
        cellColor="#b8c0d4"
        sectionSize={0.24}
        sectionThickness={0.9}
        sectionColor="#9aa6bc"
        fadeDistance={3.2}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, layout.groundY, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.15} />
      </mesh>
      <OrbitControls
        makeDefault
        target={layout.orbitTargetArr}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.04}
        maxDistance={8}
        maxPolarAngle={Math.PI * 0.49}
      />
    </>
  )
}

export default function PipeScene3D({ lines, radiusMm = 0, diameterMm = 0, width = 800, height = 600 }) {
  return (
    <div
      className="pipe-canvas pipe-canvas--3d grid-bg"
      style={{ width, height, position: 'relative', touchAction: 'none' }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 40, near: 0.0004, far: 2500 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        dpr={[1, 2]}
      >
        <Scene3D lines={lines} radiusMm={radiusMm} diameterMm={diameterMm} />
      </Canvas>
      <p className="pipe-3d-hint" aria-hidden>
        Sleep om te draaien · scroll om te zoomen
      </p>
    </div>
  )
}
