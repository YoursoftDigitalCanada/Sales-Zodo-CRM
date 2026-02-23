export {
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication,
} from "./services/applications-service";
export type { ApplicationEntity, CreateApplicationPayload, UpdateApplicationPayload } from "./services/applications-service";
