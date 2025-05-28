import React from 'react'
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { CANVAS_SIZE, useTextureRender, useCanvasTexture } from './CanvasTexture';
import { clearUISelected, getHitPlace, setPlace, setUISelected, setUIXY, useDataStore, useSelectedPlace, useUIStore } from './store';
import { UI2Plane, tex2Plane, plane2tex, world2UI, type XY } from './utils';


export const PolarCanvas = () => {
    const urls = useDataStore(state => state.urls);
    const places = useDataStore(state => state.places);
    const selected = useUIStore(state => state.selected);
    const x = useUIStore(s => s.x);
    const y = useUIStore(s => s.y);

    const { tex, ctx } = useCanvasTexture();
    const urlPlaces = React.useMemo(() => {
        return urls.map((url, idx) => places[idx]?.map(place => ({ url, ...place })) || []).flat();
    }, [urls, places]);
    useTextureRender({ tex, ctx, x, y, urlPlaces });

    const shaderRef = React.useRef<THREE.ShaderMaterial>(null);

    const uniforms = React.useMemo(() => {
        return {
            uTexture: { value: tex },
            uCenter: { value: new THREE.Vector2(CANVAS_SIZE / 2, CANVAS_SIZE / 2) },
            uRange: { value: CANVAS_SIZE },
            uWidth: { value: CANVAS_SIZE },
            uHeight: { value: CANVAS_SIZE },
            uHandle: { value: new THREE.Vector4(0, 0, 0, 0) },
        }
    }, [tex]);

    const vertexShader = `
        varying vec3 vPosition;

        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vPosition = position;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;
    // use angle around x-axis and angle around y-axis as uv
    const fragmentShader = `
        uniform sampler2D uTexture;
        uniform vec2 uCenter; // Canvas coords of plane center
        uniform float uRange;
        uniform float uWidth;
        uniform float uHeight;
        uniform vec4 uHandle; // x, y, w, h of the handle rectangle
        varying vec3 vPosition;
        const float PI = 3.14159265358979323846;
        const float halfPI = PI / 2.0;
        const float shadow = 0.6; // Shadow strength

        void main() {
            float r = 0.5;
            vec2 rou = vPosition.xy - vec2(0.0, 0.0);
            float rouLen = sqrt(rou.x * rou.x + rou.y * rou.y);
            if (rouLen > r) discard;

            float rad = asin(rouLen / r);
            float brightness = cos(rad);
            float arcLen = rad * r;
            vec2 strechedPos = normalize(rou) * arcLen + vec2(0.0, 0.0);
            vec2 xyCvs = (uCenter + strechedPos * uRange / halfPI);
            vec2 uv = xyCvs / vec2(uWidth, uHeight);

            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Outside the canvas
                return;
            }
            gl_FragColor = texture2D(uTexture, uv) * (brightness * shadow + 1.0 * (1.0 - shadow) );
            gl_FragColor.w = 1.0;

            // Handle
            float xCvs = xyCvs.x;
            float yCvs = uHeight - xyCvs.y; // Invert y-axis for canvas coordinates
            bool insideX = xyCvs.x >= uHandle.x && xyCvs.x <= uHandle.x + uHandle.z;
            bool insideY = yCvs >= uHandle.y && yCvs <= uHandle.y + uHandle.w;
            if (insideX && insideY) {
                gl_FragColor = gl_FragColor * 0.7 + vec4(0.0, 0.3, 0.0, 0.3);
            }
            if (insideX && (abs(yCvs - uHandle.y) <= 1.0 || abs(yCvs - uHandle.y - uHandle.w) <= 1.0)) {
                gl_FragColor = vec4(0.0, 1.0, 0.0, 1);
            }
            if (insideY && (abs(xyCvs.x - uHandle.x) <= 1.0 || abs(xyCvs.x - uHandle.x - uHandle.z) <= 1.0)) {
                gl_FragColor = vec4(0.0, 1.0, 0.0, 1);
            }
        }
    `;

    useFrame(() => {
        if (!shaderRef.current) return;
        while (true) {
            if (!selected) break;
            const { url, iPlace } = selected;
            const iUrl = urls.indexOf(url);
            if (iUrl < 0 || iPlace < 0) break;
            if (places[iUrl] === undefined) break;
            const place = places[iUrl][iPlace];
            if (!place) break;
            shaderRef.current.uniforms.uHandle.value.set(
                place.x - x, place.y - y,
                place.w, place.h
            );
            return;
        }
        // clear
        shaderRef.current.uniforms.uHandle.value.set(0, 0, 0, 0);
    });

    return (
        <mesh>
            <planeGeometry args={[1, 1]} />
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


export function Overlay({ getCamera, getCanvas }: {
    getCamera: () => THREE.Camera | null, getCanvas: () => HTMLCanvasElement | null
}) {
    const rls = useDataStore(s => s.rls);
    const selectedInfo = useSelectedPlace();
    const x = useUIStore(s => s.x);
    const y = useUIStore(s => s.y);
    const [dragging, setDragging] = React.useState(false);
    const [adjusting, setAdjusting] = React.useState<undefined | 'move' | 'tl' | 'tr' | 'br' | 'bl'>(undefined);
    // Refs
    const startMousePosRef = React.useRef({ x: 0, y: 0 });
    const startPosRef = React.useRef({ x: 0, y: 0 });
    const startPlaceRef = React.useRef({ x: 0, y: 0, r: 0, b: 0, w: 0, h: 0 });

    const handlesOnUI = React.useMemo(() => {
        const res: { tl?: XY, tr?: XY, br?: XY, bl?: XY } = {};
        const camera = getCamera();
        const canvas = getCanvas();
        if (!selectedInfo || !camera || !canvas) return res;
        const { place } = selectedInfo;
        const center = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };
        // Top left
        {
            const posPlane = tex2Plane({ x: place.x - x, y: place.y - y }, center, CANVAS_SIZE);
            if (posPlane) {
                res.tl = world2UI(new THREE.Vector3(posPlane.x, posPlane.y, 0), camera, canvas);
            }
        }
        // Top right
        {
            const posPlane = tex2Plane({ x: place.x - x + place.w - 1, y: place.y - y }, center, CANVAS_SIZE);
            if (posPlane) {
                res.tr = world2UI(new THREE.Vector3(posPlane.x, posPlane.y, 0), camera, canvas);
            }
        }
        // Bottom right
        {
            const posPlane = tex2Plane({ x: place.x - x + place.w - 1, y: place.y - y + place.h - 1 }, center, CANVAS_SIZE);
            if (posPlane) {
                res.br = world2UI(new THREE.Vector3(posPlane.x, posPlane.y, 0), camera, canvas);
            }
        }
        // Bottom left
        {
            const posPlane = tex2Plane({ x: place.x - x, y: place.y - y + place.h - 1 }, center, CANVAS_SIZE);
            if (posPlane) {
                res.bl = world2UI(new THREE.Vector3(posPlane.x, posPlane.y, 0), camera, canvas);
            }
        }
        return res;
    }, [selectedInfo && selectedInfo.place, x, y, getCamera, getCanvas]);

    const getHit = (mousePos: { x: number, y: number }) => {
        const camera = getCamera();
        const canvas = getCanvas();
        if (!canvas || !camera) return;
        const hitPlane = UI2Plane(mousePos, camera, canvas);
        const hitTex = plane2tex(hitPlane, { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }, CANVAS_SIZE);
        return hitTex;
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rls && e.ctrlKey) {
            const hitTex = getHit({ x: e.clientX, y: e.clientY });
            if (hitTex) {
                const hitPlace = getHitPlace(hitTex.x + x, hitTex.y + y);
                if (hitPlace) {
                    const { url, iPlace } = hitPlace;
                    setUISelected(url, iPlace);
                } else {
                    clearUISelected();
                }
            }
        }
        if (!rls && selectedInfo) {
            const { place } = selectedInfo;
            const hitTex = getHit({ x: e.clientX, y: e.clientY });
            const canvasRect = getCanvas()?.getBoundingClientRect()
            if (canvasRect && hitTex) {
                // handles
                for (const handle of ['tl', 'tr', 'br', 'bl'] as const) {
                    if (handlesOnUI[handle] &&
                        Math.abs(e.clientX - canvasRect.x - handlesOnUI[handle].x) <= 6 &&
                        Math.abs(e.clientY - canvasRect.y - handlesOnUI[handle].y) <= 6
                    ) {
                        setAdjusting(handle);
                        startMousePosRef.current = hitTex;
                        startPlaceRef.current = { ...place, b: place.y + place.h - 1, r: place.x + place.w - 1 };
                        return;
                    }
                }

                // inside the place
                if (hitTex.x > place.x - x && hitTex.x < place.x + place.w - x &&
                    hitTex.y > place.y - y && hitTex.y < place.y + place.h - y) {
                    setAdjusting('move');
                    startMousePosRef.current = hitTex;
                    startPosRef.current = { x: place.x, y: place.y };
                    return;
                }
            }
        }
        setDragging(true);
        startMousePosRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { x, y };
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        // drag view
        if (dragging) {
            const dMousePos = { x: e.clientX - startMousePosRef.current.x, y: e.clientY - startMousePosRef.current.y };
            setUIXY(startPosRef.current.x - dMousePos.x / 1, startPosRef.current.y - dMousePos.y / 1);
        }

        if (!selectedInfo) return;
        const { url, iPlace, place } = selectedInfo;
        const hitTex = getHit({ x: e.clientX, y: e.clientY });
        if (!hitTex) return;

        // move
        if (adjusting === 'move') {
            let newX = startPosRef.current.x + hitTex.x - startMousePosRef.current.x;
            let newY = startPosRef.current.y + hitTex.y - startMousePosRef.current.y;
            newX = Math.round(newX); newY = Math.round(newY);
            setPlace(url, iPlace, newX, newY, place.w, place.h);
        }
        // adjust handle
        else if (adjusting === 'tl') {
            const pivotX = place.x + place.w - 1;
            const pivotY = place.y + place.h - 1;
            let newX = Math.min(startPlaceRef.current.x + hitTex.x - startMousePosRef.current.x, pivotX - 12);
            let newY = Math.min(startPlaceRef.current.y + hitTex.y - startMousePosRef.current.y, pivotY - 12);
            newX = Math.round(newX); newY = Math.round(newY);
            setPlace(url, iPlace, newX, newY, pivotX - newX + 1, pivotY - newY + 1);
        }
        else if (adjusting === 'tr') {
            const pivotX = place.x;
            const pivotY = place.y + place.h - 1;
            let newX = Math.max(startPlaceRef.current.r + hitTex.x - startMousePosRef.current.x, pivotX + 12);
            let newY = Math.min(startPlaceRef.current.y + hitTex.y - startMousePosRef.current.y, pivotY - 12);
            newX = Math.round(newX); newY = Math.round(newY);
            setPlace(url, iPlace, pivotX, newY, newX - pivotX + 1, pivotY - newY + 1);
        }
        else if (adjusting === 'br') {
            const pivotX = place.x;
            const pivotY = place.y;
            let newX = Math.max(startPlaceRef.current.r + hitTex.x - startMousePosRef.current.x, pivotX + 12);
            let newY = Math.max(startPlaceRef.current.b + hitTex.y - startMousePosRef.current.y, pivotY + 12);
            newX = Math.round(newX); newY = Math.round(newY);
            setPlace(url, iPlace, pivotX, pivotY, newX - pivotX + 1, newY - pivotY + 1);
        }
        else if (adjusting === 'bl') {
            const pivotX = place.x + place.w - 1;
            const pivotY = place.y;
            let newX = Math.min(startPlaceRef.current.x + hitTex.x - startMousePosRef.current.x, pivotX - 12);
            let newY = Math.max(startPlaceRef.current.b + hitTex.y - startMousePosRef.current.y, pivotY + 12);
            newX = Math.round(newX); newY = Math.round(newY);
            setPlace(url, iPlace, newX, pivotY, pivotX - newX + 1, newY - pivotY + 1);
        }
    }

    React.useEffect(() => {
        const handleMouseUp = () => {
            setDragging(false);
            setAdjusting(undefined);
        }
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, []);

    return (
        <div
            style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
        >
            {!rls && <>
                <div style={{
                    position: 'absolute', width: '12px', height: '12px', border: '2px solid green',
                    opacity: handlesOnUI.tl ? 1 : 0,
                    top: (handlesOnUI.tl?.y || 0) - 6,
                    left: (handlesOnUI.tl?.x || 0) - 6,
                }} />
                <div style={{
                    position: 'absolute', width: '12px', height: '12px', border: '2px solid green',
                    opacity: handlesOnUI.tr ? 1 : 0,
                    top: (handlesOnUI.tr?.y || 0) - 6,
                    left: (handlesOnUI.tr?.x || 0) - 6,
                }} />
                <div style={{
                    position: 'absolute', width: '12px', height: '12px', border: '2px solid green',
                    opacity: handlesOnUI.br ? 1 : 0,
                    top: (handlesOnUI.br?.y || 0) - 6,
                    left: (handlesOnUI.br?.x || 0) - 6,
                }} />
                <div style={{
                    position: 'absolute', width: '12px', height: '12px', border: '2px solid green',
                    opacity: handlesOnUI.bl ? 1 : 0,
                    top: (handlesOnUI.bl?.y || 0) - 6,
                    left: (handlesOnUI.bl?.x || 0) - 6,
                }} />
            </>}
        </div>
    )
}
