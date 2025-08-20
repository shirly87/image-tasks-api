import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export async function createTestImage(
    width: number, 
    height: number, 
    format: 'jpg' | 'png' | 'webp' = 'jpg'
): Promise<string> {
    const outputPath = path.join(__dirname, `../fixtures/images/test-${width}x${height}.${format}`);
    
    // Crear directorio si no existe
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Crear imagen de prueba con Sharp
    await sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 255, g: 0, b: 0 }
        }
    })
    .toFile(outputPath);
    
    return outputPath;
}