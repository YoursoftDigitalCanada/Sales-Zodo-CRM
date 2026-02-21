import { CreateEmailTemplateDto, UpdateEmailTemplateDto, EmailTemplateQueryDto, SendEmailDto } from './emails.dto';
export declare class EmailsService {
    createTemplate(tenantId: string, data: CreateEmailTemplateDto): Promise<import("./emails.dto").EmailTemplateResponseDto>;
    getTemplateById(id: string, tenantId: string): Promise<import("./emails.dto").EmailTemplateResponseDto>;
    getTemplates(tenantId: string, query: EmailTemplateQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    updateTemplate(id: string, tenantId: string, data: UpdateEmailTemplateDto): Promise<import("./emails.dto").EmailTemplateResponseDto>;
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    sendEmail(tenantId: string, data: SendEmailDto): Promise<{
        success: boolean;
        message: string;
        recipients: string[];
    }>;
}
export declare const emailsService: EmailsService;
//# sourceMappingURL=emails.service.d.ts.map