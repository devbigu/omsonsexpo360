import express from 'express';
import { exhibitionUpload } from '../config/multer.js';
import { createExhibition, listExhibitions, duplicateExhibition, getLiveExhibitions, getExhibitionCards, deleteExhibition, getExhibitionChecklist, updateExhibitionChecklist, updateExhibition } from '../controllers/exhibitionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createExhibition);
router.put('/:id', protect, updateExhibition);
router.get('/', protect, listExhibitions);
router.get('/live/today', protect, getLiveExhibitions);
router.post('/:id/duplicate', protect, duplicateExhibition);
router.get('/:id/checklist', protect, getExhibitionChecklist);
router.put('/:id/checklist', protect, exhibitionUpload.fields([
  { name: 'perfInvoice', maxCount: 1 },
  { name: 'payslip', maxCount: 4 },
  { name: 'standDesign', maxCount: 1 },
  { name: 'samplesPackingList', maxCount: 1 },
  { name: 'insuranceFile', maxCount: 1 },
  { name: 'ticketFile', maxCount: 10 }, // Support up to 10 ticket files
  { name: 'exhibitorIdCard', maxCount: 10 } // Support up to 10 exhibitor ID cards
]), updateExhibitionChecklist);
router.get('/:id/cards', protect, getExhibitionCards);
router.delete('/:id', protect, deleteExhibition);

export default router;
