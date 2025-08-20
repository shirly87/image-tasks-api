import sharp, { Sharp } from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/types.js";

/**
 * ImageService
 * ------------
 * Servicio de procesado de imágenes basado en Sharp.
 *
 * DECISIONES DE DISEÑO
 * - Aspect Ratio: siempre se preserva.
 *   * Cuando se especifica solo `width` en `resize`, Sharp ajusta la altura automáticamente
 *     manteniendo la proporción. Si además se usa `fit: "inside"` con width/height, "inside"
 *     también garantiza mantener el aspect ratio, encajando la imagen dentro del cuadro objetivo.
 *     Basado en doc oficial. 
 *
 * - Upscaling (aumentar tamaño): permitido por defecto.
 *   * intencionadamente NO se usa `withoutEnlargement: true`, por lo que si la imagen original
 *     es más pequeña que el ancho objetivo (p.ej. 700→1024), Sharp la ampliará.
 *
 * - Formato de salida: por defecto se conserva el original ("original").
 *
 * - Una sola operación de resize por pipeline:
 *   * La API de Sharp ignora resizes previos en el mismo pipeline; por eso se hace `base.clone()`
 *     para cada variante (1024, 800, ...).
 *
 * - Salida:
 *   * Estructura: /output/{nombreBase}/{resolucion}/{md5}.{ext}
 *   * El nombre final incluye un hash MD5 del buffer resultante.
 */


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
 
  /**
   * Valida que la fuente de imagen sea accesible y prepara la base de Sharp
   * @param inputPathOrUrl - Ruta local o URL de la imagen
   * @returns Sharp - Instancia de Sharp lista para procesar
   * @throws AppError - Si la imagen no es accesible
   */
  private async validateAndPrepareImage(inputPathOrUrl: string): Promise<Sharp> {
    const isRemote = this.isUrl(inputPathOrUrl);
    
    if (isRemote) {
      const res = await fetch(inputPathOrUrl as any);
      if (!res.ok) {
        throw new AppError(
          `Failed to download image: ${res.status} ${res.statusText}`,
          400,
          ErrorCodes.INVALID_INPUT
        );
      }
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      return sharp(buf, { animated: true }).autoOrient();
    } else {
      const absolutePath = path.isAbsolute(inputPathOrUrl) 
        ? inputPathOrUrl 
        : path.resolve(inputPathOrUrl);
      
      try {
        await fs.access(absolutePath);
      } catch {
        throw new AppError(
          `Local image path not found or not accessible: ${absolutePath}`,
          400,
          ErrorCodes.INVALID_INPUT
        );
      }
      
      return sharp(inputPathOrUrl, { animated: true }).autoOrient();
    }
  }

  /**
   * Genera variantes por ancho manteniendo aspect ratio.
   *
   * @param inputPathOrUrl Ruta local absoluta o URL (http/https).
   * @param resolutions    Anchos objetivo (ej. [1024, 800]).
   * @param opts.fit       Estrategia de encaje (default: "inside").
   *                       "inside" preserva el aspect ratio y encaja dentro del cuadro objetivo.
   *                       NOTA: cuando solo se especifica `width`, Sharp preserva la proporción igualmente.
   * @param opts.outputFormat Formato de salida:
   *                       - "original" (default): conserva el formato de entrada (ext normalizada: jpeg→jpg)
   *                       - "jpeg" | "png" | "webp" | "avif" | "tiff" | "gif"
   *
   * - Upscaling permitido: al no pasar `withoutEnlargement: true`, si la original es más pequeña
   *   que el ancho objetivo, se ampliará (manteniendo la proporción).
   *
   * SALIDA:
   * - Directorio base: `output/`
   * - Ruta final: `/output/{baseName}/{width}/{md5}.{ext}`
   * - Metadatos devueltos: `width` y `height` REALES de imagen de salida, `size` en bytes,
   *   `md5` de contenido y `createdAt`.
   *
   * @returns VariantInfo[] con datos de cada variante generada.
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

    const base = await this.validateAndPrepareImage(inputPathOrUrl);

    const { baseName, ext: originalExt } = this.getBaseNameAndExt(inputPathOrUrl);
    const chosenFormat = opts.outputFormat ?? "original";

    const results = await Promise.all(
      resolutions.map(async (width) => {
        const s = base.clone().resize({
          width,
          fit: opts.fit ?? "inside" // mantiene aspect ratio
        });

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
            break;
        }

        const { data, info } = await s.toBuffer({ resolveWithObject: true });
        const md5 = this.md5(data);

        const outDir = path.join(this.baseOutputDir, baseName, String(width));
        await this.ensureDir(outDir);

        const outPath = path.join(outDir, `${md5}.${outExt}`);

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