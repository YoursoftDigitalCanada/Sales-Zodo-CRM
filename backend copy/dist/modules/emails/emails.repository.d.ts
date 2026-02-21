import { CreateEmailTemplateDto, UpdateEmailTemplateDto, EmailTemplateQueryDto } from './emails.dto';
export declare class EmailsRepository {
    createTemplate(tenantId: string, data: CreateEmailTemplateDto): Promise<any>;
    findTemplateById(id: string, tenantId: string): Promise<any>;
    findTemplates(tenantId: string, query: EmailTemplateQueryDto): Promise<{
        data: any;
        total: any;
    }>;
    updateTemplate(id: string, data: UpdateEmailTemplateDto): Promise<any>;
    deleteTemplate(id: string): Promise<any>;
}
export declare const emailsRepository: EmailsRepository;
//# sourceMappingURL=emails.repository.d.ts.map