import { Router } from 'express';
import {
    validateUserCreate,
    validateUserId,
    validateUserUpdate,
    validateUserEmail,
    validatePagination
} from '../validators/userValidators';
import { userController } from '../controllers/userController';

const router = Router();

// POST /api/users - Create a new user
router.post('/', validateUserCreate, userController.createUser.bind(userController));

// GET /api/users - Get all users with pagination
router.get('/', validatePagination, userController.getUsers.bind(userController));

// GET /api/users/:id - Get user by ID
router.get('/:id', validateUserId, userController.getUserById.bind(userController));

// GET /api/users/search/email - Get user by email
router.get('/search/email', validateUserEmail, userController.getUserByEmail.bind(userController));

// PUT /api/users/:id - Update a user
router.put('/:id', validateUserId, validateUserUpdate, userController.updateUser.bind(userController));

// DELETE /api/users/:id - Delete a user
router.delete('/:id', validateUserId, userController.deleteUser.bind(userController));


export default router;
