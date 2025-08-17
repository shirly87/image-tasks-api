export type Job = () => Promise<void>;

export class InMemoryQueue {
  private q: Job[] = [];
  private running = 0;

  constructor(private concurrency = 2) {}

  push(job: Job): void {
    this.q.push(job);

    this.run();
  }

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
}

export const queue = new InMemoryQueue(2);
