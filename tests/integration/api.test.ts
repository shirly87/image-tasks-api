import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from "../../src/app.js";
import mongoose from 'mongoose';
import { Task } from '../../src/models/Task.js';
import { createTestImage } from '../utils/ImageGenerator.js';
import http from 'http';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface ImageResponse {
    resolution: string;
    path: string;
}

// Función helper para esperar cambios de estado
async function pollStatus(taskId: string, timeoutMs: number = 10000): Promise<any> {
    const start = Date.now();
    const pollInterval = 100; // 100ms entre consultas
    
    while (Date.now() - start < timeoutMs) {
        const response = await request(app).get(`/tasks/${taskId}`);
        if (response.body.status === 'failed' || response.body.status === 'completed') {
            return response.body;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Timeout waiting for task status change after ${timeoutMs}ms`);
}

describe('API Integration Tests', () => {

    describe('POST /tasks', () => {
        it('should create a task and return taskId, status pending, and price', async () => {
            // Crear imagen de prueba específica para esta prueba
            const imagePath = await createTestImage(1000, 1000, 'jpg');
            
            const response = await request(app)
                .post('/tasks')
                .send({ imageSource: imagePath })
                .expect(201);

            expect(response.body).toHaveProperty('taskId');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('price');

            expect(response.body.status).toBe('pending');
            expect(typeof response.body.taskId).toBe('string');
            expect(typeof response.body.price).toBe('number');
            expect(response.body.price).toBeGreaterThanOrEqual(5);
            expect(response.body.price).toBeLessThanOrEqual(50);
        });

         it('should return 400 for missing imageSource', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error.code).toBe('INVALID_INPUT');
        });

        it('should return 400 for invalid imageSource type', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({ imageSource: 123 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('INVALID_INPUT');
        }); 
    });

    describe('GET /tasks/:taskId', () => {
        it('should return task status and price for pending task', async () => {
            // Crear imagen de prueba específica para esta prueba
            const imagePath = await createTestImage(500, 500, 'png');
            
            const createResponse = await request(app)
                .post('/tasks')
                .send({ imageSource: imagePath })
                .expect(201);

            const taskId = createResponse.body.taskId;

            const getResponse = await request(app)
                .get(`/tasks/${taskId}`)
                .expect(200);

            // Validar respuesta para tarea pendiente
            expect(getResponse.body).toHaveProperty('taskId', taskId);
            expect(getResponse.body).toHaveProperty('status', 'pending');
            expect(getResponse.body).toHaveProperty('price');
            expect(typeof getResponse.body.price).toBe('number');
            expect(getResponse.body).not.toHaveProperty('images');
        });

        it('should return 404 for non-existent taskId', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId().toString();
            
            const response = await request(app)
                .get(`/tasks/${fakeTaskId}`)
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should return 400 for invalid taskId format', async () => {
            const invalidTaskId = 'invalid-id';
            
            const response = await request(app)
                .get(`/tasks/${invalidTaskId}`)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('INVALID_INPUT');
        });
    });

    describe('Task Processing Failure', () => {
        it('should handle image processing failure and mark task as failed', async () => {
            // Crear tarea con imagen que no existe
            const fakeImagePath = '/tmp/no-existe-xyz-123.jpg';
            const createResponse = await request(app)
                .post('/tasks')
                .send({ imageSource: fakeImagePath })
                .expect(201);

            const taskId = createResponse.body.taskId;
            expect(createResponse.body.status).toBe('pending');

            const result = await pollStatus(taskId, 10000);
            expect(result.status).toBe('failed');

            const taskDoc = await Task.findById(taskId).lean();
            expect(taskDoc).toBeTruthy();
            expect(taskDoc!.status).toBe('failed');
            expect(typeof taskDoc!.error).toBe('string');
            expect(taskDoc!.error!.length).toBeGreaterThan(0);

            const getResponse = await request(app)
                .get(`/tasks/${taskId}`)
                .expect(200);

            expect(getResponse.body.status).toBe('failed');
            expect(getResponse.body).toHaveProperty('taskId', taskId);
            expect(getResponse.body).toHaveProperty('price');
            expect(getResponse.body).not.toHaveProperty('images');
        });
    });

    describe('Complete Task Flow', () => {
        it('should handle complete task lifecycle', async () => {
            const imagePath = await createTestImage(1200, 1200, 'jpg');

            const createResponse = await request(app)
                .post('/tasks')
                .send({ imageSource: imagePath })
                .expect(201);

            const taskId = createResponse.body.taskId;
            expect(createResponse.body.status).toBe('pending');

            // Verificar estado inicial (puede ser pending o ya completed por concurrencia)
            const initialResponse = await request(app)
                .get(`/tasks/${taskId}`)
                .expect(200);

            // Aceptar ambos estados válidos para evitar race conditions
            expect(['pending', 'completed']).toContain(initialResponse.body.status);
            
            if (initialResponse.body.status === 'completed') {
                expect(initialResponse.body).toHaveProperty('images');
                expect(Array.isArray(initialResponse.body.images)).toBe(true);
            } else {
                expect(initialResponse.body).not.toHaveProperty('images');
            }

            // Verificar que la tarea se complete correctamente
            const done = await pollStatus(taskId, 10000);
            expect(done.status).toBe("completed");
            expect(done).toHaveProperty('images');
            expect(Array.isArray(done.images)).toBe(true);

            const resolutions = done.images.map((i: ImageResponse) => i.resolution).sort();
            expect(resolutions).toEqual(["1024", "800"]);
            done.images.forEach((i: ImageResponse) => {
                expect(typeof i.path).toBe("string");
                expect(i.path.length).toBeGreaterThan(0);
                expect(i.path).toContain('output');
                expect(i.path).toContain(i.resolution);
            });
        });
    });

    describe('URL Processing', () => {
        it('should handle complete task lifecycle with URL', async () => {
            // Crear servidor HTTP local que devuelve una imagen
            const server = http.createServer(async (_req, res) => {
                const buf = await sharp({ 
                    create: { 
                        width: 50, 
                        height: 50, 
                        channels: 3, 
                        background: { r: 0, g: 255, b: 0 } 
                    }
                })
                .jpeg()
                .toBuffer();
                
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(buf);
            }).listen(0);

            const port = (server.address() as any).port;
            const url = `http://127.0.0.1:${port}/test-image.jpg`;

            try {
                // Crear tarea a partir de URL
                const createResponse = await request(app)
                    .post('/tasks')
                    .send({ imageSource: url })
                    .expect(201);

                const taskId = createResponse.body.taskId;
                expect(createResponse.body.status).toBe('pending');

                // Verificar que se complete el procesamiento
                const done = await pollStatus(taskId, 15000);
                expect(done.status).toBe('completed');
                expect(done).toHaveProperty('images');
                expect(Array.isArray(done.images)).toBe(true);
                expect(done.images.length).toBe(2);

                const resolutions = done.images.map((i: ImageResponse) => i.resolution).sort();
                expect(resolutions).toEqual(['1024', '800']);

                done.images.forEach((i: ImageResponse) => {
                    expect(typeof i.path).toBe('string');
                    expect(i.path.length).toBeGreaterThan(0);
                    expect(i.path).toContain('output');
                    expect(i.path).toContain(i.resolution);
                });
            } finally {
                server.close();
            }
        });

        it('should handle invalid URL and mark task as failed', async () => {
            const fakeUrl = 'http://localhost:9999/non-existent-image.jpg';
            
            // Crear tarea con URL falsa
            const createResponse = await request(app)
                .post('/tasks')
                .send({ imageSource: fakeUrl })
                .expect(201);

            const taskId = createResponse.body.taskId;
            expect(createResponse.body.status).toBe('pending');

            // Verificar que el procesamiento falle
            const result = await pollStatus(taskId, 15000);
            expect(result.status).toBe('failed');

            const taskDoc = await Task.findById(taskId).lean();
            expect(taskDoc).toBeTruthy();
            expect(taskDoc!.status).toBe('failed');
            expect(typeof taskDoc!.error).toBe('string');
            expect(taskDoc!.error!.length).toBeGreaterThan(0);

            const getResponse = await request(app)
                .get(`/tasks/${taskId}`)
                .expect(200);

            expect(getResponse.body.status).toBe('failed');
            expect(getResponse.body).toHaveProperty('taskId', taskId);
            expect(getResponse.body).toHaveProperty('price');
            expect(getResponse.body).not.toHaveProperty('images');
        });
    });

    afterAll(async () => {
        await fs.rm(path.resolve("tests/fixtures"), { recursive: true, force: true });
        await fs.rm(path.resolve("output"), { recursive: true, force: true });
    });
});
