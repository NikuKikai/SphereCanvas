import * as React from 'react';
import { URLDialog } from "./Dialog";
import {
    useDataStore, useUIStore,
    addPlace, delPlace, setUrl,
    setUISelected, clearUISelected,
} from "./store";


export default function ImagePanel() {
    const urls = useDataStore((state) => state.urls);
    const [dialog, setDialog] = React.useState(false);
    const [dialogSrc, setDialogSrc] = React.useState<string>('');

    const handleAdd = () => {
        setDialog(true);
        setDialogSrc('');
    }

    const handleDialogOK = (url: string) => {
        if (!dialog) return;
        if (dialogSrc === '') {
            setUrl(url);
        }
        else {
            setUrl(url, dialogSrc);
        }
        setDialog(false);
    }

    return (<div style={{
        display: 'flex', flexDirection: 'column', flex: 1, flexWrap: 'nowrap',
        backgroundColor: '#333', padding: '4px', borderRadius: '6px',
        boxSizing: 'border-box', userSelect: 'none',
    }}>
        <div style={{ display: 'flex' }}>
            <h3 className='caption' style={{ paddingLeft: '4px' }}>
                Image List
            </h3>
            <button
                title='Add Image'
                onClick={handleAdd}
                style={{
                    marginLeft: 'auto', marginRight: '4px',
                    width: '34px', height: '28px', lineHeight: '14px',
                    padding: '0px',
                    backgroundColor: '#222',
                    color: 'white', cursor: 'pointer'
                }}
            >
                <i>+</i>
            </button>
        </div>
        <div style={{
            minHeight: 0,
            padding: '4px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', flex: 1,
            flexWrap: 'nowrap', justifyContent: 'flex-start', gap: '4px',
            overflowY: 'auto', overflowX: 'hidden',
            backgroundColor: 'black', borderRadius: '4px',
        }}>
            {/* <NewItem onClick={handleAdd} /> */}
            {urls.slice().reverse().map((url, idx) => (
                <ImageItem key={urls.length - 1 - idx} url={url} idx={urls.length - 1 - idx} />
            ))}
            <URLDialog
                open={dialog}
                onOK={handleDialogOK}
                onClose={() => { setDialog(false) }}
            />
        </div>
    </div>);
}


function ImageItem({ url, idx }: { url: string, idx: number }) {
    const selected = useUIStore((state) => state.selected);
    const place = useDataStore((state) => state.places[idx]);
    const imgRef = React.useRef<HTMLImageElement>(null);

    const handleAddPlace = () => {
        if (!imgRef.current || !url) return;
        const img = imgRef.current;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        // Place the image at the center of the view
        addPlace(url, w, h);
        setUISelected(url, place.length);
    }

    return (
        <div
            style={{
                padding: '0px', height: '10em',
                userSelect: 'none', display: 'flex', gap: '2px',
                border: '1px solid gray', backgroundColor: '#222',
            }}
            onClick={() => clearUISelected()}
        >
            <img ref={imgRef} src={url} alt={url} style={{
                height: '100%', flex: '1 1 0',
                objectFit: 'contain', pointerEvents: 'none',
                backgroundColor: 'black',
            }} />
            <div style={{
                height: '100%', width: '44px', padding: '3px',
                display: 'flex', flexDirection: 'column', gap: '3px',
                overflowX: 'hidden', overflowY: 'auto',
                boxSizing: 'border-box',
            }}>
                <div
                    className='place-item'
                    style={{ fontSize: '20px', lineHeight: '20px', color: 'gray', border: 'none' }}
                    onClick={handleAddPlace}
                >+</div>
                {place?.map((_p, i) => (
                    <PlaceItem
                        key={i} url={url} idx={i}
                        selected={selected?.url === url && selected.iPlace === i}
                    />
                ))}
            </div>
        </div>
    )
}

// function NewItem({ onClick }: { onClick?: () => void }) {

//     return (
//         <div
//             onClick={onClick}
//             style={{
//                 padding: '10px', height: '1em',
//                 border: '1px solid gray', color: 'gray',
//                 userSelect: 'none', cursor: 'pointer',
//                 display: 'flex', justifyContent: 'center', alignItems: 'center',
//                 backgroundColor: '#222',
//             }}
//         >
//             <p>Add Image</p>
//         </div>
//     )
// }

function PlaceItem({ url, idx, selected }: {
    url: string,
    idx: number,
    selected?: boolean,
}) {

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Left click -> select
        if (e.button === 0) {
            setUISelected(url, idx);
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        delPlace(url, idx);
        clearUISelected();
    }

    return (
        <div
            className='place-item'
            style={{
                borderColor: selected ? 'white' : '#666',
            }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {idx}
        </div>
    )
}
