import type { MediaWorkflowTemplate, WorkflowEdge, WorkflowNode } from '../../projects/types/media-api';

/** Resolve workflow graph for template preview (published snapshot when approved). */
export function resolveTemplateWorkflowGraph(template: MediaWorkflowTemplate): {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
} {
    const snapshot = template.publishedSnapshot;
    const usePublishedSnapshot =
        template.status === 'approved' &&
        template.visibility === 'public' &&
        !!snapshot;

    if (usePublishedSnapshot) {
        return {
            nodes: Array.isArray(snapshot.nodes) ? snapshot.nodes : [],
            edges: Array.isArray(snapshot.edges) ? snapshot.edges : [],
        };
    }

    return {
        nodes: Array.isArray(template.nodes) ? template.nodes : [],
        edges: Array.isArray(template.edges) ? template.edges : [],
    };
}

export function templateHasWorkflowGraph(template: MediaWorkflowTemplate): boolean {
    const { nodes } = resolveTemplateWorkflowGraph(template);
    return nodes.length > 0;
}
