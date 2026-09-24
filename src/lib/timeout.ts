/**
 * Rejects when `work` takes longer than `ms`. The work itself keeps running;
 * only the wait is abandoned. `toUserMessage` maps the rejection to the
 * timeout message.
 */
export class TimeoutError extends Error {
  constructor() {
    super('Timed out');
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer));
}
