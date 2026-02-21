import { EmailTemplate } from '@prisma/client';
export type EmailTemplateType = 'LEAD_WELCOME' | 'CLIENT_WELCOME' | 'INVOICE' | 'REMINDER' | 'NOTIFICATION' | 'CUSTOM';
export interface CreateEmailTemplateDto {
    name: string;
    subject: string;
    body: string;
    type?: EmailTemplateType;
    variables?: string[];
    isActive?: boolean;
}
export interface UpdateEmailTemplateDto extends Partial<CreateEmailTemplateDto> {
}
export interface EmailTemplateQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    type?: EmailTemplateType;
    isActive?: boolean;
    sortBy?: 'name' | 'createdAt' | 'type';
    sortOrder?: 'asc' | 'desc';
}
export interface SendEmailDto {
    templateId?: string;
    to: string[];
    subject: string;
    body: string;
    variables?: Record<string, string>;
}
export interface EmailTemplateResponseDto {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
    variables: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare function toEmailTemplateResponseDto(t: EmailTemplate): EmailTemplateResponseDto;
//# sourceMappingURL=emails.dto.d.ts.map