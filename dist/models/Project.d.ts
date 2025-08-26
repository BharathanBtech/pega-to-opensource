export interface Project {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    created_at: Date;
    updated_at: Date;
}
export interface CreateProjectData {
    user_id: number;
    name: string;
    description?: string;
    original_filename: string;
    file_path: string;
    file_size: number;
}
export declare class ProjectModel {
    static create(projectData: CreateProjectData): Promise<Project>;
    static findById(id: number): Promise<Project | null>;
    static findByUserId(userId: number, limit?: number, offset?: number): Promise<Project[]>;
    static updateStatus(projectId: number, status: Project['status']): Promise<void>;
    static delete(projectId: number): Promise<void>;
    static countByUserId(userId: number): Promise<number>;
}
//# sourceMappingURL=Project.d.ts.map