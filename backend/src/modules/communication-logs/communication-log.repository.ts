import { prisma } from '../../config/database';
import { CreateCommunicationLogDto } from './communication-log.dto';

export class CommunicationLogRepository {
  async create(data: CreateCommunicationLogDto) {
    return prisma.communicationLog.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId ?? null,
        type: data.type,
        direction: data.direction,
        subject: data.subject ?? null,
        content: data.content,
        to: data.to,
      },
    });
  }
}

export const communicationLogRepository = new CommunicationLogRepository();
