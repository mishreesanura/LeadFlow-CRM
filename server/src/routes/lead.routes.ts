import { Router } from "express";
import { leadController } from "../controllers/lead.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const leadRouter = Router();

leadRouter.get("/stats", asyncHandler(leadController.stats));
leadRouter.get("/search", asyncHandler(leadController.search));
leadRouter.post("/import/preview", asyncHandler(leadController.importPreview));
leadRouter.post("/import/commit", asyncHandler(leadController.importCommit));
leadRouter.get("/", asyncHandler(leadController.list));
leadRouter.post("/", asyncHandler(leadController.create));
leadRouter.get("/:id/activity", asyncHandler(leadController.activity));
leadRouter.get("/:id", asyncHandler(leadController.getById));
leadRouter.patch("/:id", asyncHandler(leadController.update));
leadRouter.delete("/:id", asyncHandler(leadController.remove));
