import express from 'express';
import {
    adminLogin,
    getAdminProfile,
    updateAdminProfile,
    getIpRequests,
    approveIpRequest,
    exportExhibitions,
    exportExhibitionCards,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
} from '../controllers/adminController.js';
import { adminProtect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/me', adminProtect, getAdminProfile);
router.put('/me', adminProtect, updateAdminProfile);
router.get('/ip-requests', adminProtect, getIpRequests);
router.put('/ip-requests/:id', adminProtect, approveIpRequest);
router.get('/export/exhibitions', adminProtect, exportExhibitions);
router.get('/export/exhibitions/:id/cards', adminProtect, exportExhibitionCards);

// User Management Routes
router.route('/users')
    .get(adminProtect, getUsers)
    .post(adminProtect, createUser);

router.route('/users/:id')
    .put(adminProtect, updateUser)
    .delete(adminProtect, deleteUser);

// Admin Management Routes (Super Admin)
router.route('/admins')
    .get(adminProtect, getAdmins)
    .post(adminProtect, createAdmin);

router.route('/admins/:id')
    .put(adminProtect, updateAdmin)
    .delete(adminProtect, deleteAdmin);

export default router;

