import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';

export function createStubEventPublisher(): IEventPublisher {
  return {
    async publish(_eventType: string, _payload: Record<string, unknown>): Promise<void> {
      // No-op; replace with Kafka producer for production.
    },
  };
}
