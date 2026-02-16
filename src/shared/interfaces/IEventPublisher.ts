// Port interface for event publishing (e.g. Kafka).
export interface IEventPublisher {
  publish(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
