"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAd = exports.updateAd = exports.createAd = exports.getAds = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../index");
const socket_1 = require("./socket");
const MAX_ADS = 10;
const UPLOAD_DIR = path_1.default.join(__dirname, '../../../uploads/ads');
const getAds = async (req, res) => {
    try {
        const ads = await index_1.prisma.ad.findMany({ orderBy: { created_at: 'desc' } });
        res.json({ success: true, data: ads });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAds = getAds;
const createAd = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        // Check count
        const adCount = await index_1.prisma.ad.count();
        if (adCount >= MAX_ADS) {
            // Remove the oldest ad and its file
            const oldestAd = await index_1.prisma.ad.findFirst({
                orderBy: { created_at: 'asc' },
            });
            if (oldestAd) {
                const filePath = path_1.default.join(__dirname, '../../../', oldestAd.url);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                await index_1.prisma.ad.delete({ where: { id: oldestAd.id } });
            }
        }
        const { title, type, display_type } = req.body;
        const url = `uploads/ads/${req.file.filename}`;
        const ad = await index_1.prisma.ad.create({
            data: {
                title,
                url,
                type: type || 'image',
                active: true,
                display_type: (display_type || 'landscape').toUpperCase(),
            },
        });
        (0, socket_1.emitEvent)('ad:updated', ad);
        res.status(201).json({ success: true, data: ad });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createAd = createAd;
const updateAd = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { display_type, active, title } = req.body;
        const updateData = {};
        if (display_type !== undefined)
            updateData.display_type = String(display_type).toUpperCase();
        if (active !== undefined)
            updateData.active = Boolean(active);
        if (title !== undefined)
            updateData.title = String(title);
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ success: false, message: 'No update data provided' });
            return;
        }
        try {
            const ad = await index_1.prisma.ad.update({
                where: { id },
                data: updateData,
            });
            (0, socket_1.emitEvent)('ad:updated', ad);
            res.json({ success: true, data: ad });
        }
        catch {
            res.status(404).json({ success: false, message: 'Ad not found' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateAd = updateAd;
const deleteAd = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const ad = await index_1.prisma.ad.findUnique({ where: { id } });
        if (ad) {
            const filePath = path_1.default.join(__dirname, '../../../', ad.url);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            const deletedAd = await index_1.prisma.ad.delete({ where: { id } });
            (0, socket_1.emitEvent)('ad:updated', deletedAd);
            res.json({ success: true, message: 'Ad deleted successfully' });
            return;
        }
        res.status(404).json({ success: false, message: 'Ad not found' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deleteAd = deleteAd;
//# sourceMappingURL=adController.js.map