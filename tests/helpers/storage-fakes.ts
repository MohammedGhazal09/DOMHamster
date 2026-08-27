import type { StoragePort } from '../../src/app/ports';

export class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>();
  getError: Error | null = null;
  setError: Error | null = null;
  removeError: Error | null = null;
  setCalls = 0;

  getItem(key: string): string | null {
    if (this.getError) throw this.getError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.setError) throw this.setError;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.removeError) throw this.removeError;
    this.values.delete(key);
  }
}
