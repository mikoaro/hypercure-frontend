"use client";

import React, { useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";

// --- FE-06: WEBGL THERMAL SHADER ---
// Logic: <100 (Blue->Cyan), 100-170 (Cyan->Green), >180 (Green->Red)
const fragmentShader = `
uniform float uTemp; 
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Normalize Temp range 20.0 to 220.0
  float t = smoothstep(20.0, 220.0, uTemp);
  
  // FE-06 Color Palette
  vec3 colorBlue = vec3(0.0, 0.0, 1.0);   // < 100
  vec3 colorCyan = vec3(0.0, 1.0, 1.0);   // 100
  vec3 colorGreen = vec3(0.0, 1.0, 0.0);  // 170 (Optimal)
  vec3 colorRed = vec3(1.0, 0.0, 0.0);    // > 180 (Exotherm)
  
  vec3 finalColor = vec3(0.0);

  if (uTemp < 100.0) {
     // Interpolate Blue -> Cyan
     float p = smoothstep(20.0, 100.0, uTemp);
     finalColor = mix(colorBlue, colorCyan, p);
  } else if (uTemp >= 100.0 && uTemp <= 170.0) {
     // Interpolate Cyan -> Green
     float p = smoothstep(100.0, 170.0, uTemp);
     finalColor = mix(colorCyan, colorGreen, p);
  } else {
     // Interpolate Green -> Red
     float p = smoothstep(170.0, 220.0, uTemp);
     finalColor = mix(colorGreen, colorRed, p);
  }
  
  // Fresnel Effect (Rim Light) - Keeps 3D shape visible
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);
  float fresnel = pow(1.0 - dot(viewDir, normal), 2.0);
  
  // Add Rim Light to Base Color
  gl_FragColor = vec4(finalColor + (fresnel * 0.4), 1.0);
}
`;

const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() { 
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition; 
}
`;

function ThermalAsset({ url, tempC, position, rotation }: any) {
  const { scene } = useGLTF(url) as any;
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTemp: { value: 20.0 } },
        vertexShader,
        fragmentShader,
        transparent: true,
      }),
    []
  );

  useFrame(() => {
    // Smooth lerp for visual fluidity
    shaderMaterial.uniforms.uTemp.value = THREE.MathUtils.lerp(
      shaderMaterial.uniforms.uTemp.value,
      tempC,
      0.1
    );
  });

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = shaderMaterial;
      }
    });
  }, [clonedScene, shaderMaterial]);

  return (
    <primitive object={clonedScene} position={position} rotation={rotation} />
  );
}

export default function ChassisSceneRight({
  currentTemp,
}: {
  currentTemp: number;
}) {
  return (
    <div className="h-125 w-full bg-[#0a0e17] rounded-xl border border-white/10 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="text-[10px] text-[#00ff9d] font-mono mb-1">
          LIVE DIGITAL TWIN
        </div>
        <div className="text-white/50 text-xs uppercase tracking-widest">
          WebGL Thermal Shader
        </div>
      </div>

      <Canvas camera={{ position: [11, 3, 5], fov: 25 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        {/* <ThermalAsset url="/assets/models/f1_front_wing.glb" tempC={currentTemp} position={[0, -0.5, 4.0]} rotation={[0, Math.PI, 0]} /> */}
        <ThermalAsset
          url="/assets/models/f1_chassis.glb"
          tempC={currentTemp}
          position={[0.2, -0.5, 0]}
          rotation={[0, 20.2, 0]}
        />

        <Grid
          position={[0, -0.5, 0]}
          args={[40, 40]}
          cellColor="#ffffff"
          sectionColor="#00ff9d"
          fadeDistance={25}
          opacity={0.15}
        />
        <OrbitControls autoRotate autoRotateSpeed={1} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
