import { Router } from "express";
import healthRoutes from "./health.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import pingRoutes from "./ping.routes.js";

/**
 * Aggregate every feature router under a single `Router` so `app.ts` only
 * needs to `app.use(routes)`. Add new feature routes here.
 */
const router: Router = Router();

router.use(pingRoutes);
router.use(healthRoutes);
router.use(notificationsRoutes);

export default router;
