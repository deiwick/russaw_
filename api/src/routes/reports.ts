import { Router } from 'express';
import multer from 'multer';
import { createReport, getReports } from '../controllers/reportsController';

const router = Router();

// Multer memory storage configuration for metadata scrubbing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB strict upload limit to mitigate disk space DOS
  },
  fileFilter: (req, file, cb) => {
    // Restrict to standard JPEGs and PNGs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEGs and PNGs are accepted in the Void.'));
    }
  }
});

// GET /api/reports - Fetch spatial log ledger
router.get('/', getReports);

// POST /api/reports - Anonymous filing
router.post('/', upload.single('evidence'), createReport);

export default router;
