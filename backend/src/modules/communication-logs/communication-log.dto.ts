import { CommunicationDirection, CommunicationType } from '@prisma/client';

export interface CreateCommunicationLogDto {
  tenantId: string;
  leadId?: string | null;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string | null;
  content: string;
  to: string;
}

export interface CommunicationLogResponseDto {
  id: string;
  tenantId: string;
  leadId: string | null;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject: string | null;
  content: string;
  to: string;
  createdAt: Date;
}
