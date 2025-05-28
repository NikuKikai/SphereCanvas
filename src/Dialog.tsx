import * as React from 'react';


export function Dialog({ open, children, onClose }: { open?: boolean, children?: React.ReactNode, onClose?: () => void }) {
    if (!open) return null;
    return (<>
        <div
            style={{
                // display: open ? 'block' : 'none',
                position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
            }}
            onClick={onClose}
        />
        <div style={{
            display: open ? 'block' : 'none',
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001,
        }}>
            {children}
        </div>
    </>)
}


export function URLDialog({ open, onClose, onOK }: { open?: boolean, onClose?: () => void, onOK?: (url: string) => void }) {
    const [text, setText] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!open) {
            setText('');
            return;
        }
        inputRef.current?.focus();
    }, [open]);

    const handleOK = () => {
        onOK?.(text);
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <div style={{ backgroundColor: '#222', padding: '0.5em 1em', borderRadius: '8px' }}>
                <h3 className='caption'>Enter Image URL</h3>
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ width: 'min(700px, 80vw)', padding: '4px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5em' }}>
                    <button
                        onClick={handleOK}
                        style={{ padding: '0.5em 2em', right: 0 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </Dialog>
    )
}
