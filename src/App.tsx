import React from 'react'
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';

// import { SphereCanvas } from './SphereCanvas';
import { Overlay, PolarCanvas } from './PolarCanvas';
import { Panel } from './Panel';


export default function App() {

    return (
        <div style={{
            width: '100vw', height: '100vh',
            maxWidth: '100vw', maxHeight: '100vh',
            display: 'flex', flexDirection: 'row',
            overflow: 'hidden',
        }} >
            <Panel />
            <Viewer />
        </div>
    )
}


function Viewer() {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const cameraRef = React.useRef<THREE.Camera>(null);

    const getCanvas = React.useCallback(() => canvasRef.current, []);
    const getCamera = React.useCallback(() => cameraRef.current, []);

    return (
        <div style={{ flex: '1 1 0', position: 'relative', minWidth: 0 }}>
            <Canvas
                ref={canvasRef}
                camera={{ position: [0, 0, 10], fov: 7 }}
                style={{ background: 'black' }}
                onCreated={({ camera }) => {
                    cameraRef.current = camera;
                }}
            >
                <ambientLight />
                <PolarCanvas />
            </Canvas>
            <Overlay getCamera={getCamera} getCanvas={getCanvas} />
        </div>
    )
}
