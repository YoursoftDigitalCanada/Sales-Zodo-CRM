import { z } from 'zod';

export const sessionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
