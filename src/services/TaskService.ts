import { Types } from "mongoose";
import { Task, Image } from "../models/index.js";
import { ImageService } from "./ImageService.js";
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/types.js";

export class TaskService {
  constructor(private imageService = new ImageService("output")) {}

  /**
   * Caso de uso: procesar imágenes de la Task.
   * - Mantiene aspect ratio (fit: inside)
   * - Evita upscaling (withoutEnlargement: true)
   * - Persiste imágenes y estados (completed/failed) en la Task
   */
  async processTaskImages(taskId: Types.ObjectId, originalPath: string): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
        throw new AppError(
            `Task ${taskId} not found`, 
            404, 
            ErrorCodes.NOT_FOUND
        );
    }

    console.log(`Iniciando procesamiento de tarea ${taskId}`);

    try {
      const variants = await this.imageService.processImage(originalPath, [1024, 800], {
        fit: "inside",
        withoutEnlargement: true
      });

      await Image.insertMany(
        variants.map(v => ({
          taskId: task._id,
          resolution: String(v.resolution),
          path: v.path,
          md5: v.md5,
          createdAt: v.createdAt
        }))
      );

      task.status = "completed";
      task.images = variants.map(v => ({
        resolution: String(v.resolution),
        path: v.path,
        md5: v.md5
      }));
      await task.save();

      console.log(`Tarea ${taskId} procesada exitosamente`);

    } catch (err: any) {
      console.error(`Error procesando tarea ${taskId}:`, err.message);
      task.status = "failed";
      task.error = String(err?.message ?? err);
      await task.save();
    }
  }
}

export const taskService = new TaskService();
