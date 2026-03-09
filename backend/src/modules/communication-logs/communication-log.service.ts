import { logger } from '../../common/utils/logger';
import {
  CommunicationLogResponseDto,
  CreateCommunicationLogDto,
} from './communication-log.dto';
import { communicationLogRepository } from './communication-log.repository';

export class CommunicationLogService {
  async create(data: CreateCommunicationLogDto): Promise<CommunicationLogResponseDto> {
    const log = await communicationLogRepository.create(data);
    return {
      id: log.id,
      tenantId: log.tenantId,
      leadId: log.leadId,
      type: log.type,
      direction: log.direction,
      subject: log.subject,
      content: log.content,
      to: log.to,
      createdAt: log.createdAt,
    };
  }

  async createSafe(data: CreateCommunicationLogDto): Promise<void> {
    try {
      await this.create(data);
    } catch (error) {
      logger.error('[CommunicationLog] Failed to create communication log', {
        tenantId: data.tenantId,
        leadId: data.leadId,
        type: data.type,
        to: data.to,
        error,
      });
    }
  }
}

export const communicationLogService = new CommunicationLogService();
