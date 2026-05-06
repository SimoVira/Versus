export type TechCategory =
    | "smartphone"
    | "laptop"
    | "tablet"
    | "monitor"
    | "cpu"
    | "gpu"
    | "cuffie"
    | "smartwatch";

export interface PriceHistory {
    price: number;
    date: string;
    source: string;
}

// Specs per categoria - campo libero ma tipizzato
export interface SmartphoneSpecs {
    RAM: string;
    storage: string;
    batteria: string;
    display: string;
    processore: string;
    fotocamera: string;
    os: string;
}

export interface LaptopSpecs {
    RAM: string;
    storage: string;
    processore: string;
    display: string;
    gpu: string;
    batteria: string;
    os: string;
}

export interface TabletSpecs {
    RAM: string;
    storage: string;
    display: string;
    batteria: string;
    processore: string;
    os: string;
}

export interface MonitorSpecs {
    dimensione: string;
    risoluzione: string;
    refreshRate: string;
    pannello: string;
    connessioni: string[];
}

export interface CpuSpecs {
    core: string;
    thread: string;
    frequenza: string;
    socket: string;
    tdp: string;
}

export interface GpuSpecs {
    vram: string;
    frequenza: string;
    connessioni: string[];
    tdp: string;
}

export interface CuffieSpecs {
    tipo: string;           // over-ear, in-ear, on-ear
    connessione: string;    // bluetooth, jack, usb-c
    autonomia: string;
    noiseCancelling: boolean;
}

export interface SmartwatchSpecs {
    display: string;
    autonomia: string;
    os: string;
    gps: boolean;
    waterResistance: string;
}

// Unione di tutte le specs possibili
export type ProductSpecs =
    | SmartphoneSpecs
    | LaptopSpecs
    | TabletSpecs
    | MonitorSpecs
    | CpuSpecs
    | GpuSpecs
    | CuffieSpecs
    | SmartwatchSpecs
    | Record<string, any>; // fallback per categorie future

// Modello principale - rispecchia il documento MongoDB
export interface Product {
    _id: string;
    name: string;
    brand: string;
    category: TechCategory;
    price: number;
    lastUpdated: string;
    images: string[];
    priceHistory: PriceHistory[];
    specs: ProductSpecs;
    searchQuery: string;
}


export interface GeminiAnalysis {
    score1: number;
    score2: number;
    pros1: string[];
    pros2: string[];
    cons1: string[];
    cons2: string[];
    winner: 1 | 2;
    verdict: string;
}

// Risposta specifica per /compare
export interface CompareResponse {
    products: [Product, Product];
    geminiAnalysis: GeminiAnalysis;
}

export interface PriceRefreshResponse {
    price: number;
    source: string;
}
