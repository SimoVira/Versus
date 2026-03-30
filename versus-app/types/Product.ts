export type TechCategory = 
    | "smartphone"
    | "laptop"
    | "tablet"
    | "monitor"
    | "cpu"
    | "gpu"
    | "cuffie"
    | "smartwatch";

export interface Product {
    _id: string;
    name: string;
    brand: string;
    category: TechCategory;
    price: number;
    images: string[];
    specs: SmartphoneSpecs | LaptopSpecs | TabletSpecs | MonitorSpecs | Record<string, any>;
    score?: number;
}

// Specs specifiche per categoria
export interface SmartphoneSpecs {
    ram: string;
    storage: string;
    batteria: string;
    display: string;
    processore: string;
    fotocamera: string;
    os: string;
}

export interface LaptopSpecs {
    ram: string;
    storage: string;
    processore: string;
    display: string;
    gpu: string;
    batteria: string;
    os: string;
}

export interface TabletSpecs {
    ram: string;
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

export interface ApiResponse<T> {
    status: number;
    data?: T;
    err?: string;
}