import { Request } from 'express';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
/**
 * Clients Manager
 * Handles business orchestration, audit logging, and notifications
 */
export declare class ClientsManager {
    /**
     * Create a new client with audit logging
     */
    createClient(req: Request, tenantId: string, data: CreateClientDto): Promise<import("./clients.dto").ClientResponseDto>;
    /**
     * Update client with audit logging
     */
    updateClient(req: Request, id: string, tenantId: string, data: UpdateClientDto): Promise<import("./clients.dto").ClientResponseDto>;
    /**
     * Delete client with audit logging
     */
    deleteClient(req: Request, id: string, tenantId: string): Promise<void>;
}
export declare const clientsManager: ClientsManager;
//# sourceMappingURL=clients.manager.d.ts.map