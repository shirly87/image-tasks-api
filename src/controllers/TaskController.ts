import { Request, Response } from 'express';
import { Task, Image, ITask } from '../models/index.js';
import { Types } from 'mongoose';
import { queue } from "../jobs/queue.js";
import { taskService } from '../services/TaskService.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/types.js';

interface ImageResponse {
    resolution: string;
    path: string;
}

interface CreateTaskResponse {
    taskId: string;
    status: string;
    price: number;
}

interface GetTaskResponse {
    taskId: string;
    status: string;
    price: number;
    images?: ImageResponse[];
}

export class TaskController {
    
    /**
     * POST /tasks - Crear una nueva tarea de procesamiento
     * @param req - Request de Express con el body { imageSource: string }
     * @param res - Response de Express con respuesta
     * @throws AppError - Si el imageSource no es un string, no es proporcionado, o no es válido
     * @returns Promise<void> - Responde con el taskId, status y price de la tarea creada
     * 
     * @example
     * POST /tasks
     * Body: { "imageSource": "/path/to/image.jpg" } o { "imageSource": "https://example.com/image.jpg" }
     * Response: { "taskId": "65d4a54b89c5e342b2c2c5f6", "status": "pending", "price": 25.50 }
     */
    public static async createTask(req: Request, res: Response): Promise<void> {
            
            const { imageSource } = req.body;
            
            if (!imageSource || typeof imageSource !== 'string' || !imageSource.trim()) {
                throw new AppError(
                    'imageSource is required and must be a string', 
                    400, 
                    ErrorCodes.INVALID_INPUT
                );
            }
            
            const price = Task.generateRandomPrice();
            
            const task: ITask = new Task({
                price,
                originalPath: imageSource.trim(),
                images: []
            });
            
            const savedTask = await task.save();
            
            const response: CreateTaskResponse = {
                taskId: (savedTask._id as Types.ObjectId).toString(),
                status: savedTask.status,
                price: savedTask.price
            };

            res.status(201).json(response);

            //Encolar el caso de uso para procesar las imágenes
            queue.push(async () => {
                await taskService.processTaskImages(savedTask._id as Types.ObjectId, imageSource);
            });          
    }
    
    /**
     * GET /tasks/:taskId - Consultar una tarea específica
     * @param req - Request de Express con el parámetro taskId
     * @param res - Response de Express con respuesta
     * @throws AppError - Si el taskId no es un string, no es proporcionado, no es un ObjectId válido o no existe
     * @returns Promise<void> - Responde con el taskId, status, price y images de la tarea consultada si la tarea fue completada
     * 
     * @example
     * GET /tasks/65d4a54b89c5e342b2c2c5f6
     * Response: { "taskId": "65d4a54b89c5e342b2c2c5f6", "status": "completed", "price": 25.50, "images": [ { "resolution": "1024", "path": "/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg" }, { "resolution": "800", "path": "/output/image1/800/202fd8b3174a774bac24428e8cb230a1.jpg" } ] }
     */
    public static async getTask(req: Request, res: Response): Promise<void> {

            const { taskId } = req.params;
            
            if (!taskId) {
                throw new AppError(
                    'taskId is required', 
                    400, 
                    ErrorCodes.INVALID_INPUT
                );
            }

            if (!Types.ObjectId.isValid(taskId)) {
                throw new AppError(
                    'Invalid taskId format', 
                    400, 
                    ErrorCodes.INVALID_INPUT
                );
            }
            
            const task = await Task.findById(taskId);
            
            if (!task || !task._id) {
                throw new AppError(
                    'Task not found', 
                    404, 
                    ErrorCodes.NOT_FOUND
                );
            }
            
            const response: GetTaskResponse = {
                taskId: (task._id as Types.ObjectId).toString(),
                status: task.status,
                price: task.price
            };
            
            if (task.status === 'completed') {
                const taskImages = await Image.find({ taskId: task._id });
                response.images = taskImages.map(img => ({
                    resolution: img.resolution,
                    path: img.path
                }));
            }
            
            res.status(200).json(response);
            
    }
}
