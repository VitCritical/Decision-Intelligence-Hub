import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import insightsRouter from "./insights";
import rootCauseRouter from "./rootcause";
import forecastRouter from "./forecast";
import recommendationsRouter from "./recommendations";
import alertsRouter from "./alerts";
import chatRouter from "./chat";
import metricsRouter from "./metrics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(insightsRouter);
router.use(rootCauseRouter);
router.use(forecastRouter);
router.use(recommendationsRouter);
router.use(alertsRouter);
router.use(chatRouter);
router.use(metricsRouter);

export default router;
