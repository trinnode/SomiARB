import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { pseudoRandom } from '../../lib/random';

interface GeometricShapesProps {
  count?: number;
  color?: string;
  opacity?: number;
  speed?: number;
}

export const GeometricShapes: React.FC<GeometricShapesProps> = ({
  count = 20,
  color = '#1E40AF',
  opacity = 0.1,
  speed = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * speed * 0.1;
      groupRef.current.rotation.x += delta * speed * 0.05;
    }
  });

  const shapes = useMemo(() => (
    Array.from({ length: count }).map((_, i) => {
      const radius = 20 + pseudoRandom(i, 1) * 60;
      const theta = (i / count) * Math.PI * 2;
      const phi = pseudoRandom(i, 2) * Math.PI;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const scale = 0.5 + pseudoRandom(i, 3) * 1.5;
      const wireframe = pseudoRandom(i, 4) > 0.5;

      return {
        key: i,
        position: [x, y, z] as [number, number, number],
        scale,
        wireframe,
      };
    })
  ), [count]);

  return (
    <group ref={groupRef}>
      {shapes.map((shape) => (
        <Sphere
          key={shape.key}
          position={shape.position}
          scale={[shape.scale, shape.scale, shape.scale]}
          args={[1, 8, 6]}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            wireframe={shape.wireframe}
          />
        </Sphere>
      ))}
    </group>
  );
};