/**
 * CarModel.jsx — React Three Fiber wrapper around car3d.js
 *
 *   npm i three @react-three/fiber @react-three/drei
 *
 *   import { Canvas } from '@react-three/fiber';
 *   import { OrbitControls } from '@react-three/drei';
 *   import CarModel, { StudioEnvironment } from './CarModel';
 *
 *   <Canvas shadows camera={{ position: [5.2, 1.9, 5.6], fov: 34 }}
 *           gl={{ antialias: true }}
 *           onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
 *     <StudioEnvironment />
 *     <CarModel preset="gt" bodyColor="#16305c" speed={12} steering={0.15} lights />
 *     <OrbitControls target={[0, 0.6, 0]} />
 *   </Canvas>
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { createCar, createStudioEnvironment } from './car3d.js';

/**
 * Drop-in studio lighting. Generates a floating-point light probe once and
 * assigns it as the scene environment — a car without one looks like clay.
 */
export function StudioEnvironment({ preset = 'studio', intensity = 1, background = false }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = createStudioEnvironment(gl, { preset, intensity });
    const prev = scene.environment;
    scene.environment = env.envMap;
    if (background) scene.background = env.envMap;
    return () => {
      scene.environment = prev;
      if (background) scene.background = null;
      env.dispose();
    };
  }, [gl, scene, preset, intensity, background]);
  return null;
}

/**
 * @param {object} props
 * @param {'gt'|'suv'|'hatch'} [props.preset]
 * @param {string} [props.bodyColor]
 * @param {'low'|'medium'|'high'} [props.quality]
 * @param {number} [props.speed]     metres/second — drives wheel rotation
 * @param {number} [props.steering]  radians at the road wheels
 * @param {boolean} [props.lights]
 * @param {number} [props.brake]     0..1
 */
export default function CarModel({
  preset = 'gt',
  bodyColor = '#16305c',
  quality = 'high',
  rimStyle = 'split5',
  glass = 'transmission',
  speed = 0,
  steering = 0,
  lights = false,
  brake = 0,
  ...groupProps
}) {
  const ref = useRef();

  // Rebuild only when something structural changes; colour and lights are
  // cheap setters, so they must not be in this dependency list.
  const car = useMemo(
    () => createCar({ preset, quality, rimStyle, glass, bodyColor }),
    [preset, quality, rimStyle, glass] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => () => car.dispose(), [car]);
  useEffect(() => { car.setPaintColor(bodyColor); }, [car, bodyColor]);
  useEffect(() => { car.setLights(lights); }, [car, lights]);
  useEffect(() => { car.setBrake(brake); }, [car, brake]);
  useEffect(() => { car.setSteering(steering); }, [car, steering]);

  useFrame((_, dt) => car.update(Math.min(dt, 0.05), speed));

  return <primitive ref={ref} object={car.group} {...groupProps} />;
}
