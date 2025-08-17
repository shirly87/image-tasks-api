import { Router } from 'express';
import { TaskController } from '../controllers/TaskController.js';

const router = Router();

// POST /tasks - Crear una nueva tarea de procesamiento
router.post('/', TaskController.createTask);

// GET /tasks/:taskId - Consultar estado de una tarea
router.get('/:taskId', TaskController.getTask);

export default router;
