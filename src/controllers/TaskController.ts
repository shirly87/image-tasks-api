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
     */
    public static async createTask(req: Request, res: Response): Promise<void> {
            
            const { originalPath } = req.body;
            
            if (!originalPath || typeof originalPath !== 'string') {
                throw new AppError(
                    'originalPath is required and must be a string', 
                    400, 
                    ErrorCodes.INVALID_INPUT
                );
            }
            
            const price = Task.generateRandomPrice();
            
            const task: ITask = new Task({
                price,
                originalPath,
                images: []
            });
            console.log("Task created with price ", price, " and original path ", originalPath);
            
            const savedTask = await task.save();
            
            const response: CreateTaskResponse = {
                taskId: (savedTask._id as Types.ObjectId).toString(),
                status: savedTask.status,
                price: savedTask.price
            };

            res.status(201).json(response);

            //Encolar el caso de uso para procesar las imágenes
            queue.push(async () => {
                await taskService.processTaskImages(savedTask._id as Types.ObjectId, originalPath);
            });          
    }
    
    /**
     * GET /tasks/:taskId - Consultar estado de una tarea
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
