import { Request, Response, NextFunction } from 'express';
import * as ticketService from './ticketService';
import * as coreBankingService from './coreBankingService';
import { getTellerActivities as fetchTellerActivities } from './tellerActivityService';
import * as branchService from './branchService';

export const getTellerActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username as string;
    const services = await fetchTellerActivities(username);
    res.status(200).json({ status: "success", data: services || [] });
  } catch (error) {
    next(error);
  }
};

export const getBranches = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const branches = await branchService.getBranchList();
    res.status(200).json({ status: "success", data: branches });
  } catch (error) {
    next(error);
  }
};

export const getBranchInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as string;
    const description = await branchService.getBranchDescription(code);
    res.status(200).json({ status: "success", data: { code, description } });
  } catch (error) {
    next(error);
  }
};


// --- Office Controllers ---

export const createOffice = async (req: Request, res: Response, next: NextFunction) => {
  console.log("POST /offices called with body:", req.body);
  try {
    const office = await ticketService.createOffice(req.body);
    res.status(201).json({ status: "success", data: office });
  } catch (error) {
    next(error);
  }
};

export const getOffices = async (req: Request, res: Response, next: NextFunction) => {
  console.log("GET /offices called with query:", req.query);
  try {
    const { branch_id } = req.query;
    const offices = await ticketService.getOffices(branch_id as string | undefined);
    res.status(200).json({ status: "success", data: offices });
  } catch (error) {
    next(error);
  }
};

export const updateOfficeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status, occupiedBy } = req.body;
    const office = await ticketService.updateOfficeStatus(id, status, occupiedBy);
    res.status(200).json({ status: "success", data: office });
  } catch (error) {
    next(error);
  }
};

export const updateOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const office = await ticketService.updateOffice(id, req.body);
    res.status(200).json({ status: "success", data: office });
  } catch (error) {
    next(error);
  }
};

export const updateOfficeServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { services } = req.body;
    const office = await ticketService.updateOfficeServices(id, services);
    res.status(200).json({ status: "success", data: office });
  } catch (error) {
    next(error);
  }
};

export const deleteOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const office = await ticketService.deleteOffice(id);
    if (!office) {
      res.status(404).json({ status: "fail", message: "Office not found" });
      return;
    }
    res.status(200).json({ status: "success", data: null });
  } catch (error) {
    next(error);
  }
};

// --- Ticket Controllers ---

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json({ status: "success", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch_id } = req.query;
    const tickets = await ticketService.getAllTickets(branch_id as string | undefined);
    res.status(200).json({ status: "success", data: tickets });
  } catch (error) {
    next(error);
  }
};

export const getWaitingTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch_id } = req.query;
    const tickets = await ticketService.getWaitingTickets(branch_id as string | undefined);
    res.status(200).json({ status: "success", data: tickets });
  } catch (error) {
    next(error);
  }
};

export const getSkippedTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branch_id } = req.query;
    const tickets = await ticketService.getSkippedTickets(branch_id as string | undefined);
    res.status(200).json({ status: "success", data: tickets });
  } catch (error) {
    next(error);
  }
};

export const callTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { officeId, servedBy } = req.body;
    
    // 1. Fetch the ticket to see if it's already posted to core
    const ticketToCall = await ticketService.getAllTickets().then(ts => ts.find(t => t.id === id));
    if (!ticketToCall) {
      return res.status(404).json({ status: "fail", message: "Ticket not found" });
    }

    if (!ticketToCall.isPostedToCore) {
      // 2. Post to core
      try {
        await coreBankingService.postTicketToCore(ticketToCall, servedBy || "UNKNOWN");
      } catch (err: any) {
        // If POST fails, we do NOT update DB or emit event, so UI stays available
        console.error("Core Banking POST failed", err);
        return res.status(502).json({ 
          status: "fail", 
          message: `Failed to connect to CORE Banking system: ${err.message}`,
          details: err.message
        });
      }
    }
    
    // 3. If successful (or already posted), update local DB and broadcast
    const ticket = await ticketService.updateTicketStatus(id, 'CALLING', officeId, true);
    res.status(200).json({ status: "success", data: ticket });
  } catch (error: any) {
    next(error);
  }
};

export const startService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const ticket = await ticketService.updateTicketStatus(id, 'SERVING');
    res.status(200).json({ status: "success", data: ticket });
  } catch (error: any) {
    next(error);
  }
};

export const completeService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { servedBy } = req.body;
    
    const ticketToComplete = await ticketService.getAllTickets().then(ts => ts.find(t => t.id === id));
    if (!ticketToComplete) {
      return res.status(404).json({ status: "fail", message: "Ticket not found" });
    }

    if (ticketToComplete.isPostedToCore) {
      try {
        await coreBankingService.updateTicketInCore(ticketToComplete, 'Y', servedBy || "UNKNOWN");
      } catch (err: any) {
        console.error("Core Banking UPDATE failed", err);
        return res.status(502).json({ 
          status: "fail", 
          message: `Failed to update CORE Banking system: ${err.message}`,
          details: err.message
        });
      }
    }

    const ticket = await ticketService.updateTicketStatus(id, 'COMPLETED');
    res.status(200).json({ status: "success", data: ticket });
  } catch (error: any) {
    next(error);
  }
};

export const skipTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const ticket = await ticketService.updateTicketStatus(id, 'SKIPPED');
    res.status(200).json({ status: "success", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const recallTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const ticket = await ticketService.updateTicketStatus(id, 'CALLING');
    res.status(200).json({ status: "success", data: ticket });
  } catch (error) {
    next(error);
  }
};

export const cancelTicket = async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id as string);
  console.log(`CANCEL_TICKET: Received request for ID ${id}`);
  try {
    const { servedBy } = req.body;
    const ticketToCancel = await ticketService.getAllTickets().then(ts => ts.find(t => t.id === id));
    
    if (ticketToCancel?.isPostedToCore) {
      try {
        await coreBankingService.updateTicketInCore(ticketToCancel, 'C', servedBy || "UNKNOWN");
      } catch (err: any) {
        console.error("Core Banking UPDATE (Cancel) failed", err);
        return res.status(502).json({ status: "fail", message: "Failed to update CORE Banking system. Ticket not cancelled." });
      }
    }

    const ticket = await ticketService.updateTicketStatus(id, 'CANCELLED');
    res.status(200).json({ status: "success", data: ticket });
  } catch (error) {
    next(error);
  }
};
