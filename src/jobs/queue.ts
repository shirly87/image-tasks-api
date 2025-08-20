import { AppError } from "../errors/AppError.js";
import { ErrorCodes } from "../errors/types.js";

/**
 * Tipo para trabajos asíncronos que se ejecutan en la cola
 */
export type Job = () => Promise<void>;

/**
 * Cola de trabajos en memoria con control de concurrencia
 * 
 * @description
 * Implementa una cola FIFO (First In, First Out) que procesa trabajos
 * de forma asíncrona con un límite configurable de trabajos simultáneos.
 *
 */
export class InMemoryQueue {
  private q: Job[] = [];
  private running = 0;
  private closed = false;

  /**
   * Constructor de la cola
   * @param concurrency - Número máximo de trabajos simultáneos (default: 2)
   */
  constructor(private concurrency = 2) {}

  /**
   * Agrega un trabajo a la cola para procesamiento
   * @param job - Función asíncrona que representa el trabajo a ejecutar
   * @description
   * Si la cola está cerrada, el trabajo se ignora.
   * El trabajo se procesa inmediatamente si hay slots disponibles de concurrencia.
   */
  push(job: Job): void {
    if (this.closed) return;

    this.q.push(job);

    this.run();
  }

  /**
   * Procesa trabajos de la cola respetando el límite de concurrencia
   * @description
   * Ejecuta trabajos mientras haya trabajos en cola y slots disponibles.
   * Un slot está disponible cuando this.running < this.concurrency.
   */
  private run(): void {
    while (this.running < this.concurrency && this.q.length > 0) {
      const job = this.q.shift()!;
      this.running++;

      Promise.resolve()
        .then(job)
        .catch((err) => {
          console.error("[queue] Job failed:", err);
        })
        .finally(() => {
          this.running--;
          this.run();
        });
    }
  }

  /**
   * Espera a que todos los trabajos en cola se completen
   * @param opts - Opciones de configuración
   * @param opts.timeoutMs - Timeout en milisegundos (default: 10000)
   * @returns Promise que se resuelve cuando la cola esté vacía
   * @throws {AppError} Si se excede el timeout
   * @description
   * Método utilizado para testing.
   * Verifica cada 10ms si la cola está vacía.
   */
  drain(opts: { timeoutMs?: number } = {}): Promise<void> {
    const timeoutMs = opts.timeoutMs ?? 10000;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const tick = () => {
        if (this.q.length === 0 && this.running === 0) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(new AppError(
            "Queue drain timeout", 
            500, 
            ErrorCodes.INTERNAL_ERROR
        ));
        }
        setTimeout(tick, 10);
      };
      tick();
    });
  }

  /**
   * Cierra la cola para nuevas entradas
   * @description
   * Una vez cerrada, la cola no acepta nuevos trabajos.
   * Los trabajos en ejecución continúan hasta completarse.
   * Método utilizado para testing.
   */
  close() {
    this.closed = true;
  }
}

/**
 * Instancia global de la cola de trabajos
 * Configurada para procesar máximo 2 trabajos simultáneos
 */
export const queue = new InMemoryQueue(2);
