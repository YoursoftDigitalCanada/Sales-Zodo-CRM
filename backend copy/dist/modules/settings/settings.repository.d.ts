import { UpdateSettingsDto } from './settings.dto';
export declare class SettingsRepository {
    findByTenantId(tenantId: string): Promise<any>;
    upsert(tenantId: string, data: UpdateSettingsDto): Promise<any>;
}
export declare const settingsRepository: SettingsRepository;
//# sourceMappingURL=settings.repository.d.ts.map