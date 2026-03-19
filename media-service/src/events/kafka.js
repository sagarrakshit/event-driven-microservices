import kafkaClient from "../utils/kafkaClient.js";
import logger from "../utils/logger.js";

const consumer = kafkaClient.consumer({ groupId: "media-service" });

const connectConsumer = async () => {
  await consumer.connect();
  logger.info("Consumer is connected!");
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
