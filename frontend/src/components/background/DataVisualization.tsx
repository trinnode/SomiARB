import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { pseudoRandom } from '../../lib/random';

interface DataVisualizationProps {
  data?: number[];
  color?: string;
  opacity?: number;
  animated?: boolean;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  data = [],
  color = '#60A5FA',
  opacity = 0.7,
  animated = true,
}) => {
  const lineRef = useRef<THREE.Group>(null);

  const visualData = useMemo(() => {
    if (data.length > 0) {
      return data;
    }
    const generated: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      generated.push(Math.sin(i * 0.2) * 10 + (pseudoRandom(i) * 5));
    }
    return generated;
  }, [data]);

  const points = useMemo(() => (
    visualData.map((value, i) => (
      new THREE.Vector3(
        (i - visualData.length / 2) * 2,
        value,
        Math.sin(i * 0.1) * 5,
      )
    ))
  ), [visualData]);

  useFrame((state, delta) => {
    if (lineRef.current && animated) {
      lineRef.current.rotation.y += delta * 0.2;
      lineRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <group ref={lineRef}>
      <Line
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      
      {/* Add glowing points at data vertices */}
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity * 1.5}
          />
        </mesh>
      ))}
    </group>
  );
};