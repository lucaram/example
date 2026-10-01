import type { PreClearanceRequest } from '@preclear/contracts';

export class RequestStore {
  private items = new Map<string, PreClearanceRequest>();
  private counter = 0;

  nextId(): string {
    this.counter += 1;
    return `PCR-${String(this.counter).padStart(4, '0')}`;
  }

  save(item: PreClearanceRequest): PreClearanceRequest {
    this.items.set(item.id, item);
    return item;
  }

  get(id: string): PreClearanceRequest | undefined {
    return this.items.get(id);
  }

  list(): PreClearanceRequest[] {
    return [...this.items.values()];
  }

  reset(): void {
    this.items.clear();
    this.counter = 0;
  }
}
