/**
 * simulation_sync.ts
 * Standardized utility for merging real-time WebSocket telemetry events 
 * into the simulation state.
 */

export interface SimulationEvent {
    event: string;
    caseId: string;
    status?: string;
    country?: string;
    nodeLevel?: string;
    verdict?: Record<string, unknown>;
    iccProceedings?: Record<string, unknown>;
    executiveReview?: Record<string, unknown>;
    globalAssembly?: Record<string, unknown>;
    timestamp: string;
}

export interface SimulationState {
    status?: string;
    pipelines?: Record<string, {
        nodes: Record<string, { status: string; verdict?: Record<string, unknown> }>;
        executiveReview?: Record<string, unknown>;
        [key: string]: unknown;
    }>;
    iccProceedings?: Record<string, unknown>;
    globalAssembly?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Merges a granular simulation event into the existing case state.
 * This ensures consistency across the Map, Laboratory, and Chamber views.
 */
export function applySimulationEvent(prevState: SimulationState | null, data: SimulationEvent): SimulationState | null {
    if (!prevState) return prevState;
    const updated: SimulationState = { ...prevState };

    // Update top-level status if provided
    if (data.status) updated.status = data.status;

    switch (data.event) {
        case 'NODE_COMPLETE':
            if (data.country && data.nodeLevel && updated.pipelines?.[data.country]) {
                const pipeline = updated.pipelines[data.country];
                pipeline.nodes[data.nodeLevel].status = 'complete';
                if (data.verdict) {
                    pipeline.nodes[data.nodeLevel].verdict = data.verdict;
                }
            }
            break;

        case 'ICC_ESCALATION':
            if (data.globalAssembly) updated.globalAssembly = data.globalAssembly;
            updated.iccProceedings = { status: 'pending' };
            break;

        case 'ICC_COMPLETE':
            if (data.iccProceedings) {
                updated.iccProceedings = { 
                    ...updated.iccProceedings, 
                    ...data.iccProceedings 
                };
            }
            break;

        case 'EXECUTIVE_REVIEW_START':
            if (data.globalAssembly) updated.globalAssembly = data.globalAssembly;
            break;

        case 'EXECUTIVE_REVIEW_COMPLETE':
            if (data.country && data.executiveReview && updated.pipelines?.[data.country]) {
                const pipeline = updated.pipelines[data.country];
                pipeline.executiveReview = { 
                    ...pipeline.executiveReview, 
                    ...data.executiveReview 
                };
            }
            break;

        case 'PHASE_TRANSITION':
        case 'GLOBAL_ASSEMBLY_START':
            if (data.globalAssembly) {
                updated.globalAssembly = {
                    ...updated.globalAssembly,
                    ...data.globalAssembly
                };
            }
            break;

        case 'CASE_COMPLETE':
            updated.status = 'complete';
            if (data.iccProceedings) {
                updated.iccProceedings = { 
                    ...updated.iccProceedings, 
                    ...data.iccProceedings 
                };
            }
            if (data.globalAssembly) {
                updated.globalAssembly = {
                    ...updated.globalAssembly,
                    ...data.globalAssembly
                };
            }
            break;
    }

    return updated;
}
