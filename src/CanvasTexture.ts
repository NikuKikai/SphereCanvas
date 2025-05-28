import React from 'react'
import * as THREE from 'three';
import { useFrameRunner } from './utils';


export const CANVAS_SIZE = 2048;

export type ImagePlacement = {
    img: HTMLImageElement;
    x: number;
    y: number;
    w: number;
    h: number;
}

export type URLPlacement = {
    url: string;
    x: number;
    y: number;
    w: number;
    h: number;
}


export const useCanvasTexture = () => {
    const { tex, ctx } = React.useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return { tex, ctx };
    }, []);
    return { tex, ctx };
};

export const useTextureRender = ({ tex, ctx, x, y, urlPlaces }: {
    tex: THREE.CanvasTexture, ctx: CanvasRenderingContext2D,
    x: number, y: number, urlPlaces: URLPlacement[]
}) => {
    const localImgs = useLocalImages({ x, y, urlPlaces });
    const renderRef = React.useRef<() => void>(null);

    renderRef.current = React.useCallback(() => {
        // ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Redraw
        localImgs.forEach(({ img, x: _x, y: _y, w, h }) => {
            ctx.save();
            ctx.drawImage(img, _x - x, _y - y, w, h);
            ctx.restore();
        });

        tex.needsUpdate = true;
    }, [tex, ctx, x, y, localImgs]);

    const requestRender = useFrameRunner({ handler: () => renderRef.current?.() });
    React.useLayoutEffect(() => requestRender.request(), [tex, ctx, x, y, localImgs]);
}

async function url2image(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.crossOrigin = "anonymous";
        img.src = url;
    })
}


function useLocalImages({ x, y, urlPlaces }: { x: number, y: number, urlPlaces: URLPlacement[] }) {
    const [images, setImages] = React.useState<ImagePlacement[]>([]);
    const cacheRef = React.useRef<Record<string, HTMLImageElement>>({});

    React.useEffect(() => {
        const loadImages = async () => {
            const visibleIdxs = urlPlaces.flatMap(({ x: _x, y: _y, w, h }, idx) => {
                if (Math.min(_x + w, x + CANVAS_SIZE) <= Math.max(_x, x) ||
                    Math.min(_y + h, y + CANVAS_SIZE) <= Math.max(_y, y)) {
                    return [];
                }
                return [idx];
            });
            const loadedImages = await Promise.all(visibleIdxs.map(idx => {
                if (cacheRef.current[urlPlaces[idx].url]) {
                    return new Promise<HTMLImageElement>((resolve) => resolve(cacheRef.current[urlPlaces[idx].url]));
                }
                return url2image(urlPlaces[idx].url);
            }));
            cacheRef.current = {};
            visibleIdxs.forEach((idx, i) => {
                cacheRef.current[urlPlaces[idx].url] = loadedImages[i];
            });
            setImages(visibleIdxs.map((idx, i) => ({ ...urlPlaces[idx], img: loadedImages[i] })));
        };
        loadImages();
    }, [x, y, urlPlaces]);

    return images;
}

