import pool from '../config/database';

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

export class ExtractedFileModel {
  static async create(fileData: CreateExtractedFileData): Promise<ExtractedFile> {
    const { project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory } = fileData;
    
    const result = await pool.query(
      'INSERT INTO extracted_files (project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory]
    );
    
    return result.rows[0];
  }

  static async findByProjectId(projectId: number, limit: number = 50, offset: number = 0): Promise<ExtractedFile[]> {
    const result = await pool.query(
      'SELECT * FROM extracted_files WHERE project_id = $1 ORDER BY is_directory DESC, file_name ASC LIMIT $2 OFFSET $3',
      [projectId, limit, offset]
    );
    
    return result.rows;
  }

  static async findByProjectIdAndDirectory(projectId: number, parentDirectory: string, limit: number = 50, offset: number = 0): Promise<ExtractedFile[]> {
    const result = await pool.query(
      'SELECT * FROM extracted_files WHERE project_id = $1 AND parent_directory = $2 ORDER BY is_directory DESC, file_name ASC LIMIT $3 OFFSET $4',
      [projectId, parentDirectory, limit, offset]
    );
    
    return result.rows;
  }

  static async findById(id: number): Promise<ExtractedFile | null> {
    const result = await pool.query(
      'SELECT * FROM extracted_files WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async countByProjectId(projectId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM extracted_files WHERE project_id = $1',
      [projectId]
    );
    
    return parseInt(result.rows[0].count);
  }

  static async deleteByProjectId(projectId: number): Promise<void> {
    await pool.query(
      'DELETE FROM extracted_files WHERE project_id = $1',
      [projectId]
    );
  }

  static async getDirectoriesByProjectId(projectId: number): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT parent_directory FROM extracted_files WHERE project_id = $1 AND parent_directory IS NOT NULL ORDER BY parent_directory',
      [projectId]
    );
    
    return result.rows.map(row => row.parent_directory);
  }

  static async findByProjectIdAndPath(projectId: number, filePath: string): Promise<ExtractedFile | null> {
    const result = await pool.query(
      'SELECT * FROM extracted_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );
    
    return result.rows[0] || null;
  }
}
