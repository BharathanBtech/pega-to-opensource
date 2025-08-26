import { Request, Response } from 'express';
import { ProjectModel } from '../models/Project';
import { ExtractedFileModel } from '../models/ExtractedFile';
import pool from '../config/database';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

interface AuthRequest extends Request {
  user?: any;
}

export const uploadProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('Creating project record:', { name, description, userId, filename: req.file.originalname });

    // Create project record
    const project = await ProjectModel.create({
      user_id: userId,
      name,
      description,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size
    });

    console.log('Project created with ID:', project.id);

    // Process the zip file asynchronously
    processZipFile(project.id, req.file.path).catch(error => {
      console.error('Error in async zip processing:', error);
    });

    res.status(201).json({
      message: 'Project uploaded successfully',
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    console.log('Getting projects for user:', userId);

    const projects = await ProjectModel.findByUserId(userId, limit, offset);
    const total = await ProjectModel.countByUserId(userId);

    console.log('Found projects:', projects.length, 'Total:', total);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExtractedFiles = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const directory = req.query.directory as string;

    // Verify project ownership
    const project = await ProjectModel.findById(projectId);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let files;
    if (directory) {
      files = await ExtractedFileModel.findByProjectIdAndDirectory(projectId, directory, limit, offset);
    } else {
      files = await ExtractedFileModel.findByProjectId(projectId, limit, offset);
    }

    const total = await ExtractedFileModel.countByProjectId(projectId);

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get extracted files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const debugProjects = async (req: AuthRequest, res: Response) => {
  try {
    // Get all projects for debugging
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    console.log('All projects in database:', result.rows);
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Debug projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;

    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete extracted files
    await ExtractedFileModel.deleteByProjectId(projectId);

    // Delete project
    await ProjectModel.delete(projectId);

    // Delete file from filesystem
    if (fs.existsSync(project.file_path)) {
      fs.unlinkSync(project.file_path);
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFileContent = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const filePath = req.params.filePath;
    const userId = req.user.id;

    // Verify project ownership
    const project = await ProjectModel.findById(projectId);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file from database
    const file = await ExtractedFileModel.findByProjectIdAndPath(projectId, filePath);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file has content preview
    if (file.content_preview) {
      res.json({
        content: file.content_preview,
        fileName: file.file_name,
        fileType: file.file_type,
        truncated: file.content_preview.length >= 500
      });
    } else {
      res.json({
        content: 'This file does not have a text preview available.',
        fileName: file.file_name,
        fileType: file.file_type,
        truncated: false
      });
    }
  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function processZipFile(projectId: number, filePath: string) {
  try {
    console.log(`Starting to process zip file for project ${projectId}:`, filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`ZIP file not found: ${filePath}`);
    }
    
    // Update project status to processing
    await ProjectModel.updateStatus(projectId, 'processing');
    console.log(`Updated project ${projectId} status to processing`);

    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} entries in zip file`);

    let processedFiles = 0;
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const entryPath = entry.entryName;
        const fileName = path.basename(entryPath);
        const parentDir = path.dirname(entryPath) === '.' ? null : path.dirname(entryPath);
        const fileType = path.extname(fileName);
        
        // Check if this is a JAR file
        if (fileType.toLowerCase() === '.jar') {
          console.log(`Processing JAR file: ${entryPath}`);
          try {
            // Extract JAR contents
            const jarBuffer = entry.getData();
            const jarZip = new AdmZip(jarBuffer);
            const jarEntries = jarZip.getEntries();
            
            console.log(`Found ${jarEntries.length} entries in JAR file ${fileName}`);
            
            // Process JAR contents
            for (const jarEntry of jarEntries) {
              if (!jarEntry.isDirectory) {
                const jarEntryPath = `${entryPath}/${jarEntry.entryName}`;
                const jarFileName = path.basename(jarEntry.entryName);
                const jarParentDir = path.dirname(jarEntry.entryName) === '.' ? entryPath : `${entryPath}/${path.dirname(jarEntry.entryName)}`;
                const jarFileType = path.extname(jarFileName);
                
                // Get content preview for text files
                let contentPreview: string | undefined = undefined;
                if (['.txt', '.xml', '.json', '.js', '.ts', '.html', '.css', '.java', '.py', '.properties'].includes(jarFileType.toLowerCase())) {
                  try {
                    const content = jarEntry.getData().toString('utf8');
                    contentPreview = content.substring(0, 500); // First 500 characters
                  } catch (error) {
                    // Skip content preview for binary files
                  }
                }

                try {
                  await ExtractedFileModel.create({
                    project_id: projectId,
                    file_path: jarEntryPath,
                    file_name: jarFileName,
                    file_type: jarFileType,
                    file_size: jarEntry.header.size,
                    content_preview: contentPreview,
                    is_directory: false,
                    parent_directory: jarParentDir
                  });
                  processedFiles++;
                } catch (dbError) {
                  console.error(`Error saving JAR file ${jarEntryPath}:`, dbError);
                  // Continue processing other files
                }
              } else {
                // Handle JAR directories
                const jarDirPath = jarEntry.entryName.replace(/\/$/, ''); // Remove trailing slash
                if (jarDirPath) {
                  const fullJarDirPath = `${entryPath}/${jarDirPath}`;
                  try {
                    await ExtractedFileModel.create({
                      project_id: projectId,
                      file_path: fullJarDirPath,
                      file_name: path.basename(jarDirPath),
                      file_type: undefined,
                      file_size: undefined,
                      content_preview: undefined,
                      is_directory: true,
                      parent_directory: path.dirname(jarDirPath) === '.' ? entryPath : `${entryPath}/${path.dirname(jarDirPath)}`
                    });
                    processedFiles++;
                  } catch (dbError) {
                    console.error(`Error saving JAR directory ${fullJarDirPath}:`, dbError);
                    // Continue processing other files
                  }
                }
              }
            }
          } catch (jarError) {
            console.error(`Error processing JAR file ${entryPath}:`, jarError);
            // Continue with other files
          }
        } else {
          // Handle regular files (non-JAR)
          // Get content preview for text files
          let contentPreview: string | undefined = undefined;
          if (['.txt', '.xml', '.json', '.js', '.ts', '.html', '.css', '.java', '.py', '.properties'].includes(fileType.toLowerCase())) {
            try {
              const content = entry.getData().toString('utf8');
              contentPreview = content.substring(0, 500); // First 500 characters
            } catch (error) {
              // Skip content preview for binary files
            }
          }

          try {
            await ExtractedFileModel.create({
              project_id: projectId,
              file_path: entryPath,
              file_name: fileName,
              file_type: fileType,
              file_size: entry.header.size,
              content_preview: contentPreview,
              is_directory: false,
              parent_directory: parentDir || undefined
            });
            processedFiles++;
          } catch (dbError) {
            console.error(`Error saving file ${entryPath}:`, dbError);
            // Continue processing other files
          }
        }
      } else {
        // Handle directories
        const dirPath = entry.entryName.replace(/\/$/, ''); // Remove trailing slash
        if (dirPath) {
          try {
            await ExtractedFileModel.create({
              project_id: projectId,
              file_path: dirPath,
              file_name: path.basename(dirPath),
              file_type: undefined,
              file_size: undefined,
              content_preview: undefined,
              is_directory: true,
              parent_directory: path.dirname(dirPath) === '.' ? undefined : path.dirname(dirPath)
            });
            processedFiles++;
          } catch (dbError) {
            console.error(`Error saving directory ${dirPath}:`, dbError);
            // Continue processing other files
          }
        }
      }
    }

    // Update project status to completed
    await ProjectModel.updateStatus(projectId, 'completed');
    console.log(`Successfully completed processing project ${projectId}. Processed ${processedFiles} files/directories`);

  } catch (error) {
    console.error('Error processing zip file:', error);
    await ProjectModel.updateStatus(projectId, 'failed');
    console.log(`Marked project ${projectId} as failed`);
  }
}
