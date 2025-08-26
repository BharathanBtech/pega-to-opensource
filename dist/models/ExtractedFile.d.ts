export interface ExtractedFile {
    id: number;
    project_id: number;
    file_path: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
    content_preview?: string;
    is_directory: boolean;
    parent_directory?: string;
    created_at: Date;
}
export interface CreateExtractedFileData {
    project_id: number;
    file_path: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
    content_preview?: string;
    is_directory: boolean;
    parent_directory?: string;
}
export declare class ExtractedFileModel {
    static create(fileData: CreateExtractedFileData): Promise<ExtractedFile>;
    static findByProjectId(projectId: number, limit?: number, offset?: number): Promise<ExtractedFile[]>;
    static findByProjectIdAndDirectory(projectId: number, parentDirectory: string, limit?: number, offset?: number): Promise<ExtractedFile[]>;
    static findById(id: number): Promise<ExtractedFile | null>;
    static countByProjectId(projectId: number): Promise<number>;
    static deleteByProjectId(projectId: number): Promise<void>;
    static getDirectoriesByProjectId(projectId: number): Promise<string[]>;
}
//# sourceMappingURL=ExtractedFile.d.ts.map