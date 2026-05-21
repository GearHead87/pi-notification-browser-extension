import { Router } from "express";
import { dismiss } from "../controllers/dismiss.controller.js";
import { notify } from "../controllers/notify.controller.js";
import { requireApiKey } from "../middleware/apiKey.js";

const router: Router = Router();

router.post("/notify", requireApiKey, notify);
router.post("/dismiss", requireApiKey, dismiss);

export default router;
