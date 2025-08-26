"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractedFileModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class ExtractedFileModel {
    static async create(fileData) {
        const { project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory } = fileData;
        const result = await database_1.default.query('INSERT INTO extracted_files (project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [project_id, file_path, file_name, file_type, file_size, content_preview, is_directory, parent_directory]);
        return result.rows[0];
    }
    static async findByProjectId(projectId, limit = 50, offset = 0) {
        const result = await database_1.default.query('SELECT * FROM extracted_files WHERE project_id = $1 ORDER BY is_directory DESC, file_name ASC LIMIT $2 OFFSET $3', [projectId, limit, offset]);
        return result.rows;
    }
    static async findByProjectIdAndDirectory(projectId, parentDirectory, limit = 50, offset = 0) {
        const result = await database_1.default.query('SELECT * FROM extracted_files WHERE project_id = $1 AND parent_directory = $2 ORDER BY is_directory DESC, file_name ASC LIMIT $3 OFFSET $4', [projectId, parentDirectory, limit, offset]);
        return result.rows;
    }
    static async findById(id) {
        const result = await database_1.default.query('SELECT * FROM extracted_files WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async countByProjectId(projectId) {
        const result = await database_1.default.query('SELECT COUNT(*) FROM extracted_files WHERE project_id = $1', [projectId]);
        return parseInt(result.rows[0].count);
    }
    static async deleteByProjectId(projectId) {
        await database_1.default.query('DELETE FROM extracted_files WHERE project_id = $1', [projectId]);
    }
    static async getDirectoriesByProjectId(projectId) {
        const result = await database_1.default.query('SELECT DISTINCT parent_directory FROM extracted_files WHERE project_id = $1 AND parent_directory IS NOT NULL ORDER BY parent_directory', [projectId]);
        return result.rows.map(row => row.parent_directory);
    }
    static async findByProjectIdAndPath(projectId, filePath) {
        const result = await database_1.default.query('SELECT * FROM extracted_files WHERE project_id = $1 AND file_path = $2', [projectId, filePath]);
        return result.rows[0] || null;
    }
    static async findAllByProjectId(projectId) {
        const result = await database_1.default.query('SELECT * FROM extracted_files WHERE project_id = $1 ORDER BY file_path', [projectId]);
        return result.rows;
    }
}
exports.ExtractedFileModel = ExtractedFileModel;
//# sourceMappingURL=ExtractedFile.js.map