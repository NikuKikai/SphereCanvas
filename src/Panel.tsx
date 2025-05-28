import * as React from 'react';
import ImagePanel from "./ImagePanel"
import { saveDataStore, setUIXY, useDataStore, useSelectedPlace, useUIStore } from "./store"
import { CANVAS_SIZE } from './CanvasTexture';
import { useFrameRunner } from './utils';


export function Panel() {
    const rls = useDataStore(s => s.rls);

    return (<div style={{
        width: '240px', minWidth: '240px',
        height: '100vh', minHeight: '100vh', maxHeight: '100vh',  //borderRight: '1px solid gray',
        padding: '4px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        flexWrap: 'nowrap', gap: '4px',
        overflow: 'hidden', userSelect: 'none',
    }}>

        {rls ? <DummyPanel /> : <ImagePanel />}
        {!rls && <InfoPanel />}
        <NaviPanel />
        <ButtonPanel />

    </div>)
}

function NaviPanel() {
    const x = useUIStore(s => s.x);
    const y = useUIStore(s => s.y);
    const placess = useDataStore(s => s.places);
    const canvasPlacessRef = React.useRef<HTMLCanvasElement>(null);
    const canvasViewRef = React.useRef<HTMLCanvasElement>(null);
    const drawPlacessRef = React.useRef<() => void>(null);
    const drawViewRef = React.useRef<() => void>(null);

    const bound = React.useMemo(() => {
        const places = placess.flat();
        if (places.length === 0) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

        const left = places.reduce((left, pls) => Math.min(left, pls.x), Infinity);
        const top = places.reduce((top, pls) => Math.min(top, pls.y), Infinity);
        const right = places.reduce((right, pls) => Math.max(right, pls.x + pls.w - 1), -Infinity);
        const bottom = places.reduce((bottom, pls) => Math.max(bottom, pls.y + pls.h - 1), -Infinity);
        const width = right - left + 1;
        const height = bottom - top + 1;

        return { left, top, right, bottom, width, height };
    }, [placess]);

    drawPlacessRef.current = React.useCallback(() => {
        if (!canvasPlacessRef.current) return;
        const canvas = canvasPlacessRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bound.width <= 0 || bound.height <= 0) return;
        const k = Math.min(canvas.width / bound.width, canvas.height / bound.height);

        const places = placess.flat();
        places.forEach(pls => {
            const x = (pls.x - bound.left) * k;
            const y = (pls.y - bound.top) * k;
            const w = Math.ceil(pls.w * k);
            const h = Math.ceil(pls.h * k);
            if (w <= 0 || h <= 0) return;

            ctx.fillStyle = '#666';
            ctx.fillRect(x, y, w, h);
        });
    }, [placess, bound]);

    drawViewRef.current = React.useCallback(() => {
        const canvas = canvasViewRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bound.width <= 0 || bound.height <= 0) return;
        const k = Math.min(canvas.width / bound.width, canvas.height / bound.height);

        let _x = (x + CANVAS_SIZE / 2 - bound.left) * k;
        let _y = (y + CANVAS_SIZE / 2 - bound.top) * k;
        if (_x < 0) _x = 0;
        if (_y < 0) _y = 0;
        if (_x > canvas.width) _x = canvas.width;
        if (_y > canvas.height) _y = canvas.height;
        const r = CANVAS_SIZE / 2 / (1.5) * k;

        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(_x, _y, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
    }, [x, y, bound]);

    const requestDrawPlacess = useFrameRunner({ handler: () => drawPlacessRef.current?.() });
    const requestDrawView = useFrameRunner({ handler: () => drawViewRef.current?.() });

    React.useLayoutEffect(() => {
        requestDrawPlacess.request();
    }, [bound]);

    React.useLayoutEffect(() => {
        requestDrawView.request();
    }, [x, y, bound]);


    return (
        <div style={{
            padding: '4px', boxSizing: 'border-box', userSelect: 'none',
            border: '0px dashed gray', borderRadius: '6px', backgroundColor: '#333',
            flex: '0 0 auto', height: '208px',
        }}>
            <canvas
                ref={canvasPlacessRef}
                width={222} height={200}
                style={{ position: 'absolute', backgroundColor: 'black', borderRadius: '4px' }}
            />
            <canvas
                ref={canvasViewRef}
                width={222} height={200}
                style={{ position: 'absolute', borderRadius: '4px' }}
            />
        </div>
    );
}

function InfoPanel() {
    const x = useUIStore(s => s.x);
    const y = useUIStore(s => s.y);
    const selectedInfo = useSelectedPlace();

    return (
        <div style={{
            padding: '8px 1em', boxSizing: 'border-box', userSelect: 'none',
            borderRadius: '6px', backgroundColor: '#333',
        }}>
            <span style={{ flex: '0 0 auto', marginRight: '1em', fontWeight: 'bold' }}>View:</span>
            <div style={{ display: 'flex', overflow: 'hidden', flexWrap: 'nowrap', paddingLeft: '1em' }}>
                <span style={{ flex: 1 }}>x= {x} </span>
                <span style={{ flex: 1 }}>y= {y} </span>
            </div>

            <span style={{ flex: '0 0 auto', marginRight: '1em', fontWeight: 'bold' }}>Selected:</span>
            <div style={{ display: 'flex', overflow: 'hidden', flexWrap: 'nowrap', paddingLeft: '1em' }}>
                <span style={{ flex: 1 }}>x= {selectedInfo?.place.x || 'NaN'} </span>
                <span style={{ flex: 1 }}>y= {selectedInfo?.place.y || 'NaN'} </span>
            </div>
            <div style={{ display: 'flex', overflow: 'hidden', flexWrap: 'nowrap', paddingLeft: '1em' }}>
                <span style={{ flex: 1 }}>w= {selectedInfo?.place.w || 'NaN'} </span>
                <span style={{ flex: 1 }}>h= {selectedInfo?.place.h || 'NaN'} </span>
            </div>
        </div>
    )
}

function ButtonPanel() {
    const handleSave = () => {
        saveDataStore();
        navigator.clipboard.writeText(location.href);
    }

    const handleExport = () => {
        saveDataStore(true);
        navigator.clipboard.writeText(location.href);
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '4px',
            height: '36px', padding: '2px 2px', boxSizing: 'border-box',
            borderRadius: '6px', backgroundColor: '#333',
        }}>
            <button
                className='icon-button'
                title='Reset view position'
                onClick={() => { setUIXY(0, 0) }}
            >
                <i>R</i>
            </button>
            <div style={{ flexGrow: 1 }} />
            <button
                className='icon-button'
                title='Save to address bar & clipboard'
                onClick={handleSave}
            >
                <i>S</i>
            </button>
            <button
                className='icon-button'
                title='Export no panel link to clipboard'
                onClick={handleExport}
            >
                <i>E</i>
            </button>
        </div>
    )
}

function DummyPanel() {
    return <div style={{ flex: 1 }}></div>
}