import { describe, it, expect } from 'vitest';
import { Task } from '../../src/models/Task.js';

describe('Task Model', () => {
    describe('generateRandomPrice', () => {
        it('should generate price between 5 and 50', () => {
            for (let i = 0; i < 50; i++) {
                const price = Task.generateRandomPrice();
                
                expect(typeof price).toBe('number');
                expect(Number.isFinite(price)).toBe(true);
                expect(price).toBeGreaterThanOrEqual(5);
                expect(price).toBeLessThanOrEqual(50);
            }
        });

        it('should return a number', () => {
            const price = Task.generateRandomPrice();
            expect(typeof price).toBe('number');
        });

        it('should return different prices on multiple calls', () => {
            const xs = Array.from({ length: 1000 }, () => Task.generateRandomPrice());
            expect(Math.min(...xs)).toBeGreaterThanOrEqual(5);
            expect(Math.max(...xs)).toBeLessThanOrEqual(50);
        });
    });
});