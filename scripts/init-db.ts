import mongoose from 'mongoose';
import { Task, ITask } from '../src/models/Task.js';
import { Image, IImage } from '../src/models/Image.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { taskService } from '../src/services/TaskService.js';
import { env } from '../src/config/env.js';

const MONGODB_URI = process.env.MONGODB_URI || env.MONGODB_URI;

async function createTestImage(
  width: number, 
  height: number, 
  format: 'jpg' | 'png' | 'webp'
): Promise<string> {
  const scriptDir = 'scripts/fixtures';
  await fs.mkdir(scriptDir, { recursive: true });
  
  const filename = `test-${width}x${height}.${format}`;
  const filepath = path.join(scriptDir, filename);
  
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 100, b: 100 }
    }
  })
  .toFile(filepath);
  
  return filepath;
}

async function initDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    await Task.deleteMany({});
    await Image.deleteMany({});
    console.log('✅ Colecciones limpias');

    const image1Path = await createTestImage(1600, 900, 'png');
    const image2Path = await createTestImage(600, 400, 'jpg');
    console.log('✅ Imágenes de ejemplo creadas');

    const task1: ITask = new Task({
      status: 'pending',
      price: 25.50,
      originalPath: image1Path,
      images: []
    });
    const task2: ITask = new Task({
      status: 'pending',
      price: 18.75,
      originalPath: image2Path,
      images: []
    });

    const savedTask1: ITask = await task1.save();
    const savedTask2: ITask = await task2.save();

    const failedTask: ITask = new Task({
      status: 'pending',
      price: 42.00,
      originalPath: '/path/to/non-existent-image.jpg',
      images: []
    });
    const savedFailedTask: ITask = await failedTask.save();

    await taskService.processTaskImages(savedTask1._id as mongoose.Types.ObjectId, image1Path);
    await taskService.processTaskImages(savedTask2._id as mongoose.Types.ObjectId, image2Path);
    await taskService.processTaskImages(savedFailedTask._id as mongoose.Types.ObjectId, '/path/to/non-existent-image.jpg');

    const finalTask1: ITask | null = await Task.findById(savedTask1._id);
    const finalTask2: ITask | null = await Task.findById(savedTask2._id);
    const finalFailedTask: ITask | null = await Task.findById(savedFailedTask._id);

    if (!finalTask1 || !finalTask2 || !finalFailedTask) {
      throw new Error('No se pudieron recuperar las tareas finales');
    }

    console.log('✅ Tareas finales:');
    console.log('   - Tarea 1:', finalTask1.status, finalTask1.images?.length || 0, 'variantes');
    console.log('   - Tarea 2:', finalTask2.status, finalTask2.images?.length || 0, 'variantes');
    console.log('   - Tarea fallida:', finalFailedTask.status, finalFailedTask.error || 'N/A');

  } catch (error) {
    console.error('Error procesando imágenes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

initDatabase();
