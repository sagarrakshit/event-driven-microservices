import handlePostCreated from "./handlers/postCreated.js";
import handlePostDeleted from "./handlers/postDeleted.js";

const messageRouter = async ({ partiton, topic, message }) => {
  const data = JSON.parse(message.value.toString());

  switch (topic) {
    case "post.created":
      await handlePostCreated(data);
      break;
    case "post.deleted":
      await handlePostDeleted(data);
      break;
    default:
      break;
  }
};

export default messageRouter;
