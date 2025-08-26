"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const projects_1 = __importDefault(require("./routes/projects"));
const init_db_1 = __importDefault(require("./config/init-db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Serve the frontend
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/projects', projects_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof Error && err.message === 'Only ZIP files are allowed') {
        return res.status(400).json({ error: 'Only ZIP files are allowed' });
    }
    res.status(500).json({ error: 'Something went wrong!' });
});
// Serve frontend for any non-API routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
// Initialize database and start server
async function startServer() {
    try {
        await (0, init_db_1.default)();
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
            console.log(`📁 Project endpoints: http://localhost:${PORT}/api/projects`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map