'use client'

import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useNeuralStore } from '@/stores/neuralStore'

// ============================================================
// Neural Node (Neuron Cluster)
// ============================================================

interface NeuralNodeMeshProps {
  node: {
    id: string
    label: string
    position: { x: number; y: number; z: number }
    color: string
    size: number
    activation: number
    is_active: boolean
    type: string
  }
  onClick?: (node: any) => void
}

function NeuralNodeMesh({ node, onClick }: NeuralNodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const baseColor = useMemo(() => new THREE.Color(node.color), [node.color])
  const glowColor = useMemo(() => new THREE.Color(node.color).multiplyScalar(2), [node.color])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()

    // Pulsing activation effect
    const activationIntensity = node.is_active ? node.activation : 0.3
    const pulse = 1 + Math.sin(time * 3 + node.position.x) * 0.08 * activationIntensity
    const scale = node.size * 0.15 * pulse

    meshRef.current.scale.setScalar(scale)

    // Rotation
    meshRef.current.rotation.y += 0.005
    meshRef.current.rotation.x += 0.002

    // Glow intensity
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + activationIntensity * 0.3
      glowRef.current.scale.setScalar(scale * 1.8)
    }

    // Ring rotation when active
    if (ringRef.current && node.is_active) {
      ringRef.current.rotation.z += 0.02
      ringRef.current.rotation.x = Math.PI / 4
    }
  })

  return (
    <group
      position={[node.position.x, node.position.y, node.position.z]}
      onClick={() => onClick?.(node)}
    >
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshPhongMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={node.is_active ? 0.8 : 0.2}
          transparent={false}
          wireframe={false}
        />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Activity ring */}
      {node.is_active && (
        <mesh ref={ringRef}>
          <torusGeometry args={[node.size * 0.2, 0.02, 8, 32]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Billboard>
        <Text
          position={[0, node.size * 0.25, 0]}
          fontSize={0.3}
          color={node.color}
          anchorX="center"
          anchorY="middle"
          font="/fonts/JetBrainsMono-Regular.ttf"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      </Billboard>
    </group>
  )
}

// ============================================================
// Neural Synapse (Edge)
// ============================================================

interface SynapseProps {
  source: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  color: string
  weight: number
  isActive: boolean
  hasPulse: boolean
}

function Synapse({ source, target, color, weight, isActive, hasPulse }: SynapseProps) {
  const lineRef = useRef<THREE.Line>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  const pulseProgress = useRef(0)

  const points = useMemo(() => {
    const start = new THREE.Vector3(source.x, source.y, source.z)
    const end = new THREE.Vector3(target.x, target.y, target.z)
    const mid = start.clone().lerp(end, 0.5)
    mid.y += Math.random() * 0.5 - 0.25

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return curve.getPoints(20)
  }, [source, target])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  const lineColor = useMemo(() => new THREE.Color(color), [color])

  useFrame((state, delta) => {
    if (!isActive && !hasPulse) return

    if (hasPulse && pulseRef.current) {
      pulseProgress.current = (pulseProgress.current + delta * 2) % 1
      const p = points[Math.floor(pulseProgress.current * (points.length - 1))]
      pulseRef.current.position.copy(p)
    }
  })

  return (
    <group>
      <line ref={lineRef as any} geometry={geometry}>
        <lineBasicMaterial
          color={lineColor}
          transparent
          opacity={isActive ? 0.6 : 0.1}
          linewidth={weight}
        />
      </line>

      {/* Neural pulse along synapse */}
      {hasPulse && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  )
}

// ============================================================
// Particle Field (Neural Activity)
// ============================================================

function NeuralParticleField() {
  const pointsRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50

      // Cyan-blue color range
      colors[i * 3] = 0
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2

      sizes[i] = Math.random() * 0.05 + 0.01
    }

    return { positions, colors, sizes }
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y += 0.0002
    pointsRef.current.rotation.x += 0.0001
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================
// Central Brain Core
// ============================================================

function BrainCore() {
  const coreRef = useRef<THREE.Mesh>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const auraRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    if (coreRef.current) {
      coreRef.current.rotation.y += 0.003
      coreRef.current.rotation.z += 0.001
    }

    if (shellRef.current) {
      shellRef.current.rotation.y -= 0.002
      shellRef.current.rotation.x += 0.001
      const scale = 1 + Math.sin(time * 0.5) * 0.05
      shellRef.current.scale.setScalar(scale)
    }

    if (auraRef.current) {
      const opacity = 0.05 + Math.sin(time * 0.7) * 0.03
      ;(auraRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })

  return (
    <group>
      {/* Inner core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.8, 3]} />
        <meshPhongMaterial
          color="#00ffff"
          emissive="#00aacc"
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>

      {/* Shell */}
      <mesh ref={shellRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshPhongMaterial
          color="#0088aa"
          emissive="#004466"
          emissiveIntensity={0.3}
          transparent
          opacity={0.15}
          wireframe={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Directional light from core */}
      <pointLight color="#00ffff" intensity={3} distance={20} />
    </group>
  )
}

// ============================================================
// Main Neural Scene
// ============================================================

interface NeuralSceneProps {
  onNodeClick?: (node: any) => void
}

function NeuralScene({ onNodeClick }: NeuralSceneProps) {
  const { nodes, edges, activePulses } = useNeuralStore()

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.1} />

      {/* Directional lights for depth */}
      <directionalLight position={[10, 10, 5]} intensity={0.3} color="#4fc3f7" />
      <directionalLight position={[-10, -10, -5]} intensity={0.2} color="#ab47bc" />

      {/* Stars background */}
      <Stars radius={80} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

      {/* Particle field */}
      <NeuralParticleField />

      {/* Central brain core */}
      <BrainCore />

      {/* Neural synapses (edges) */}
      {edges.map((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        if (!sourceNode || !targetNode) return null

        return (
          <Synapse
            key={edge.id}
            source={sourceNode.position}
            target={targetNode.position}
            color={edge.color || '#4fc3f7'}
            weight={edge.weight || 1}
            isActive={edge.is_active || false}
            hasPulse={edge.pulse_active || false}
          />
        )
      })}

      {/* Neural nodes (brain regions / agents) */}
      {nodes.map((node) => (
        <NeuralNodeMesh
          key={node.id}
          node={node}
          onClick={onNodeClick}
        />
      ))}
    </>
  )
}

// ============================================================
// Main Component
// ============================================================

interface NeuralVisualizationProps {
  className?: string
  onNodeClick?: (node: any) => void
}

export function NeuralVisualization({ className = '', onNodeClick }: NeuralVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={60} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate
            autoRotateSpeed={0.3}
            minDistance={5}
            maxDistance={80}
            dampingFactor={0.05}
            enableDamping
          />
          <NeuralScene onNodeClick={onNodeClick} />
        </Suspense>
      </Canvas>

      {/* Overlay info */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-[rgba(0,255,255,0.4)] pointer-events-none">
        <div>NEURAL GRAPH ACTIVE</div>
        <div>WebGL • Three.js • React Three Fiber</div>
      </div>
    </div>
  )
}
