import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';

// A simple abstract bus shape
const AbstractBus = () => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating/driving motion
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 1.4, 1.2]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Windows */}
      <mesh position={[0.2, 0.3, 0.61]}>
        <boxGeometry args={[3.8, 0.6, 0.1]} />
        <meshStandardMaterial color="#000000" roughness={0} metalness={1} />
      </mesh>
       <mesh position={[0.2, 0.3, -0.61]}>
        <boxGeometry args={[3.8, 0.6, 0.1]} />
        <meshStandardMaterial color="#000000" roughness={0} metalness={1} />
      </mesh>
      {/* Wheels */}
      <mesh position={[-1.2, -0.7, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[1.2, -0.7, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-1.2, -0.7, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[1.2, -0.7, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[2.01, -0.2, 0.3]}>
         <boxGeometry args={[0.1, 0.2, 0.2]} />
         <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
      </mesh>
       <mesh position={[2.01, -0.2, -0.3]}>
         <boxGeometry args={[0.1, 0.2, 0.2]} />
         <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
      </mesh>
    </group>
  );
};

const RoadLines = () => {
    const lines = useMemo(() => {
        return new Array(20).fill(0).map((_, i) => ({
            position: [(i * 2) - 20, -1.5, 0] as [number, number, number],
            speed: Math.random() * 0.5 + 0.5
        }))
    }, []);

    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if(groupRef.current) {
            groupRef.current.children.forEach((child) => {
                child.position.x -= 8 * delta;
                if(child.position.x < -15) {
                    child.position.x = 15;
                }
            })
        }
    })

    return (
        <group ref={groupRef}>
             {lines.map((line, i) => (
                <mesh key={i} position={line.position} rotation={[Math.PI/2, 0, 0]}>
                    <planeGeometry args={[1, 0.1]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                </mesh>
            ))}
        </group>
    )
}

export const ThreeBusScene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 opacity-60">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[5, 2, 8]} fov={45} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <AbstractBus />
        </Float>
        
        <RoadLines />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Cinematic fog */}
        <fog attach="fog" args={['#0f172a', 5, 25]} />
      </Canvas>
    </div>
  );
};
