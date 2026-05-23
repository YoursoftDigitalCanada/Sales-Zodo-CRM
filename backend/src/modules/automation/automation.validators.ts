import { z } from 'zod';

export const automationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const automationRuleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(160),
    description: z.string().max(1000).nullable().optional(),
    triggerType: z.string().min(1).max(120),
    conditions: z.record(z.any()).optional(),
    actions: z.array(z.any()).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().optional(),
    runOncePerEntity: z.boolean().optional(),
  }),
});

export const testTriggerSchema = z.object({
  body: z.object({
    triggerType: z.string().min(1).max(120),
    entityType: z.string().min(1).max(80),
    entityId: z.string().min(1).max(120),
    mode: z.enum(['dry-run', 'execute']).optional(),
    execute: z.boolean().optional(),
    input: z.record(z.any()).optional(),
  }),
});
