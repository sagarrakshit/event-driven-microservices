import { Kafka, logLevel } from "kafkajs";
import logger from "./logger.js";

const kafkaClient = new Kafka({
  clientId: "post-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
  connectionTimeout: 10 * 1000,
  requestTimeout: 30 * 1000,
});

export const producer = kafkaClient.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("Producer is connected");
};

export const disconnectProducer = async () => {
  await producer.disconnect();
};

export default kafkaClient;
