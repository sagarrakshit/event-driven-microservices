import { Kafka, logLevel } from "kafkajs";
import logger from "../utils/logger.js";

const kafkaClient = new Kafka({
  clientId: "search-service",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
  requestTimeout: 30 * 1000,
  connectionTimeout: 10 * 1000,
});

const consumer = kafkaClient.consumer({ groupId: "search-service" });

const connectConsumer = async () => {
  await consumer.connect();
  logger.info("Kafka consumer is connected");
};

const disconnectConsumer = async () => {
  await consumer.disconnect();
};

const subscribeToTopic = async (topic) => {
  await consumer.subscribe({
    topic,
    fromBeginning: true,
  });
};

const runConsumer = async (eachMessage) => {
  await consumer.run({
    eachMessage,
  });
};

export { connectConsumer, disconnectConsumer, subscribeToTopic, runConsumer };
