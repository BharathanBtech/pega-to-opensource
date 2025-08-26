"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || '172.16.10.130',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pegatoopen',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Log when a new client successfully connects via the pool
pool.on('connect', () => {
    console.log('PostgreSQL connection established');
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
exports.default = pool;
//# sourceMappingURL=database.js.map