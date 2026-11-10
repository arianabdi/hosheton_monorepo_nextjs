// src/app/projects/types.ts

export type WorkspaceEnv = 'game' | 'media' | 'blog';

export interface Workspace {
    id: string;
    name: string;
    description: string;
    env: WorkspaceEnv;
    createdAt: string;
}