import { create } from 'zustand'
import { persist, type StateStorage, createJSONStorage } from 'zustand/middleware'
import { CANVAS_SIZE } from './CanvasTexture';


export type Place = {
    x: number;
    y: number;
    w: number;
    h: number;  // 图片在画布上的位置和大小
}

type DataStore = {
    urls: string[];
    places: Place[][];
    rls: boolean;  // release
}

const hashStorage: StateStorage = {
    getItem: (key): string => {
        const searchParams = new URLSearchParams(location.hash.slice(1))
        const storedValue = searchParams.get(key) ?? ''
        const json = decompressDataStore(storedValue);
        return json;
    },
    setItem: (): void => {
        // const searchParams = new URLSearchParams(location.hash.slice(1))
        // searchParams.set(key, newValue)
        // location.hash = searchParams.toString()
    },
    removeItem: (): void => {
        // const searchParams = new URLSearchParams(location.hash.slice(1))
        // searchParams.delete(key)
        // location.hash = searchParams.toString()
    },
}

export const useDataStore = create(
    persist<DataStore>(
        () => ({
            urls: [],
            places: [],
            rls: false,
        }),
        {
            name: 'data',
            storage: createJSONStorage(() => hashStorage),
        },
    ),
)


function compressDataStore(s: DataStore): string {
    const prefixs: string[] = [];
    const names: string[] = [];

    s.urls.forEach(url => {
        const i = url.lastIndexOf('/');
        if (i < 0) {
            prefixs.push('')
            names.push(url)
        }
        else {
            prefixs.push(url.slice(0, i + 1))
            names.push(url.slice(i + 1))
        }
    })

    let prefix = '';
    let urls: string[] = s.urls;
    if (prefixs.length > 0 && prefixs.every(p => p === prefixs[0])) {
        prefix = prefixs[0];
        urls = names;
    }

    // [rlt(1/0), url, x, y, w, h, ..., url, x, y, w, h, ...]
    const _s: (string | number)[] = [(s.rls ? 1 : 0), prefix];
    urls.forEach((url, iUrl) => {
        _s.push(url);
        const places = s.places[iUrl];
        if (!places) return;
        places.forEach(place => {
            _s.push(place.x);
            _s.push(place.y);
            _s.push(place.w);
            _s.push(place.h);
        });
    });

    return JSON.stringify({ s: _s });
}

function decompressDataStore(json: string): string {
    const s = JSON.parse(json)['s'] as (string | number)[];
    const rls = s[0] === 1;
    const prefix = s[1] as string;
    const urls: string[] = [];
    const places: Place[][] = [];
    let i = 2;
    while (i < s.length) {
        if (typeof s[i] === 'string') {
            urls.push(prefix + s[i] as string);
            places.push([]);
            i++;
        }
        else {
            places[places.length - 1].push({
                x: s[i] as number,
                y: s[i + 1] as number,
                w: s[i + 2] as number,
                h: s[i + 3] as number,
            })
            i += 4;
        }
    }
    const state: DataStore = { rls, urls, places };
    return JSON.stringify({ state });
}

export const saveDataStore = (rls = false) => {
    const state = useDataStore.getState();
    state.rls = rls;

    const json = compressDataStore(state);
    console.log(json);

    const searchParams = new URLSearchParams(location.hash.slice(1))
    searchParams.set('data', json);
    const uri = searchParams.toString();
    location.hash = uri;
}

export const setUrl = (url: string, replace?: string) => {
    const urls = useDataStore.getState().urls;
    // Add new URL
    if (replace === undefined || !urls.includes(replace)) {
        useDataStore.setState((state) => ({
            urls: [...state.urls, url],
            places: [...state.places, []],
        }));
    }
    // Replace existing URL
    else {
        useDataStore.setState((state) => {
            const i = state.urls.indexOf(replace);
            return { urls: [...state.urls.slice(0, i), url, ...state.urls.slice(i + 1)] };
        });
    }
}

export const addPlace = (url: string, w: number, h: number) => {
    const x = useUIStore.getState().x;
    const y = useUIStore.getState().y;
    useDataStore.setState((state) => {
        const i = state.urls.indexOf(url);
        if (i < 0) return state;
        const newPlaces = [...state.places];
        if (!newPlaces[i]) {
            newPlaces[i] = [];
        }
        newPlaces[i] = [...newPlaces[i], {
            x: Math.round(x - w / 2 + CANVAS_SIZE / 2),
            y: Math.round(y - h / 2 + CANVAS_SIZE / 2),
            w, h
        }];
        return { places: newPlaces }
    });
}

export const delPlace = (url: string, iPlace: number) => {
    useDataStore.setState((state) => {
        const i = state.urls.indexOf(url);
        if (i < 0 || i >= state.places.length || iPlace < 0 || iPlace >= state.places[i].length) return state;
        const newPlaces = [...state.places];
        newPlaces[i].splice(iPlace, 1);
        return { places: newPlaces }
    });
}

export const setPlace = (url: string, iPlace: number, x: number, y: number, w: number, h: number) => {
    useDataStore.setState((state) => {
        const i = state.urls.indexOf(url);
        if (i < 0 || i >= state.places.length || iPlace < 0 || iPlace >= state.places[i].length) return state;
        const newPlaces = [...state.places];
        newPlaces[i][iPlace] = { x, y, w, h };
        return structuredClone({ places: newPlaces })
    });
}


// =============== UIStore ===============

export type UIStore = {
    x: number;
    y: number;
    selected: { url: string, iPlace: number } | undefined;
}

export const useUIStore = create<UIStore>(() => ({
    x: 0,
    y: 0,
    selected: { url: '', iPlace: -1 },
}));

export const setUIXY = (x: number, y: number) => {
    useUIStore.setState({ x, y });
}

export const setUISelected = (url: string, iPlace: number) => {
    useUIStore.setState({ selected: { url, iPlace } });
}

export const clearUISelected = () => {
    useUIStore.setState({ selected: undefined });
}


// =============== UTILS ===============

export const useSelectedPlace = () => {
    const selected = useUIStore((state) => state.selected);
    const urls = useDataStore((state) => state.urls);
    const places = useDataStore((state) => state.places);

    if (!selected) return undefined;

    const { url, iPlace } = selected;
    const iUrl = urls.indexOf(url);
    if (iUrl < 0 || iPlace < 0 || !places[iUrl]) return undefined;

    return {
        iUrl,
        url: urls[iUrl],
        iPlace,
        place: places[iUrl][iPlace],
    };
}

export const getHitPlace = (x: number, y: number): { url: string, iPlace: number } | undefined => {
    const urls = useDataStore.getState().urls;
    const places = useDataStore.getState().places;

    for (let iUrl = urls.length - 1; iUrl >= 0; iUrl--) {
        const url = urls[iUrl];
        const placeList = places[iUrl];
        if (!placeList) continue;

        for (let iPlace = placeList.length - 1; iPlace >= 0; iPlace--) {
            const place = placeList[iPlace];
            if (x >= place.x && x <= place.x + place.w &&
                y >= place.y && y <= place.y + place.h) {
                return { url, iPlace };
            }
        }
    }
    return undefined;
}
