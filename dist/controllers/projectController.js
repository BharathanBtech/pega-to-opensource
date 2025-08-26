"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.getExtractedFiles = exports.getProject = exports.getProjects = exports.uploadProject = void 0;
const Project_1 = require("../models/Project");
const ExtractedFile_1 = require("../models/ExtractedFile");
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadProject = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { name, description } = req.body;
        const userId = req.user.id;
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        // Create project record
        const project = await Project_1.ProjectModel.create({
            user_id: userId,
            name,
            description,
            original_filename: req.file.originalname,
            file_path: req.file.path,
            file_size: req.file.size
        });
        // Process the zip file asynchronously
        processZipFile(project.id, req.file.path);
        res.status(201).json({
            message: 'Project uploaded successfully',
            project: {
                id: project.id,
                name: project.name,
                status: project.status
            }
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.uploadProject = uploadProject;
const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const projects = await Project_1.ProjectModel.findByUserId(userId, limit, offset);
        const total = await Project_1.ProjectModel.countByUserId(userId);
        res.json({
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProjects = getProjects;
const getProject = async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user.id;
        const project = await Project_1.ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ project });
    }
    catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProject = getProject;
const getExtractedFiles = async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const directory = req.query.directory;
        // Verify project ownership
        const project = await Project_1.ProjectModel.findById(projectId);
        if (!project || project.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        let files;
        if (directory) {
            files = await ExtractedFile_1.ExtractedFileModel.findByProjectIdAndDirectory(projectId, directory, limit, offset);
        }
        else {
            files = await ExtractedFile_1.ExtractedFileModel.findByProjectId(projectId, limit, offset);
        }
        const total = await ExtractedFile_1.ExtractedFileModel.countByProjectId(projectId);
        res.json({
            files,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get extracted files error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getExtractedFiles = getExtractedFiles;
const deleteProject = async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user.id;
        const project = await Project_1.ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Delete extracted files
        await ExtractedFile_1.ExtractedFileModel.deleteByProjectId(projectId);
        // Delete project
        await Project_1.ProjectModel.delete(projectId);
        // Delete file from filesystem
        if (fs_1.default.existsSync(project.file_path)) {
            fs_1.default.unlinkSync(project.file_path);
        }
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProject = deleteProject;
async function processZipFile(projectId, filePath) {
    try {
        // Update project status to processing
        await Project_1.ProjectModel.updateStatus(projectId, 'processing');
        const zip = new adm_zip_1.default(filePath);
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                const entryPath = entry.entryName;
                const fileName = path_1.default.basename(entryPath);
                const parentDir = path_1.default.dirname(entryPath) === '.' ? null : path_1.default.dirname(entryPath);
                const fileType = path_1.default.extname(fileName);
                // Get content preview for text files
                let contentPreview = undefined;
                if (['.txt', '.xml', '.json', '.js', '.ts', '.html', '.css', '.java', '.py'].includes(fileType.toLowerCase())) {
                    try {
                        const content = entry.getData().toString('utf8');
                        contentPreview = content.substring(0, 500); // First 500 characters
                    }
                    catch (error) {
                        // Skip content preview for binary files
                    }
                }
                await ExtractedFile_1.ExtractedFileModel.create({
                    project_id: projectId,
                    file_path: entryPath,
                    file_name: fileName,
                    file_type: fileType,
                    file_size: entry.header.size,
                    content_preview: contentPreview,
                    is_directory: false,
                    parent_directory: parentDir || undefined
                });
            }
            else {
                // Handle directories
                const dirPath = entry.entryName.replace(/\/$/, ''); // Remove trailing slash
                if (dirPath) {
                    await ExtractedFile_1.ExtractedFileModel.create({
                        project_id: projectId,
                        file_path: dirPath,
                        file_name: path_1.default.basename(dirPath),
                        file_type: undefined,
                        file_size: undefined,
                        content_preview: undefined,
                        is_directory: true,
                        parent_directory: path_1.default.dirname(dirPath) === '.' ? undefined : path_1.default.dirname(dirPath)
                    });
                }
            }
        }
        // Update project status to completed
        await Project_1.ProjectModel.updateStatus(projectId, 'completed');
    }
    catch (error) {
        console.error('Error processing zip file:', error);
        await Project_1.ProjectModel.updateStatus(projectId, 'failed');
    }
}
//# sourceMappingURL=projectController.js.map