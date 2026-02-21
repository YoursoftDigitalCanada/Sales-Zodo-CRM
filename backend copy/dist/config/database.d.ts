import { PrismaClient } from '@prisma/client';
declare const prismaClientSingleton: () => PrismaClient<{
    log: ("error" | "warn" | "info" | "query")[];
    errorFormat: "pretty";
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}
export declare const prisma: PrismaClient<{
    log: ("error" | "warn" | "info" | "query")[];
    errorFormat: "pretty";
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<boolean>;
export {};
//# sourceMappingURL=database.d.ts.map