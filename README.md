# Pega to Open Source Converter

A TypeScript application that allows users to upload Pega system applications (as ZIP files) and convert them to open source format. The application provides a web interface for uploading, viewing, and managing Pega applications.

## Features

- 🔐 **User Authentication**: Secure login and registration system with JWT tokens
- 📁 **File Upload**: Upload Pega application ZIP files with validation
- 🔍 **File Extraction**: Automatically extract and analyze ZIP file contents
- 📄 **File Browser**: View extracted files with pagination and file type detection
- 🗂️ **Project Management**: Organize and manage multiple Pega applications
- 📊 **Status Tracking**: Monitor upload and processing status
- 🎨 **Modern UI**: Clean and responsive web interface

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn package manager

## Database Setup

### 1. Create PostgreSQL Database

First, create a PostgreSQL database with the following details:
- **Host**: 172.16.10.130
- **Port**: 5432
- **Database Name**: pegatoopen
- **User**: postgres (or your preferred user)

### 2. Database Schema

The application will automatically create the necessary tables when it starts. The schema includes:

- **users**: User accounts and authentication
- **projects**: Uploaded Pega applications
- **extracted_files**: Contents of extracted ZIP files
- **conversion_logs**: Processing and conversion logs

## Installation

1. **Clone or download the project**:
   ```bash
   cd pega-to-opensource
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Create a `.env` file in the root directory and update the database credentials:
   ```env
   DB_HOST=172.16.10.130
   DB_PORT=5432
   DB_NAME=pegatoopen
   DB_USER=postgres
   DB_PASSWORD=your_actual_password_here
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3000
   ```
   
   **Important**: Replace `your_actual_password_here` with your actual PostgreSQL password.
   
   **Generate a secure JWT secret**:
   
   You can generate a secure JWT secret using one of these methods:
   
   **Method 1: Using Node.js (Recommended)**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   
   **Method 2: Using PowerShell**
   ```powershell
   $bytes = New-Object Byte[] 64
   (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
   [System.BitConverter]::ToString($bytes) -replace '-', ''
   ```
   
   **Method 3: Online generator**
   Visit https://generate-secret.vercel.app/64 and copy the generated string.
   
   Replace `your_jwt_secret_key_here` with the generated secret. The secret should be a long, random string (at least 32 characters, preferably 64+ characters).

4. **Build the project**:
   ```bash
   npm run build
   ```

5. **Initialize the database**:
   ```bash
   npm run build
   node dist/config/init-db.js
   ```

6. **Start the application**:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

### 1. Access the Application

Open your web browser and navigate to:
```
http://localhost:3000/src/public/index.html
```

### 2. Default Admin Account

The application creates a default admin account:
- **Username**: admin
- **Password**: admin123

### 3. Upload Pega Applications

1. **Login** with your credentials
2. **Upload a ZIP file** containing a Pega application
3. **Provide project details** (name, description)
4. **Wait for processing** - the system will extract and analyze the ZIP contents
5. **View extracted files** with pagination and file type detection

### 4. View and Manage Projects

- View all your uploaded projects
- Check processing status
- Browse extracted files
- Delete projects when no longer needed

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Projects
- `POST /api/projects/upload` - Upload a new project (ZIP file)
- `GET /api/projects` - Get user's projects
- `GET /api/projects/:id` - Get specific project details
- `GET /api/projects/:projectId/files` - Get extracted files with pagination
- `DELETE /api/projects/:id` - Delete a project

### Health Check
- `GET /health` - Application health status

## Project Structure

```
pega-to-opensource/
├── src/
│   ├── config/
│   │   ├── database.ts          # Database connection
│   │   ├── schema.sql           # Database schema
│   │   └── init-db.ts           # Database initialization
│   ├── controllers/
│   │   ├── authController.ts    # Authentication logic
│   │   └── projectController.ts # Project management logic
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication middleware
│   ├── models/
│   │   ├── User.ts              # User model
│   │   ├── Project.ts           # Project model
│   │   └── ExtractedFile.ts     # Extracted file model
│   ├── routes/
│   │   ├── auth.ts              # Authentication routes
│   │   └── projects.ts          # Project routes
│   ├── public/
│   │   └── index.html           # Frontend interface
│   └── server.ts                # Main server file
├── uploads/                     # Uploaded files directory
├── dist/                        # Compiled JavaScript files
├── package.json
├── tsconfig.json
├── .env                         # Environment variables
└── README.md
```

## File Processing

The application processes uploaded ZIP files by:

1. **Validating** the file is a valid ZIP
2. **Extracting** all files and directories
3. **Analyzing** file types and content
4. **Storing** file metadata in the database
5. **Generating** content previews for text files
6. **Organizing** files by directory structure

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **File Validation**: Only ZIP files are accepted
- **User Isolation**: Users can only access their own projects
- **Input Validation**: Server-side validation of all inputs

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic reloading on file changes.

### Building for Production

```bash
npm run build
npm start
```

### Database Scripts

To manually run database initialization:
```bash
npx ts-node src/config/init-db.ts
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database `pegatoopen` exists

2. **Port Already in Use**:
   - Change the PORT in `.env` file
   - Or kill the process using the current port

3. **File Upload Issues**:
   - Ensure the file is a valid ZIP
   - Check file size limits
   - Verify uploads directory permissions

4. **Authentication Issues**:
   - Clear browser localStorage
   - Check JWT_SECRET in `.env`
   - Verify user credentials

### Logs

Check the console output for detailed error messages and debugging information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please create an issue in the repository or contact the development team.
