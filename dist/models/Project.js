"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class ProjectModel {
    static async create(projectData) {
        const { user_id, name, description, original_filename, file_path, file_size } = projectData;
        const result = await database_1.default.query('INSERT INTO projects (user_id, name, description, original_filename, file_path, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [user_id, name, description, original_filename, file_path, file_size]);
        return result.rows[0];
    }
    static async findById(id) {
        const result = await database_1.default.query('SELECT * FROM projects WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByUserId(userId, limit = 10, offset = 0) {
        const result = await database_1.default.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]);
        return result.rows;
    }
    static async updateStatus(projectId, status) {
        await database_1.default.query('UPDATE projects SET status = $1 WHERE id = $2', [status, projectId]);
    }
    static async delete(projectId) {
        await database_1.default.query('DELETE FROM projects WHERE id = $1', [projectId]);
    }
    static async countByUserId(userId) {
        const result = await database_1.default.query('SELECT COUNT(*) FROM projects WHERE user_id = $1', [userId]);
        return parseInt(result.rows[0].count);
    }
}
exports.ProjectModel = ProjectModel;
//# sourceMappingURL=Project.js.map