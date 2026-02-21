import { settingsRepository } from './settings.repository';
import { UpdateSettingsDto, toSettingsResponseDto } from './settings.dto';

export class SettingsService {
    async get(tenantId: string) {
        let settings = await settingsRepository.findByTenantId(tenantId);
        if (!settings) {
            settings = await settingsRepository.upsert(tenantId, {});
        }
        return toSettingsResponseDto(settings);
    }

    async update(tenantId: string, data: UpdateSettingsDto) {
        const settings = await settingsRepository.upsert(tenantId, data);
        return toSettingsResponseDto(settings);
    }
}

export const settingsService = new SettingsService();
