import type { Request, Response } from "express";
import { leadImportService } from "../services/lead.import.service.js";
import { leadService } from "../services/lead.service.js";

export const leadController = {
  async create(req: Request, res: Response) {
    const lead = await leadService.createLead(req.body);
    res.status(201).json({ data: lead });
  },

  async list(req: Request, res: Response) {
    const result = await leadService.listLeads(req.query);
    res.json(result);
  },

  async search(req: Request, res: Response) {
    const result = await leadService.searchLeads(req.query);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const lead = await leadService.getLead(req.params);
    res.json({ data: lead });
  },

  async update(req: Request, res: Response) {
    const lead = await leadService.updateLead(req.params, req.body);
    res.json({ data: lead });
  },

  async remove(req: Request, res: Response) {
    const result = await leadService.deleteLead(req.params);
    res.json(result);
  },

  async activity(req: Request, res: Response) {
    const data = await leadService.getLeadActivity(req.params);
    res.json({ data });
  },

  async stats(_req: Request, res: Response) {
    const data = await leadService.getStats();
    res.json({ data });
  },

  async importPreview(req: Request, res: Response) {
    const data = await leadImportService.preview(req.body);
    res.json({ data });
  },

  async importCommit(req: Request, res: Response) {
    const data = await leadImportService.commit(req.body);
    res.status(201).json({ data });
  }
};
