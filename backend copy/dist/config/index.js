"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    // Application
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    API_VERSION: zod_1.z.string().default('v1'),
    APP_NAME: zod_1.z.string().default('SaaS CRM'),
    // Database
    DATABASE_URL: zod_1.z.string(),
    DB_CONNECT_RETRIES: zod_1.z.string().transform(Number).default('10'),
    DB_CONNECT_RETRY_DELAY_MS: zod_1.z.string().transform(Number).default('2000'),
    // Redis
    REDIS_URL: zod_1.z.string().optional(),
    // JWT
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    // Bcrypt
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('12'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
    // File Upload
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default('10485760'),
    UPLOAD_PATH: zod_1.z.string().default('./uploads'),
    ALLOWED_FILE_TYPES: zod_1.z.string().default('jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,csv'),
    // Email
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().transform(Number).optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().optional(),
    // Frontend
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5173'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE_PATH: zod_1.z.string().default('./logs'),
    // Storage Quotas
    DEFAULT_FILE_STORAGE_QUOTA: zod_1.z.string().transform(Number).default('5368709120'),
    DEFAULT_EMAIL_STORAGE_QUOTA: zod_1.z.string().transform(Number).default('1073741824'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.config = {
    app: {
        env: parsed.data.NODE_ENV,
        port: parsed.data.PORT,
        apiVersion: parsed.data.API_VERSION,
        name: parsed.data.APP_NAME,
        isProduction: parsed.data.NODE_ENV === 'production',
        isDevelopment: parsed.data.NODE_ENV === 'development',
    },
    database: {
        url: parsed.data.DATABASE_URL,
        connectRetries: parsed.data.DB_CONNECT_RETRIES,
        connectRetryDelayMs: parsed.data.DB_CONNECT_RETRY_DELAY_MS,
    },
    redis: {
        url: parsed.data.REDIS_URL,
    },
    jwt: {
        accessSecret: parsed.data.JWT_ACCESS_SECRET,
        refreshSecret: parsed.data.JWT_REFRESH_SECRET,
        accessExpiry: parsed.data.JWT_ACCESS_EXPIRY,
        refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY,
    },
    bcrypt: {
        rounds: parsed.data.BCRYPT_ROUNDS,
    },
    rateLimit: {
        windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
        maxRequests: parsed.data.RATE_LIMIT_MAX_REQUESTS,
    },
    upload: {
        maxFileSize: parsed.data.MAX_FILE_SIZE,
        uploadPath: parsed.data.UPLOAD_PATH,
        allowedTypes: parsed.data.ALLOWED_FILE_TYPES.split(','),
    },
    email: {
        host: parsed.data.SMTP_HOST,
        port: parsed.data.SMTP_PORT,
        user: parsed.data.SMTP_USER,
        pass: parsed.data.SMTP_PASS,
        from: parsed.data.SMTP_FROM,
    },
    frontend: {
        url: parsed.data.FRONTEND_URL,
    },
    logging: {
        level: parsed.data.LOG_LEVEL,
        filePath: parsed.data.LOG_FILE_PATH,
    },
    storage: {
        defaultFileQuota: parsed.data.DEFAULT_FILE_STORAGE_QUOTA,
        defaultEmailQuota: parsed.data.DEFAULT_EMAIL_STORAGE_QUOTA,
    },
};
//# sourceMappingURL=index.js.map