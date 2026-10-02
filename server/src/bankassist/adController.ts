import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { prisma } from '../index';
import { emitEvent } from './socket';

const MAX_ADS = 10;
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/ads');

export const getAds = async (req: Request, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({ orderBy: { created_at: 'desc' } });
    res.json({ success: true, data: ads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createAd = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Check count
    const adCount = await prisma.ad.count();
    
    if (adCount >= MAX_ADS) {
      // Remove the oldest ad and its file
      const oldestAd = await prisma.ad.findFirst({
        orderBy: { created_at: 'asc' },
      });
      
      if (oldestAd) {
        const filePath = path.join(__dirname, '../../../', oldestAd.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await prisma.ad.delete({ where: { id: oldestAd.id } });
      }
    }

    const { title, type, display_type } = req.body;
    const url = `uploads/ads/${req.file.filename}`;

    const ad = await prisma.ad.create({
      data: {
        title,
        url,
        type: type || 'image',
        active: true,
        display_type: (display_type || 'landscape').toUpperCase(),
      },
    });
    
    emitEvent('ad:updated', ad);
    res.status(201).json({ success: true, data: ad });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAd = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { display_type, active, title } = req.body;
    
    const updateData: any = {};
    if (display_type !== undefined) updateData.display_type = String(display_type).toUpperCase();
    if (active !== undefined) updateData.active = Boolean(active);
    if (title !== undefined) updateData.title = String(title);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, message: 'No update data provided' });
      return;
    }

    try {
      const ad = await prisma.ad.update({
        where: { id },
        data: updateData,
      });
      emitEvent('ad:updated', ad);
      res.json({ success: true, data: ad });
    } catch {
      res.status(404).json({ success: false, message: 'Ad not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAd = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const ad = await prisma.ad.findUnique({ where: { id } });
    
    if (ad) {
      const filePath = path.join(__dirname, '../../../', ad.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const deletedAd = await prisma.ad.delete({ where: { id } });
      emitEvent('ad:updated', deletedAd);
      res.json({ success: true, message: 'Ad deleted successfully' });
      return;
    }
    
    res.status(404).json({ success: false, message: 'Ad not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
