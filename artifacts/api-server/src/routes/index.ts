import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import { requireApiKey } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireApiKey);
router.use(ordersRouter);

export default router;
