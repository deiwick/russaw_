import { Router } from 'express';
import { 
  registerOperator, 
  loginOperator, 
  getForumPosts, 
  postForumMessage 
} from '../controllers/operatorsController';
import { authenticateOperator } from '../middleware/authMiddleware';

const router = Router();

// Public Authentication Endpoints
router.post('/register', registerOperator);
router.post('/login', loginOperator);

// Protected Forum Channels
router.get('/forum', authenticateOperator, getForumPosts);
router.post('/forum', authenticateOperator, postForumMessage);

export default router;
