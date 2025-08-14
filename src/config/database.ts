import mongoose, { ConnectOptions, Connection } from 'mongoose';
import { env } from './env.js';

const MONGODB_URI: string = env.MONGODB_URI ?? 'mongodb://localhost:27017/image-tasks-api';

interface MongoConnectionOptions extends ConnectOptions {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
}

interface DatabaseStats {
    readyState: number;
    host: string;
    port: number;
    name: string;
    readyStateText: ReadyStateText;
}

type ReadyStateText = 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';

const connectionOptions: MongoConnectionOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

export const connectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI, connectionOptions);
        console.log('MongoDB conectado exitosamente');
        
        const connection: Connection = mongoose.connection;
        
        connection.on('error', (error: Error) => {
            console.error('Error de conexión MongoDB:', error);
        });
        
        connection.on('disconnected', () => {
            console.log('MongoDB desconectado');
        });
        
        connection.on('reconnected', () => {
            console.log('MongoDB reconectado');
        });
        
        process.on('SIGINT', async (): Promise<void> => {
            await connection.close();
            console.log('Conexión MongoDB cerrada por terminación del proceso');
            process.exit(0);
        });
        
        process.on('SIGTERM', async (): Promise<void> => {
            await connection.close();
            console.log('Conexión MongoDB cerrada por señal SIGTERM');   
            process.exit(0);
        });
        
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error al conectar MongoDB:', errorMessage);
        process.exit(1);
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        console.log('Conexión MongoDB cerrada');
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error al cerrar conexión MongoDB:', errorMessage);
    }
};

export const isDatabaseConnected = (): boolean => {
    return mongoose.connection.readyState === 1;
};

export const getDatabaseStats = (): DatabaseStats => {
    const connection: Connection = mongoose.connection;
    const readyStateTexts: ReadyStateText[] = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    return {
        readyState: connection.readyState,
        host: connection.host,
        port: connection.port,
        name: connection.name,
        readyStateText: readyStateTexts[connection.readyState]
    };
};
