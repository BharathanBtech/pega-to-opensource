import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  uploadProject, 
  getProjects, 
  getProject, 
  getExtractedFiles, 
  deleteProject,
  debugProjects,
  debugProjectFiles,
  getFileContent,
  generateRequirements
} from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Project routes
router.post('/upload', upload.single('file'), uploadProject);
router.get('/', getProjects);
router.get('/debug', debugProjects); // Debug endpoint
router.get('/:id/files', getExtractedFiles);
router.get('/:id/debug-files', debugProjectFiles); // Debug project files
router.get('/:id/requirements', generateRequirements); // Generate requirements
router.get('/:projectId/files/:filePath(*)', getFileContent);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

export default router;
