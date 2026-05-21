import { Router } from "express";
import { active, health } from "../controllers/health.controller.js";
import { requireApiKey } from "../middleware/apiKey.js";

const router: Router = Router();

router.get("/health", requireApiKey, health);
router.get("/active", requireApiKey, active);

export default router;
