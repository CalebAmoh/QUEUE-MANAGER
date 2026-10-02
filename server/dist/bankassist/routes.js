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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const ticketController = __importStar(require("./ticketController"));
const adController = __importStar(require("./adController"));
const router = (0, express_1.Router)();
// Debug route to verify bankassist routes are active
console.log("Initializing BankAssist Routes...");
router.get("/health", (req, res) => res.json({ status: "ok", message: "BankAssist routes are active" }));
// Multer Storage Configuration
const storage = multer_1.default.diskStorage({
    destination: (req, res, cb) => {
        // Save to the ads uploads folder
        cb(null, path_1.default.join(__dirname, '../../../uploads/ads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
// Ticket routes
router.patch("/tickets/:id/cancel", ticketController.cancelTicket);
router.post("/tickets", ticketController.createTicket);
router.get("/tickets", ticketController.getTickets);
router.get("/queue/waiting", ticketController.getWaitingTickets);
router.get("/queue/skipped", ticketController.getSkippedTickets);
router.patch("/tickets/:id/call", ticketController.callTicket);
router.patch("/tickets/:id/start", ticketController.startService);
router.patch("/tickets/:id/complete", ticketController.completeService);
router.patch("/tickets/:id/skip", ticketController.skipTicket);
router.patch("/tickets/:id/recall", ticketController.recallTicket);
// Office routes
router.get("/offices", ticketController.getOffices);
router.post("/offices", ticketController.createOffice);
router.patch("/offices/:id", ticketController.updateOffice);
router.patch("/offices/:id/status", ticketController.updateOfficeStatus);
router.patch("/offices/:id/services", ticketController.updateOfficeServices);
router.delete("/offices/:id", ticketController.deleteOffice);
router.get("/teller-activities/:username", ticketController.getTellerActivities);
router.get("/branches", ticketController.getBranches);
router.get("/branches/:code", ticketController.getBranchInfo);
// Ad Routes
router.get('/ads', adController.getAds);
router.post('/ads', upload.single('file'), adController.createAd);
router.put('/ads/:id', adController.updateAd);
router.delete('/ads/:id', adController.deleteAd);
exports.default = router;
//# sourceMappingURL=routes.js.map