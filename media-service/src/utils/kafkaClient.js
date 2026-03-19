import { Kafka, logLevel } from "kafkajs";

const kafkaClient = new Kafka({
  clientId: "post-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
  requestTimeout: 30 * 1000,
  connectionTimeout: 10 * 1000,
});

export default kafkaClient;
