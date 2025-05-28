import * as THREE from 'three';
import * as React from 'react';

export type XY = { x: number, y: number };


export function UI2Plane(
    mousePos: XY,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
): XY {
    // 1. to NDC
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((mousePos.x - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((mousePos.y - rect.top) / rect.height) * 2 + 1;

    // 2. Raycaster
    const mouse = new THREE.Vector2(ndcX, ndcY);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 3. plane z=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    // 4. x,y ∈ [-0.5, 0.5]
    return { x: intersection.x, y: intersection.y };
}

export function world2UI(
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
): { x: number, y: number } {
    const ndc = worldPos.clone().project(camera); // x,y ∈ [-1,1]

    const x = ((ndc.x + 1) / 2) * canvas.width;
    const y = ((-ndc.y + 1) / 2) * canvas.height; // y inverted
    return { x, y };
}

export function plane2tex(pos: XY, center: XY, size: number) {
    const range = size / (Math.PI / 2);
    const r = 0.5;
    const rouLength = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    if (rouLength > r) return;

    const arcLength = Math.asin(rouLength / r) * r;
    const strechedPos = {
        x: (pos.x / rouLength) * arcLength,
        y: (pos.y / rouLength) * arcLength
    };
    return {
        x: center.x + strechedPos.x * range,
        y: size - (center.y + strechedPos.y * range)
    };
}

export function tex2Plane(pos: XY, center: XY, size: number) {
    const range = size / (Math.PI / 2);
    const r = 0.5;
    const strechedPos = {
        x: (pos.x - center.x) / range,
        y: (size - pos.y - center.y) / range
    };
    const arcLength = Math.sqrt(strechedPos.x * strechedPos.x + strechedPos.y * strechedPos.y);
    const rad = arcLength / r;
    if (rad > Math.PI / 2) return;
    const rouLength = Math.sin(rad) * r;

    return {
        x: (strechedPos.x / arcLength) * rouLength,
        y: (strechedPos.y / arcLength) * rouLength
    };
}


export function useFrameRunner({ handler }: {
    handler: () => void;
}) {
    const statusRef = React.useRef<'' | 'running' | 'pending'>('');

    const request = React.useCallback(() => {
        if (statusRef.current !== '') {
            statusRef.current = 'pending';
            return;
        }
        statusRef.current = 'running';
        const runner = () => {
            handler();
            if (statusRef.current === 'running') {
                statusRef.current = '';
            }
            else if (statusRef.current === 'pending') {
                statusRef.current = 'running';
                requestAnimationFrame(runner);
            }
        };
        requestAnimationFrame(runner);
    }, [handler]);

    return { request }
}
