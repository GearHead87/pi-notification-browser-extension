import { Router } from "express";
import { ping } from "../controllers/ping.controller.js";

/**
 * Public liveness route. Deliberately NOT guarded by `requireApiKey`.
 */
const router: Router = Router();

router.get("/ping", ping);

export default router;
