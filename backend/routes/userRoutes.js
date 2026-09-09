import express from 'express';
import { signupUser, sendOtp, verifyOtp, loginUser, checkAccess, getCurrentUser, listUsers } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signupUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.get('/check-access', protect, checkAccess);
router.get('/me', protect, getCurrentUser);
router.get('/', protect, listUsers);

export default router;
