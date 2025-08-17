import { Request, Response } from 'express';
import { Task, Image, ITask } from '../models/index.js';
import { Types } from 'mongoose';
import { queue } from "../jobs/queue.js";
import { taskService } from '../services/TaskService.js';

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

interface ErrorResponse {
    error: string;
}

export class TaskController {
    
    /**
     * POST /tasks - Crear una nueva tarea de procesamiento
     */
    public static async createTask(req: Request, res: Response): Promise<void> {
        try {
            console.log("CWD:", process.cwd())
            const { originalPath } = req.body;
            
            if (!originalPath || typeof originalPath !== 'string') {
                const errorResponse: ErrorResponse = {
                    error: 'originalPath is required and must be a string'
                };
                res.status(400).json(errorResponse);
                return;
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
            
        } catch (error) {
            console.error('Error creating task:', error);
            const errorResponse: ErrorResponse = {
                error: 'Internal server error'
            };
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * GET /tasks/:taskId - Consultar estado de una tarea
     */
    public static async getTask(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.params;
            
            if (!taskId) {
                const errorResponse: ErrorResponse = {
                    error: 'taskId is required'
                };
                res.status(400).json(errorResponse);
                return;
            }
            
            const task = await Task.findById(taskId);
            
            if (!task || !task._id) {
                const errorResponse: ErrorResponse = {
                    error: 'Task not found'
                };
                res.status(404).json(errorResponse);
                return;
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
            
        } catch (error) {
            console.error('Error getting task:', error);
            const errorResponse: ErrorResponse = {
                error: 'Internal server error'
            };
            res.status(500).json(errorResponse);
        }
    }
}
