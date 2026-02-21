import { UpdateSettingsDto } from './settings.dto';
export declare class SettingsService {
    get(tenantId: string): Promise<import("./settings.dto").SettingsResponseDto>;
    update(tenantId: string, data: UpdateSettingsDto): Promise<import("./settings.dto").SettingsResponseDto>;
}
export declare const settingsService: SettingsService;
//# sourceMappingURL=settings.service.d.ts.map