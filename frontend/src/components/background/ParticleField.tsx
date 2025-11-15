import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Points as PointsType } from 'three';
import { pseudoRandom } from '../../lib/random';

interface ParticleFieldProps {
  count?: number;
  intensity?: 'low' | 'medium' | 'high';
  color?: string;
  size?: number;
  speed?: number;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 2000,
  intensity = 'medium',
  color = '#1E40AF',
  size = 1,
  speed = 0.5,
}) => {
  const ref = useRef<PointsType>(null);
  
  const particleCount = useMemo(() => {
    switch (intensity) {
      case 'low': return Math.floor(count * 0.5);
      case 'high': return Math.floor(count * 1.5);
      default: return count;
    }
  }, [count, intensity]);

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create a spherical distribution using deterministic pseudo-randomness
      const radius = 10 + pseudoRandom(i, 1) * 40;
      const theta = pseudoRandom(i, 2) * Math.PI * 2;
      const phi = Math.acos(2 * pseudoRandom(i, 3) - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }
    
    return positions;
  }, [particleCount]);

  useFrame((state, delta) => {
    if (ref.current) {
      // Rotate the entire particle system
      ref.current.rotation.y += delta * speed * 0.1;
      ref.current.rotation.x += delta * speed * 0.05;
      
      // Add some floating motion
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.6}
      />
    </Points>
  );
};