"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTicket = exports.recallTicket = exports.skipTicket = exports.completeService = exports.startService = exports.callTicket = exports.getSkippedTickets = exports.getWaitingTickets = exports.getTickets = exports.createTicket = exports.deleteOffice = exports.updateOfficeServices = exports.updateOffice = exports.updateOfficeStatus = exports.getOffices = exports.createOffice = exports.getBranchInfo = exports.getBranches = exports.getTellerActivities = void 0;
const ticketService = __importStar(require("./ticketService"));
const coreBankingService = __importStar(require("./coreBankingService"));
const tellerActivityService_1 = require("./tellerActivityService");
const branchService = __importStar(require("./branchService"));
const getTellerActivities = async (req, res, next) => {
    try {
        const username = req.params.username;
        const services = await (0, tellerActivityService_1.getTellerActivities)(username);
        res.status(200).json({ status: "success", data: services || [] });
    }
    catch (error) {
        next(error);
    }
};
exports.getTellerActivities = getTellerActivities;
const getBranches = async (_req, res, next) => {
    try {
        const branches = await branchService.getBranchList();
        res.status(200).json({ status: "success", data: branches });
    }
    catch (error) {
        next(error);
    }
};
exports.getBranches = getBranches;
const getBranchInfo = async (req, res, next) => {
    try {
        const code = req.params.code;
        const description = await branchService.getBranchDescription(code);
        res.status(200).json({ status: "success", data: { code, description } });
    }
    catch (error) {
        next(error);
    }
};
exports.getBranchInfo = getBranchInfo;
// --- Office Controllers ---
const createOffice = async (req, res, next) => {
    console.log("POST /offices called with body:", req.body);
    try {
        const office = await ticketService.createOffice(req.body);
        res.status(201).json({ status: "success", data: office });
    }
    catch (error) {
        next(error);
    }
};
exports.createOffice = createOffice;
const getOffices = async (req, res, next) => {
    console.log("GET /offices called with query:", req.query);
    try {
        const { branch_id } = req.query;
        const offices = await ticketService.getOffices(branch_id);
        res.status(200).json({ status: "success", data: offices });
    }
    catch (error) {
        next(error);
    }
};
exports.getOffices = getOffices;
const updateOfficeStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { status, occupiedBy } = req.body;
        const office = await ticketService.updateOfficeStatus(id, status, occupiedBy);
        res.status(200).json({ status: "success", data: office });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOfficeStatus = updateOfficeStatus;
const updateOffice = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const office = await ticketService.updateOffice(id, req.body);
        res.status(200).json({ status: "success", data: office });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOffice = updateOffice;
const updateOfficeServices = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { services } = req.body;
        const office = await ticketService.updateOfficeServices(id, services);
        res.status(200).json({ status: "success", data: office });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOfficeServices = updateOfficeServices;
const deleteOffice = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const office = await ticketService.deleteOffice(id);
        if (!office) {
            res.status(404).json({ status: "fail", message: "Office not found" });
            return;
        }
        res.status(200).json({ status: "success", data: null });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOffice = deleteOffice;
// --- Ticket Controllers ---
const createTicket = async (req, res, next) => {
    try {
        const ticket = await ticketService.createTicket(req.body);
        res.status(201).json({ status: "success", data: ticket });
    }
    catch (error) {
        next(error);
    }
};
exports.createTicket = createTicket;
const getTickets = async (req, res, next) => {
    try {
        const { branch_id } = req.query;
        const tickets = await ticketService.getAllTickets(branch_id);
        res.status(200).json({ status: "success", data: tickets });
    }
    catch (error) {
        next(error);
    }
};
exports.getTickets = getTickets;
const getWaitingTickets = async (req, res, next) => {
    try {
        const { branch_id } = req.query;
        const tickets = await ticketService.getWaitingTickets(branch_id);
        res.status(200).json({ status: "success", data: tickets });
    }
    catch (error) {
        next(error);
    }
};
exports.getWaitingTickets = getWaitingTickets;
const getSkippedTickets = async (req, res, next) => {
    try {
        const { branch_id } = req.query;
        const tickets = await ticketService.getSkippedTickets(branch_id);
        res.status(200).json({ status: "success", data: tickets });
    }
    catch (error) {
        next(error);
    }
};
exports.getSkippedTickets = getSkippedTickets;
const callTicket = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
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
            }
            catch (err) {
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
    }
    catch (error) {
        next(error);
    }
};
exports.callTicket = callTicket;
const startService = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const ticket = await ticketService.updateTicketStatus(id, 'SERVING');
        res.status(200).json({ status: "success", data: ticket });
    }
    catch (error) {
        next(error);
    }
};
exports.startService = startService;
const completeService = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { servedBy } = req.body;
        const ticketToComplete = await ticketService.getAllTickets().then(ts => ts.find(t => t.id === id));
        if (!ticketToComplete) {
            return res.status(404).json({ status: "fail", message: "Ticket not found" });
        }
        if (ticketToComplete.isPostedToCore) {
            try {
                await coreBankingService.updateTicketInCore(ticketToComplete, 'Y', servedBy || "UNKNOWN");
            }
            catch (err) {
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
    }
    catch (error) {
        next(error);
    }
};
exports.completeService = completeService;
const skipTicket = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const ticket = await ticketService.updateTicketStatus(id, 'SKIPPED');
        res.status(200).json({ status: "success", data: ticket });
    }
    catch (error) {
        next(error);
    }
};
exports.skipTicket = skipTicket;
const recallTicket = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const ticket = await ticketService.updateTicketStatus(id, 'CALLING');
        res.status(200).json({ status: "success", data: ticket });
    }
    catch (error) {
        next(error);
    }
};
exports.recallTicket = recallTicket;
const cancelTicket = async (req, res, next) => {
    const id = parseInt(req.params.id);
    console.log(`CANCEL_TICKET: Received request for ID ${id}`);
    try {
        const { servedBy } = req.body;
        const ticketToCancel = await ticketService.getAllTickets().then(ts => ts.find(t => t.id === id));
        if (ticketToCancel?.isPostedToCore) {
            try {
                await coreBankingService.updateTicketInCore(ticketToCancel, 'C', servedBy || "UNKNOWN");
            }
            catch (err) {
                console.error("Core Banking UPDATE (Cancel) failed", err);
                return res.status(502).json({ status: "fail", message: "Failed to update CORE Banking system. Ticket not cancelled." });
            }
        }
        const ticket = await ticketService.updateTicketStatus(id, 'CANCELLED');
        res.status(200).json({ status: "success", data: ticket });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelTicket = cancelTicket;
//# sourceMappingURL=ticketController.js.map