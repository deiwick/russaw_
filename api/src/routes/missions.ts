import { Router } from 'express';
import multer from 'multer';
import { getMissions, verifyMission } from '../controllers/missionsController';

const router = Router();

// Multer memory storage configuration for metadata scrubbing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB strict upload limit to mitigate disk space DOS
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEGs and PNGs are accepted for verifications.'));
    }
  }
});

// GET /api/missions - Retrieve geofenced weekly targets
router.get('/', getMissions);

// POST /api/missions/verify - Proximity coordinates audit
router.post('/verify', upload.single('evidence'), verifyMission);

export default router;
