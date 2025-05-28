import React from 'react'
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';

import { CANVAS_SIZE, useCanvasTexture } from './CanvasTexture';


export const SphereCanvas = ({ x, y }: { x: number, y: number }) => {
    const texture = useCanvasTexture();

    const shaderRef = React.useRef<THREE.ShaderMaterial>(null);

    const uniforms = React.useMemo(() => {
        return {
            uTexture: { value: texture },
            uCenter: { value: new THREE.Vector2(x, y) },
            uRange: { value: 512 },
            uWidth: { value: CANVAS_SIZE },
            uHeight: { value: CANVAS_SIZE },
        }
    }, [texture]);

    const vertexShader = `
        varying vec3 vWorldDirection;

        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldDirection = normalize(worldPosition.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;
    // use angle around x-axis and angle around y-axis as uv
    const fragmentShader = `
        uniform sampler2D uTexture;
        uniform vec2 uCenter;
        uniform float uRange;
        uniform float uWidth;
        uniform float uHeight;
        varying vec3 vWorldDirection;
        #define PI 3.1415926535897932384626433832795

        void main() {
            vec3 zAxis = vec3(0.0, 0.0, 1.0);
            vec3 xAxis = vec3(1.0, 0.0, 0.0);
            vec3 yAxis = vec3(0.0, 1.0, 0.0);

            // 法向量在xz平面上投影关于z的夹角
            float angleX = atan(dot(vWorldDirection, xAxis), dot(vWorldDirection, zAxis));
            // 法向量在yz平面上投影关于z的夹角
            float angleY = atan(dot(vWorldDirection, yAxis), dot(vWorldDirection, zAxis));

            // 超出测地边界的范围则丢弃
            if (abs(angleX) > PI/2.0 || abs(angleY) > PI/2.0) discard;

            // 映射为纹理坐标
            vec2 sphereCoords = vec2(angleX / PI, angleY / PI);  // -0.5 ~ 0.5
            vec2 uv = (uCenter + sphereCoords * uRange) / vec2(uWidth, uHeight);
            gl_FragColor = texture2D(uTexture, uv);
        }
    `;

    useFrame(() => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uCenter.value.set(x, y);
        }
    });

    return (
        <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            {/* <meshBasicMaterial map={textureRef.current} side={THREE.DoubleSide} /> */}
            <shaderMaterial
                ref={shaderRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                side={THREE.DoubleSide}
                transparent={true}
            />
        </mesh>
    );
};

