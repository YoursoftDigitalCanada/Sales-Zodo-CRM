import { z } from "zod";
import { PipelineTransitionSchema } from "@contracts/lead";

export const pipelineTransitionRequestSchema = z.object({
  body: PipelineTransitionSchema,
});

