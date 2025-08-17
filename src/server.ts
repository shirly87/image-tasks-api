import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { requeuePendingTasks } from './bootstrap/requeuePending.js';

const PORT = env.PORT ?? 4000;
const NODE_ENV = env.NODE_ENV ?? 'development';

const startServer = async (): Promise<void> => {
    try {
        //Conectar a la base de datos
        await connectDatabase();

        //Encolar tareas pendientes
        try {
            await requeuePendingTasks();
        } catch (e) {
            console.error("[requeue] startup error:", e);
        }
        
        const server = app.listen(PORT, () => {
            console.log(`API is running on port ${PORT} in ${NODE_ENV} mode`);
        });

        const gracefulShutdown = async (signal: string): Promise<void> => {
            console.log(`${signal} received, shutting down gracefully...`);
            server.close(async () => {
                await disconnectDatabase();
                console.log('Server closed');
                process.exit(0); 
            });
        };

        process.on('SIGTERM', (): Promise<void> => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', (): Promise<void> => gracefulShutdown('SIGINT'));
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();