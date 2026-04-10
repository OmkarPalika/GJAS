import JURISDICTION_MANIFEST from './jurisdiction_manifest.json';

export interface CourtHierarchy {
    name: string;
    investigation: string | null;
    trial: string | null;
    appellate: string | null;
    sys: string;
    color: string;
    category: string;
    supreme: string;
    countryCode?: string;
    simulationWeight?: number;
    activeCaseCount?: number;
}

export type CountryCode = keyof typeof JURISDICTION_MANIFEST;

// Initial registry populated from centralized manifest
export const GLOBAL_COURT_REGISTRY: Record<string, CourtHierarchy> = { 
    ...JURISDICTION_MANIFEST as Record<string, CourtHierarchy> 
};

export let ALL_NATIONS: string[] = Object.keys(GLOBAL_COURT_REGISTRY);

export async function fetchRegistry(): Promise<Record<string, CourtHierarchy>> {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    try {
        const response = await fetch(`${API_URL}/api/registry`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Merge with existing registry (allowing DB to override constants)
        Object.assign(GLOBAL_COURT_REGISTRY, data);
        
        // Refresh Nation list while preserving array reference
        const updatedNations = Object.keys(GLOBAL_COURT_REGISTRY);
        ALL_NATIONS.length = 0;
        ALL_NATIONS.push(...updatedNations);
        
        console.log(`[Registry] Synchronized ${updatedNations.length} jurisdictions from DB.`);
        return GLOBAL_COURT_REGISTRY;
    } catch (err) {
        console.warn("[Registry] DB fetch failed, using internal manifest fallback:", err);
        return GLOBAL_COURT_REGISTRY;
    }
}
