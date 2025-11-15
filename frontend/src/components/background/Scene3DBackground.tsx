'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import { Color, type Points as ThreePoints, type Group, type Mesh } from 'three';
import { use3DEnabled } from '../../stores/uiStore';
import { pseudoRandom } from '../../lib/random';

interface Scene3DBackgroundProps {
  className?: string;
}

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count = 1500 }) => {
  const mesh = useRef<ThreePoints>(null);
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      temp[i3] = (pseudoRandom(i, 1) - 0.5) * 25;
      temp[i3 + 1] = (pseudoRandom(i, 2) - 0.5) * 25;
      temp[i3 + 2] = (pseudoRandom(i, 3) - 0.5) * 25;
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <Points ref={mesh} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#0ea5e9"
        size={0.01}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.3}
      />
    </Points>
  );
};

const GeometricShapes: React.FC = () => {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={group}>
      {/* Subtle geometric structures */}
      <mesh position={[0, 0, -12]} rotation={[0, 0, Math.PI / 6]}>
        <torusGeometry args={[4, 0.05, 16, 100]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.08} wireframe />
      </mesh>
      
      <mesh position={[6, 3, -8]} rotation={[Math.PI / 4, 0, 0]}>
        <octahedronGeometry args={[0.8]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.06} wireframe />
      </mesh>
      
      <mesh position={[-5, -2, -10]} rotation={[0, Math.PI / 3, 0]}>
        <dodecahedronGeometry args={[1]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.05} wireframe />
      </mesh>
    </group>
  );
};

const GradientOrb: React.FC = () => {
  const mesh = useRef<Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Sphere ref={mesh} args={[12, 32, 32]} position={[0, 0, -18]}>
      <meshBasicMaterial
        color={new Color('#0c4a6e')}
        transparent
        opacity={0.03}
        wireframe
      />
    </Sphere>
  );
};

const Scene3D: React.FC = () => {
  return (
    <>
      {/* Dark gradient background */}
      <color attach="background" args={['#020617']} />
      
      {/* Minimal lighting */}
      <ambientLight intensity={0.05} color="#0ea5e9" />
      <directionalLight
        position={[5, 5, 2]}
        intensity={0.1}
        color="#0ea5e9"
      />
      
      <FloatingParticles count={1200} />
      <GeometricShapes />
      <GradientOrb />
    </>
  );
};

export const Scene3DBackground: React.FC<Scene3DBackgroundProps> = ({
  className = '',
}) => {
  const enable3D = use3DEnabled();

  // Fallback gradient background when 3D is disabled
  if (!enable3D) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-950 ${className}`} />
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0, 1],
          fov: 75,
          near: 0.1,
          far: 100
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <Scene3D />
      </Canvas>
      
      {/* Enhanced gradient overlay for excellent text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/60 to-slate-950/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/80 pointer-events-none" />
    </div>
  );
};