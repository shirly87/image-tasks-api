import sharp, { Sharp } from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/types.js";

type ResizeFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface VariantInfo {
  resolution: number;   // (1024, 800)
  path: string;         // /output/{nombre}/{resolucion}/{md5}.{ext}
  md5: string;
  width: number;        // ancho real de salida
  height: number;       // alto real de salida
  size: number;         // bytes
  createdAt: Date;
}

export interface ProcessOptions {
  fit?: ResizeFit;                 // default "inside"
  withoutEnlargement?: boolean;    // default true
  outputFormat?: "original" | "jpeg" | "png" | "webp" | "avif" | "tiff" | "gif";
}

export class ImageService {
  constructor(private baseOutputDir: string = "output") {}

  private async ensureDir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private md5(buffer: Buffer) {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  private isUrl(input: string): boolean {
    try { new URL(input); return true; } catch { return false; }
  }

  private getBaseNameAndExt(inputPathOrUrl: string, fallbackExt = "jpg") {
    const source = this.isUrl(inputPathOrUrl)
      ? new URL(inputPathOrUrl).pathname
      : inputPathOrUrl;

    let ext = path.extname(source).replace(".", "").toLowerCase();
    let baseName = path.basename(source, path.extname(source));

    if (!ext) ext = fallbackExt;
    if (!baseName) baseName = "image";
    if (ext === "jpeg") ext = "jpg";

    return { baseName, ext };
  }

  private async getImageInfo(imagePath: string) {
    const meta = await sharp(imagePath).metadata();
    console.log("Image info:", meta.format, meta.size, 'width:', meta.width, 'height:', meta.height);
  }
  
  /**
   * Genera variantes por ancho manteniendo aspect ratio y sin upscaling.
   * Guarda en: /output/{nombre}/{resolucion}/{md5}.{ext}
   */
   public async processImage(
    inputPathOrUrl: string,
    resolutions: number[],
    opts: ProcessOptions = {}
  ): Promise<VariantInfo[]> {
    if (!resolutions?.length) {
      throw new AppError(
        "At least one resolution must be specified", 
        500, 
        ErrorCodes.INTERNAL_ERROR
      );
    }

    const { baseName, ext: originalExt } = this.getBaseNameAndExt(inputPathOrUrl);
    const chosenFormat = opts.outputFormat ?? "original";

    await this.getImageInfo(inputPathOrUrl);

    const base: Sharp = sharp(inputPathOrUrl, { animated: true }).autoOrient();

    const results = await Promise.all(
      resolutions.map(async (width) => {
        const s = base.clone().resize({
          width,
          fit: opts.fit ?? "inside",                            // mantiene aspect ratio
          withoutEnlargement: opts.withoutEnlargement ?? true   // no upscaling
        });

        // Formato de salida
        let outExt = originalExt;
        switch (chosenFormat) {
          case "jpeg": s.jpeg({ quality: 80 }); outExt = "jpg"; break;
          case "png":  s.png({ compressionLevel: 9 }); outExt = "png"; break;
          case "webp": s.webp({ quality: 80 }); outExt = "webp"; break;
          case "avif": s.avif({ quality: 45, effort: 6 }); outExt = "avif"; break;
          case "tiff": s.tiff({ compression: "lzw" }); outExt = "tiff"; break;
          case "gif":  s.gif(); outExt = "gif"; break;
          case "original":
          default:
            // se mantiene el formato de entrada
            break;
        }

        const { data, info } = await s.toBuffer({ resolveWithObject: true });
        const md5 = this.md5(data);

        const outDir = path.join(this.baseOutputDir, baseName, String(width));
        await this.ensureDir(outDir);

        const outPath = path.join(outDir, `${md5}.${outExt}`);
        console.log("Info after processing: ", info.width, info.height, info.size);

        await fs.writeFile(outPath, data);

        return {
          resolution: width,
          path: outPath,
          md5,
          width: info.width ?? width,
          height: info.height ?? 0,
          size: data.length,
          createdAt: new Date()
        };
      })
    );

    return results;
  }
}