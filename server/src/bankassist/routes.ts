import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as ticketController from './ticketController';
import * as adController from './adController';

const router = Router();

// Debug route to verify bankassist routes are active
console.log("Initializing BankAssist Routes...");
router.get("/health", (req, res) => res.json({ status: "ok", message: "BankAssist routes are active" }));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    // Save to the ads uploads folder
    cb(null, path.join(__dirname, '../../../uploads/ads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
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

export default router;
