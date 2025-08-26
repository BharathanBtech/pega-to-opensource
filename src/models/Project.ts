import pool from '../config/database';

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

export class ProjectModel {
  static async create(projectData: CreateProjectData): Promise<Project> {
    const { user_id, name, description, original_filename, file_path, file_size } = projectData;
    
    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description, original_filename, file_path, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, name, description, original_filename, file_path, file_size]
    );
    
    return result.rows[0];
  }

  static async findById(id: number): Promise<Project | null> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async findByUserId(userId: number, limit: number = 10, offset: number = 0): Promise<Project[]> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    return result.rows;
  }

  static async updateStatus(projectId: number, status: Project['status']): Promise<void> {
    await pool.query(
      'UPDATE projects SET status = $1 WHERE id = $2',
      [status, projectId]
    );
  }

  static async delete(projectId: number): Promise<void> {
    await pool.query(
      'DELETE FROM projects WHERE id = $1',
      [projectId]
    );
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE user_id = $1',
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }
}
