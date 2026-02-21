export declare function hashPassword(password: string): Promise<string>;
export declare function comparePassword(password: string, hashedPassword: string): Promise<boolean>;
export declare function generateRandomPassword(length?: number): string;
export declare function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
};
//# sourceMappingURL=password.d.ts.map