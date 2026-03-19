import { producer } from "../utils/kafkaClient.js";

const producePostDeletedEvent = async (postDetails) => {
  await producer.send({
    topic: "post.deleted",
    messages: [
      {
        key: postDetails.postId,
        value: JSON.stringify({
          ...postDetails,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
};

const producePostCreatedEvent = async (postDetails) => {
  await producer.send({
    topic: "post.created",
    messages: [
      {
        key: postDetails.postId,
        value: JSON.stringify({
          ...postDetails,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
};

export { producePostDeletedEvent, producePostCreatedEvent };
