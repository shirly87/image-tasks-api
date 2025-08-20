import { Task } from "../models/index.js";
import { queue } from "../jobs/queue.js";
import { taskService } from "../services/TaskService.js";
import { Types } from "mongoose";

/**
 * Re-encola tareas pendientes de la base de datos.
 * @description
 * Busca tareas con status "pending" en la base de datos y las re-encola para su procesamiento.
 * Utilizado para recuperar tareas pendientes al arrancar el servidor.
 * @returns Promise<void> - Re-encola tareas pendientes
 * @throws Error - Si ocurre un error al re-encolar tareas pendientes
 */
export async function requeuePendingTasks(): Promise<void> {
    try {
        const pendings = await Task.find(
            { status: "pending" },
            { _id: 1, originalPath: 1 }
        ).lean();
        console.log("Tareas pendientes: ", pendings.length, pendings);

        for (const task of pendings) {
            queue.push(() => taskService.processTaskImages(task._id as Types.ObjectId, task.originalPath));
        }
        console.log(`[requeue] pending enqueued: ${pendings.length}`);

    } catch (error) {
        console.error("Error al requeuear tareas pendientes:", error);
    }
}
