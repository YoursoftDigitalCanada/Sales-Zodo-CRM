export declare const config: {
    readonly app: {
        readonly env: "development" | "staging" | "production";
        readonly port: number;
        readonly apiVersion: string;
        readonly name: string;
        readonly isProduction: boolean;
        readonly isDevelopment: boolean;
    };
    readonly database: {
        readonly url: string;
        readonly connectRetries: number;
        readonly connectRetryDelayMs: number;
    };
    readonly redis: {
        readonly url: string | undefined;
    };
    readonly jwt: {
        readonly accessSecret: string;
        readonly refreshSecret: string;
        readonly accessExpiry: string;
        readonly refreshExpiry: string;
    };
    readonly bcrypt: {
        readonly rounds: number;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
    };
    readonly upload: {
        readonly maxFileSize: number;
        readonly uploadPath: string;
        readonly allowedTypes: string[];
    };
    readonly email: {
        readonly host: string | undefined;
        readonly port: number | undefined;
        readonly user: string | undefined;
        readonly pass: string | undefined;
        readonly from: string | undefined;
    };
    readonly frontend: {
        readonly url: string;
    };
    readonly logging: {
        readonly level: "error" | "warn" | "info" | "debug";
        readonly filePath: string;
    };
    readonly storage: {
        readonly defaultFileQuota: number;
        readonly defaultEmailQuota: number;
    };
};
export type Config = typeof config;
//# sourceMappingURL=index.d.ts.map