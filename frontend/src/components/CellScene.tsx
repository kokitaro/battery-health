import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/* A single floating prismatic battery cell with an emissive state-of-health
   pulse. Purpose-built for the landing hero — distinct from the workspace
   sparkline. The cell body is a rounded prism; a thin emissive core breathes
   green, and two terminals cap the top. */

function PrismaticCell() {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Emissive material we mutate per-frame for the pulse.
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#4caf50"),
        emissive: new THREE.Color("#4caf50"),
        emissiveIntensity: 1.2,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );

  const shellMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#243127"),
        roughness: 0.32,
        metalness: 0.65,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
        transmission: 0.08,
        thickness: 0.6,
      }),
    [],
  );

  const terminalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#d7cfc4"),
        roughness: 0.2,
        metalness: 0.9,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // breathing pulse: slow sinusoid, never fully dark.
    const pulse = 0.6 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6));
    coreMat.emissiveIntensity = 0.9 + pulse * 1.6;
    if (haloRef.current) {
      const s = 1 + 0.06 * Math.sin(t * 1.6);
      haloRef.current.scale.set(s, s, s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.1 * pulse;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* translucent prismatic shell */}
      <RoundedBox args={[1.5, 3, 1.5]} radius={0.14} smoothness={6} material={shellMat} />

      {/* emissive core slab visible through the shell */}
      <mesh ref={coreRef} material={coreMat}>
        <boxGeometry args={[0.5, 2.4, 0.5]} />
      </mesh>

      {/* soft halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.9, 32, 32]} />
        <meshBasicMaterial color="#4caf50" transparent opacity={0.16} side={THREE.BackSide} />
      </mesh>

      {/* two terminals on top */}
      <mesh position={[-0.4, 1.62, 0]} material={terminalMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.26, 24]} />
      </mesh>
      <mesh position={[0.4, 1.62, 0]} material={terminalMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.26, 24]} />
      </mesh>
    </group>
  );
}

export function CellScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      resize={{ scroll: false, debounce: 200 }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={1.4} color="#4caf50" />
      <Suspense fallback={null}>
        <Float speed={1.4} rotationIntensity={0.5} floatIntensity={1.1}>
          <PrismaticCell />
        </Float>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
