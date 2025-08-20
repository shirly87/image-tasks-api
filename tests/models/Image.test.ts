import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Image } from '../../src/models/Image.js';
import { Task, ITask } from '../../src/models/Task.js';
import crypto from 'crypto';

describe('Image Model', () => {
  let testTask: ITask;

  beforeEach(async () => {
    testTask = new Task({
      status: 'pending',
      price: 25.50,
      originalPath: '/test/image.jpg',
      images: []
    });
    await testTask.save();
  });

  describe('Schema Validation', () => {
    it('should create a valid image', async () => {
      const testData = 'test-image-data-1024';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const validImage = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1024',
        path: `/output/test/1024/${realMd5}.jpg`,
        md5: realMd5
      });

      const savedImage = await validImage.save();
      expect(savedImage._id).toBeDefined();
      expect(savedImage.taskId.toString()).toBe((testTask._id as mongoose.Types.ObjectId).toString());
      expect(savedImage.resolution).toBe('1024');
      expect(savedImage.path).toBe(`/output/test/1024/${realMd5}.jpg`);
      expect(savedImage.md5).toBe(realMd5);
      expect(savedImage.createdAt).toBeInstanceOf(Date);
    });

    it('should require taskId', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const imageWithoutTaskId = new Image({
        resolution: '1024',
        path: `/output/test/1024/${realMd5}.jpg`,
        md5: realMd5
      });

      try {
        await imageWithoutTaskId.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.taskId).toBeDefined();
        expect(error.errors.taskId.message).toContain('required');
      }
    });

    it('should require resolution', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const imageWithoutResolution = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        path: `/output/test/1024/${realMd5}.jpg`,
        md5: realMd5
      });

      try {
        await imageWithoutResolution.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.resolution).toBeDefined();
        expect(error.errors.resolution.message).toContain('required');
      }
    });

    it('should require path', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const imageWithoutPath = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1024',
        md5: realMd5
      });

      try {
        await imageWithoutPath.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.path).toBeDefined();
        expect(error.errors.path.message).toContain('required');
      }
    });

    it('should require md5', async () => {
      const imageWithoutMd5 = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1024',
        path: '/output/test/1024/test.jpg'
      });

      try {
        await imageWithoutMd5.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.md5).toBeDefined();
        expect(error.errors.md5.message).toContain('required');
      }
    });

    it('should only accept valid resolutions', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const invalidImage = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1920',
        path: `/output/test/1920/${realMd5}.jpg`,
        md5: realMd5
      });

      try {
        await invalidImage.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors.resolution).toBeDefined();
        expect(error.errors.resolution.message).toContain('enum');
      }
    });

    it('should trim string fields', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const imageWithSpaces = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1024',
        path: ` /output/test/1024/${realMd5}.jpg `,
        md5: `${realMd5}`
      });

      const savedImage = await imageWithSpaces.save();
      expect(savedImage.resolution).toBe('1024');
      expect(savedImage.path).toBe(`/output/test/1024/${realMd5}.jpg`);
      expect(savedImage.md5).toBe(realMd5);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt but not updatedAt', async () => {
      const testData = 'test-image-data';
      const realMd5 = crypto.createHash('md5').update(testData).digest('hex');
      
      const image = new Image({
        taskId: testTask._id as mongoose.Types.ObjectId,
        resolution: '1024',
        path: `/output/test/1024/${realMd5}.jpg`,
        md5: realMd5
      });

      const savedImage = await image.save();
      expect(savedImage.createdAt).toBeInstanceOf(Date);
      expect(savedImage).not.toHaveProperty('updatedAt');
    });
  });


});
