import { z } from 'zod';
export declare const createConversationSchema: z.ZodObject<{
    body: z.ZodObject<{
        participantIds: z.ZodArray<z.ZodString, "many">;
        name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isGroup: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        participantIds: string[];
        isGroup: boolean;
        name?: string | null | undefined;
    }, {
        participantIds: string[];
        name?: string | null | undefined;
        isGroup?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        participantIds: string[];
        isGroup: boolean;
        name?: string | null | undefined;
    };
}, {
    body: {
        participantIds: string[];
        name?: string | null | undefined;
        isGroup?: boolean | undefined;
    };
}>;
export declare const sendMessageSchema: z.ZodObject<{
    body: z.ZodObject<{
        content: z.ZodString;
        attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["file", "image"]>;
            url: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }, {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        attachments: {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }[];
        content: string;
    }, {
        content: string;
        attachments?: {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        attachments: {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }[];
        content: string;
    };
}, {
    body: {
        content: string;
        attachments?: {
            type: "file" | "image";
            url: string;
            name?: string | undefined;
        }[] | undefined;
    };
}>;
export declare const conversationQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
    };
}, {
    query: {
        page?: number | undefined;
        limit?: number | undefined;
    };
}>;
export declare const messageQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        before: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        before?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        before?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        before?: string | undefined;
    };
}, {
    query: {
        page?: number | undefined;
        limit?: number | undefined;
        before?: string | undefined;
    };
}>;
export declare const conversationIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
}, {
    params: {
        id: string;
    };
}>;
export declare const messageIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
        messageId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        messageId: string;
    }, {
        id: string;
        messageId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
        messageId: string;
    };
}, {
    params: {
        id: string;
        messageId: string;
    };
}>;
//# sourceMappingURL=chat.validators.d.ts.map