import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('SaaS CRM'),

  // Database
  DATABASE_URL: z.string(),
  DB_CONNECT_RETRIES: z.string().transform(Number).default('10'),
  DB_CONNECT_RETRY_DELAY_MS: z.string().transform(Number).default('2000'),

  // Redis
  REDIS_URL: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Bcrypt
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('1000'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_PATH: z.string().default('./uploads'),
  ALLOWED_FILE_TYPES: z.string().default('jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,csv'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SETTINGS_ENCRYPTION_KEY: z.string().min(16).optional(),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),

  // Storage Quotas
  DEFAULT_FILE_STORAGE_QUOTA: z.string().transform(Number).default('5368709120'),
  DEFAULT_EMAIL_STORAGE_QUOTA: z.string().transform(Number).default('1073741824'),

  // AI / LLM (optional — copilot falls back to deterministic mode if missing)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Roof estimator integrations (optional, required only for roof endpoints)
  GOOGLE_GEOCODING_API_KEY: z.string().optional(),
  GOOGLE_STATIC_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_MAPS_JS_API_KEY: z.string().optional(),
  GOOGLE_SOLAR_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8001'),
  HEAT_SERVICE_URL: z.string().default('http://127.0.0.1:5001'),
  SAM_SERVICE_URL: z.string().default('http://127.0.0.1:5002'),
  NEARMAP_API_KEY: z.string().optional(),
  ATTOM_API_KEY: z.string().optional(),

  // EagleView integration
  EAGLEVIEW_CLIENT_ID: z.string().optional(),
  EAGLEVIEW_CLIENT_SECRET: z.string().optional(),
  EAGLEVIEW_BASE_URL: z.string().default('https://sandbox.apicenter.eagleview.com'),
  EAGLEVIEW_TOKEN_URL: z.string().default('https://apicenter.eagleview.com/oauth2/v1/token'),
  EAGLEVIEW_WEBHOOK_SECRET: z.string().optional(),

  // Super Admin
  ADMIN_JWT_SECRET: z.string().min(32).optional(),
  ADMIN_JWT_EXPIRY: z.string().default('4h'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
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
  settings: {
    encryptionKey: parsed.data.SETTINGS_ENCRYPTION_KEY || parsed.data.JWT_ACCESS_SECRET,
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
  ai: {
    openaiApiKey: parsed.data.OPENAI_API_KEY,
    openaiModel: parsed.data.OPENAI_MODEL,
  },
  integrations: {
    google: {
      geocodingApiKey: parsed.data.GOOGLE_GEOCODING_API_KEY || parsed.data.GOOGLE_MAPS_JS_API_KEY,
      staticMapsApiKey: parsed.data.GOOGLE_STATIC_MAPS_API_KEY || parsed.data.GOOGLE_MAPS_JS_API_KEY,
      placesApiKey:
        parsed.data.GOOGLE_PLACES_API_KEY
        || parsed.data.GOOGLE_GEOCODING_API_KEY
        || parsed.data.GOOGLE_MAPS_JS_API_KEY,
      solarApiKey:
        parsed.data.GOOGLE_SOLAR_API_KEY
        || parsed.data.GOOGLE_GEOCODING_API_KEY
        || parsed.data.GOOGLE_MAPS_JS_API_KEY,
    },
    aiServiceUrl: parsed.data.AI_SERVICE_URL,
    heatServiceUrl: parsed.data.HEAT_SERVICE_URL,
    samServiceUrl: parsed.data.SAM_SERVICE_URL,
    nearmapApiKey: parsed.data.NEARMAP_API_KEY,
    attomApiKey: parsed.data.ATTOM_API_KEY,
    eagleview: {
      clientId: parsed.data.EAGLEVIEW_CLIENT_ID,
      clientSecret: parsed.data.EAGLEVIEW_CLIENT_SECRET,
      baseUrl: parsed.data.EAGLEVIEW_BASE_URL,
      tokenUrl: parsed.data.EAGLEVIEW_TOKEN_URL,
      webhookSecret: parsed.data.EAGLEVIEW_WEBHOOK_SECRET,
    },
  },
  admin: {
    jwtSecret: parsed.data.ADMIN_JWT_SECRET || parsed.data.JWT_ACCESS_SECRET,
    jwtExpiry: parsed.data.ADMIN_JWT_EXPIRY,
  },
} as const;

export type Config = typeof config;
