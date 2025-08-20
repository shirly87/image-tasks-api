import { Router } from 'express';
import { TaskController } from '../controllers/TaskController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const tasksRouter = Router();

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Crear una nueva tarea de procesamiento de imagen
 *     description: Crea una tarea en estado pendiente con un precio aleatorio asignado
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Tarea creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateTaskResponse'
 *       400:
 *         description: Solicitud inválida
 *         content:
 *           application/json:
 *             examples:
 *               InvalidInput:
 *                 value:
 *                   error:
 *                     message: "Original path is required"
 *                     code: "INVALID_INPUT"
 *                     statusCode: 400
 *                     timestamp: "2025-08-18T20:38:10.984Z"
 *                     path: "/tasks"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             examples:
 *               InternalError:
 *                 value:
 *                   error:
 *                     message: "An unexpected error occurred"
 *                     code: "INTERNAL_ERROR"
 *                     statusCode: 500
 *                     timestamp: "2025-08-18T20:38:10.984Z"
 *                     path: "/tasks"
 */
tasksRouter.post('/', asyncHandler(TaskController.createTask));

/**
 * @swagger
 * /tasks/{taskId}:
 *   get:
 *     summary: Obtener el estado y detalles de una tarea
 *     description: Devuelve el estado de la tarea, el precio asociado, y los detalles de las variantes procesadas si la tarea fue completada.
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la tarea
 *         example: 65d4a54b89c5e342b2c2c5f6
 *     responses:
 *       200:
 *         description: Detalles de la tarea
 *         content:
 *           application/json:
 *             examples:
 *               PendingTask:
 *                 value:
 *                   taskId: "65d4a54b89c5e342b2c2c5f6"
 *                   status: "pending"
 *                   price: 25.5
 *               CompletedTask:
 *                 value:
 *                   taskId: "65d4a54b89c5e342b2c2c5f6"
 *                   status: "completed"
 *                   price: 25.5
 *                   images:
 *                     - resolution: "1024"
 *                       path: "/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg"
 *                     - resolution: "800"
 *                       path: "/output/image1/800/202fd8b3174a774bac24428e8cb230a1.jpg"
 *               FailedTask:
 *                 value:
 *                   taskId: "65d4a54b89c5e342b2c2c5f6"
 *                   status: "failed"
 *                   price: 25.5
 *       400:
 *         description: ID de tarea inválido
 *         content:
 *           application/json:
 *             examples:
 *               InvalidTaskId:
 *                 value:
 *                   error:
 *                     message: "Invalid taskId format"
 *                     code: "INVALID_INPUT"
 *                     statusCode: 400
 *                     timestamp: "2025-08-18T20:38:10.984Z"
 *                     path: "/tasks/invalid-id"
 *       404:
 *         description: Tarea no encontrada
 *         content:
 *           application/json:
 *             examples:
 *               TaskNotFound:
 *                 value:
 *                   error:
 *                     message: "Task not found"
 *                     code: "NOT_FOUND"
 *                     statusCode: 404
 *                     timestamp: "2025-08-18T20:38:10.984Z"
 *                     path: "/tasks/non-existent-id"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             examples:
 *               InternalError:
 *                 value:
 *                   error:
 *                     message: "An unexpected error occurred"
 *                     code: "INTERNAL_ERROR"
 *                     statusCode: 500
 *                     timestamp: "2025-08-18T20:38:10.984Z"
 *                     path: "/tasks/65d4a54b89c5e342b2c2c5f6"
 */
tasksRouter.get('/:taskId', asyncHandler(TaskController.getTask));

export default tasksRouter;
