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

export const debugProjectFiles = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify project ownership
    const project = await ProjectModel.findById(projectId);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file count and sample files
    const countResult = await pool.query('SELECT COUNT(*) FROM extracted_files WHERE project_id = $1', [projectId]);
    const sampleFiles = await pool.query('SELECT file_path, file_name, file_type, is_directory FROM extracted_files WHERE project_id = $1 ORDER BY file_path LIMIT 20', [projectId]);
    
    res.json({ 
      projectId,
      totalFiles: parseInt(countResult.rows[0].count),
      sampleFiles: sampleFiles.rows
    });
  } catch (error) {
    console.error('Debug project files error:', error);
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

export const generateRequirements = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verify project ownership
    const project = await ProjectModel.findById(projectId);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all files for this project
    const allFiles = await ExtractedFileModel.findAllByProjectId(projectId);
    
    // Generate requirements document
    const requirements = await analyzeAndGenerateRequirements(project, allFiles);
    
    res.json({
      projectId,
      projectName: project.name,
      requirements,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate requirements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function analyzeAndGenerateRequirements(project: any, files: any[]): Promise<string> {
  const analysis = {
    applicationName: extractApplicationName(project, files),
    dataModels: extractDataModels(files),
    workflows: extractWorkflows(files),
    rules: extractRules(files),
    integrations: extractIntegrations(files),
    uiComponents: extractUIComponents(files),
    configurations: extractConfigurations(files)
  };

  return generateRequirementsDocument(analysis);
}

function extractApplicationName(project: any, files: any[]): string {
  // Try to extract from project name first
  let appName = project.name;
  
  // Look for application.xml or similar files
  const appFiles = files.filter(f => 
    f.file_name.toLowerCase().includes('application') && 
    f.file_type === '.xml'
  );
  
  if (appFiles.length > 0) {
    // Try to extract from content preview
    for (const file of appFiles) {
      if (file.content_preview) {
        const nameMatch = file.content_preview.match(/<Application[^>]*name="([^"]+)"/i);
        if (nameMatch) {
          appName = nameMatch[1];
          break;
        }
      }
    }
  }
  
  return appName || 'PegaApplication';
}

function extractDataModels(files: any[]): any[] {
  const dataModels = [];
  
  // Look for class definitions, data types, properties
  const classFiles = files.filter(f => 
    f.file_name.toLowerCase().includes('class') && 
    f.file_type === '.xml'
  );
  
  const propertyFiles = files.filter(f => 
    f.file_name.toLowerCase().includes('property') && 
    f.file_type === '.xml'
  );
  
  // Extract class information
  for (const file of classFiles) {
    if (file.content_preview) {
      const className = extractClassName(file.content_preview);
      const properties = extractProperties(file.content_preview);
      
      if (className) {
        dataModels.push({
          name: className,
          type: 'class',
          properties: properties,
          source: file.file_path
        });
      }
    }
  }
  
  return dataModels;
}

function extractWorkflows(files: any[]): any[] {
  const workflows = [];
  
  // Look for flow files, processes, activities
  const flowFiles = files.filter(f => 
    (f.file_name.toLowerCase().includes('flow') || 
     f.file_name.toLowerCase().includes('process') ||
     f.file_name.toLowerCase().includes('activity')) && 
    f.file_type === '.xml'
  );
  
  for (const file of flowFiles) {
    if (file.content_preview) {
      const flowName = extractFlowName(file.content_preview);
      const steps = extractFlowSteps(file.content_preview);
      
      if (flowName) {
        workflows.push({
          name: flowName,
          steps: steps,
          source: file.file_path
        });
      }
    }
  }
  
  return workflows;
}

function extractRules(files: any[]): any[] {
  const rules = [];
  
  // Look for rule files
  const ruleFiles = files.filter(f => 
    f.file_name.toLowerCase().includes('rule') && 
    f.file_type === '.xml'
  );
  
  for (const file of ruleFiles) {
    if (file.content_preview) {
      const ruleName = extractRuleName(file.content_preview);
      const ruleType = extractRuleType(file.content_preview);
      
      if (ruleName) {
        rules.push({
          name: ruleName,
          type: ruleType,
          source: file.file_path
        });
      }
    }
  }
  
  return rules;
}

function extractIntegrations(files: any[]): any[] {
  const integrations = [];
  
  // Look for connector files, service definitions
  const connectorFiles = files.filter(f => 
    (f.file_name.toLowerCase().includes('connector') || 
     f.file_name.toLowerCase().includes('service') ||
     f.file_name.toLowerCase().includes('integration')) && 
    f.file_type === '.xml'
  );
  
  for (const file of connectorFiles) {
    if (file.content_preview) {
      const connectorName = extractConnectorName(file.content_preview);
      const connectorType = extractConnectorType(file.content_preview);
      
      if (connectorName) {
        integrations.push({
          name: connectorName,
          type: connectorType,
          source: file.file_path
        });
      }
    }
  }
  
  return integrations;
}

function extractUIComponents(files: any[]): any[] {
  const uiComponents = [];
  
  // Look for section files, harness files, flow actions
  const uiFiles = files.filter(f => 
    (f.file_name.toLowerCase().includes('section') || 
     f.file_name.toLowerCase().includes('harness') ||
     f.file_name.toLowerCase().includes('flowaction')) && 
    f.file_type === '.xml'
  );
  
  for (const file of uiFiles) {
    if (file.content_preview) {
      const componentName = extractComponentName(file.content_preview);
      const componentType = extractComponentType(file.content_preview);
      
      if (componentName) {
        uiComponents.push({
          name: componentName,
          type: componentType,
          source: file.file_path
        });
      }
    }
  }
  
  return uiComponents;
}

function extractConfigurations(files: any[]): any[] {
  const configurations = [];
  
  // Look for configuration files, properties files
  const configFiles = files.filter(f => 
    f.file_type === '.properties' || 
    f.file_name.toLowerCase().includes('config')
  );
  
  for (const file of configFiles) {
    if (file.content_preview) {
      configurations.push({
        name: file.file_name,
        type: 'configuration',
        content: file.content_preview,
        source: file.file_path
      });
    }
  }
  
  return configurations;
}

// Helper functions for extraction
function extractClassName(content: string): string | null {
  const match = content.match(/<Class[^>]*name="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractProperties(content: string): string[] {
  const properties = [];
  const propertyMatches = content.match(/<Property[^>]*name="([^"]+)"/gi);
  if (propertyMatches) {
    properties.push(...propertyMatches.map(m => m.match(/name="([^"]+)"/)?.[1] || ''));
  }
  return properties;
}

function extractFlowName(content: string): string | null {
  const match = content.match(/<Flow[^>]*name="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractFlowSteps(content: string): string[] {
  const steps = [];
  const stepMatches = content.match(/<Step[^>]*name="([^"]+)"/gi);
  if (stepMatches) {
    steps.push(...stepMatches.map(m => m.match(/name="([^"]+)"/)?.[1] || ''));
  }
  return steps;
}

function extractRuleName(content: string): string | null {
  const match = content.match(/<Rule[^>]*name="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractRuleType(content: string): string | null {
  const match = content.match(/<Rule[^>]*type="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractConnectorName(content: string): string | null {
  const match = content.match(/<Connector[^>]*name="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractConnectorType(content: string): string | null {
  const match = content.match(/<Connector[^>]*type="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractComponentName(content: string): string | null {
  const match = content.match(/<(Section|Harness|FlowAction)[^>]*name="([^"]+)"/i);
  return match ? match[2] : null;
}

function extractComponentType(content: string): string | null {
  const match = content.match(/<(Section|Harness|FlowAction)[^>]*/i);
  return match ? match[1] : null;
}

function generateRequirementsDocument(analysis: any): string {
  const { applicationName, dataModels, workflows, rules, integrations, uiComponents, configurations } = analysis;
  
  let requirements = `# Application Requirements Document
Generated from Pega Application: ${applicationName}
Generated on: ${new Date().toLocaleDateString()}

## 1. Application Overview
- **Application Name**: ${applicationName}
- **Type**: Business Process Management Application
- **Platform**: Converted from Pega to Open Source

## 2. Data Models
${dataModels.length > 0 ? dataModels.map((model: any) => `
### ${model.name}
- **Type**: ${model.type}
- **Properties**: ${model.properties.join(', ') || 'None identified'}
- **Source**: ${model.source}
`).join('') : '- No data models identified'}

## 3. Workflows
${workflows.length > 0 ? workflows.map((workflow: any) => `
### ${workflow.name}
- **Steps**: ${workflow.steps.join(' → ') || 'No steps identified'}
- **Source**: ${workflow.source}
`).join('') : '- No workflows identified'}

## 4. Business Rules
${rules.length > 0 ? rules.map((rule: any) => `
### ${rule.name}
- **Type**: ${rule.type || 'Unknown'}
- **Source**: ${rule.source}
`).join('') : '- No rules identified'}

## 5. Integrations
${integrations.length > 0 ? integrations.map((integration: any) => `
### ${integration.name}
- **Type**: ${integration.type || 'Unknown'}
- **Source**: ${integration.source}
`).join('') : '- No integrations identified'}

## 6. UI Components
${uiComponents.length > 0 ? uiComponents.map((component: any) => `
### ${component.name}
- **Type**: ${component.type || 'Unknown'}
- **Source**: ${component.source}
`).join('') : '- No UI components identified'}

## 7. Configuration
${configurations.length > 0 ? configurations.map((config: any) => `
### ${config.name}
- **Type**: ${config.type}
- **Content**: ${config.content.substring(0, 200)}${config.content.length > 200 ? '...' : ''}
- **Source**: ${config.source}
`).join('') : '- No configurations identified'}

## 8. Implementation Recommendations

### For Replit:
- Use Node.js/Express or Python/Flask for backend
- Implement RESTful APIs for data operations
- Use React or Vue.js for frontend
- Store data in SQLite or PostgreSQL
- Implement authentication using JWT

### For Lovable:
- Create a new project with the same name: "${applicationName}"
- Implement the identified data models as database tables
- Create workflows using Lovable's workflow builder
- Build UI components using Lovable's component library
- Configure integrations using Lovable's connector framework

### For Firebase:
- Use Firestore for data storage
- Implement Cloud Functions for business logic
- Use Firebase Authentication
- Create React/Vue frontend with Firebase SDK
- Use Firebase Hosting for deployment

## 9. Next Steps
1. Review and validate the extracted requirements
2. Choose your target platform (Replit/Lovable/Firebase)
3. Set up the development environment
4. Implement data models and database schema
5. Build the core workflows and business logic
6. Create the user interface components
7. Configure integrations and external services
8. Test and deploy the application

---
*This document was automatically generated from Pega application files.*
`;

  return requirements;
}

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
    
    // Process all entries recursively
    processedFiles = await processEntriesRecursively(projectId, zipEntries, '', processedFiles);
    
    // Update project status to completed
    await ProjectModel.updateStatus(projectId, 'completed');
    console.log(`Successfully completed processing project ${projectId}. Processed ${processedFiles} files/directories`);

  } catch (error) {
    console.error('Error processing zip file:', error);
    await ProjectModel.updateStatus(projectId, 'failed');
    console.log(`Marked project ${projectId} as failed`);
  }
}

async function processEntriesRecursively(projectId: number, entries: any[], basePath: string, processedFiles: number): Promise<number> {
  for (const entry of entries) {
    if (!entry.isDirectory) {
      const entryPath = basePath ? `${basePath}/${entry.entryName}` : entry.entryName;
      const fileName = path.basename(entryPath);
      const parentDir = path.dirname(entryPath) === '.' ? null : path.dirname(entryPath);
      const fileType = path.extname(fileName);
      
      // Check if this is a JAR file (recursive extraction)
      if (fileType.toLowerCase() === '.jar') {
        console.log(`Processing JAR file: ${entryPath}`);
        try {
          // Extract JAR contents
          const jarBuffer = entry.getData();
          const jarZip = new AdmZip(jarBuffer);
          const jarEntries = jarZip.getEntries();
          
          console.log(`Found ${jarEntries.length} entries in JAR file ${fileName}`);
          
          // Recursively process JAR contents
          processedFiles = await processEntriesRecursively(projectId, jarEntries, entryPath, processedFiles);
          
        } catch (jarError) {
          console.error(`Error processing JAR file ${entryPath}:`, jarError);
          // Continue with other files
        }
      } else {
        // Handle regular files (non-JAR)
        // Get content preview for text files
        let contentPreview: string | undefined = undefined;
        if (['.txt', '.xml', '.json', '.js', '.ts', '.html', '.css', '.java', '.py', '.properties', '.class'].includes(fileType.toLowerCase())) {
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
        const fullDirPath = basePath ? `${basePath}/${dirPath}` : dirPath;
        try {
          await ExtractedFileModel.create({
            project_id: projectId,
            file_path: fullDirPath,
            file_name: path.basename(dirPath),
            file_type: undefined,
            file_size: undefined,
            content_preview: undefined,
            is_directory: true,
            parent_directory: path.dirname(dirPath) === '.' ? (basePath || undefined) : (basePath ? `${basePath}/${path.dirname(dirPath)}` : path.dirname(dirPath))
          });
          processedFiles++;
        } catch (dbError) {
          console.error(`Error saving directory ${fullDirPath}:`, dbError);
          // Continue processing other files
        }
      }
    }
  }
  
  return processedFiles;
}
