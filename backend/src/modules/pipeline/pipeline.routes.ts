import { Router } from "express";
import { authenticate, loadEmployee } from "../../common/middleware/auth.middleware";
import { requireAnyPermission } from "../../common/middleware/permission.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { PERMISSIONS } from "../../common/constants/permissions";
import { pipelineController } from "./pipeline.controller";
import { pipelineTransitionRequestSchema } from "./pipeline.validators";

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.post(
  "/transition",
  requireAnyPermission([PERMISSIONS.LEADS_UPDATE, PERMISSIONS.PROJECTS_UPDATE]),
  validate(pipelineTransitionRequestSchema),
  pipelineController.transition.bind(pipelineController),
);

export default router;
