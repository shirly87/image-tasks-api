import { Router } from 'express';
import { TaskController } from '../controllers/TaskController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/', asyncHandler(TaskController.createTask));
router.get('/:taskId', asyncHandler(TaskController.getTask));

export default router;
