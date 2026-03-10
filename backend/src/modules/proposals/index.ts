// ============================================================================
// PROPOSALS MODULE — Stage 3: Business → Documents → Proposals
// ============================================================================

export { proposalsService } from './proposals.service';
export { proposalsController } from './proposals.controller';
export { default as proposalsRoutes } from './proposals.routes';
export { default as proposalsPublicRoutes } from './proposals.public-routes';
export { stage3WorkflowService } from './stage3-workflow.service';
export { stage4SendWorkflowService } from './stage4-send-workflow.service';
export { proposalReminderService } from './proposal-reminder.service';
export { stage5ConversionWorkflowService } from './stage5-conversion-workflow.service';
