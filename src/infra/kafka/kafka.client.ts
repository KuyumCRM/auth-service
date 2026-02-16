// Kafka client — stub for graceful shutdown.
let producer: unknown = null;

export function setKafkaProducer(p: unknown): void {
  producer = p;
}

export async function closeKafka(): Promise<void> {
  if (producer && typeof (producer as { disconnect: () => Promise<void> }).disconnect === 'function') {
    await (producer as { disconnect: () => Promise<void> }).disconnect();
  }
  producer = null;
}
