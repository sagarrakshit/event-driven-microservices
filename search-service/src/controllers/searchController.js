import Search from "../models/Search.js";
import logger from "../utils/logger.js";

const createSearchPost = async (data) => {
  try {
    const { postId, userId, content, createdAt } = data;
    const searchModel = new Search({
      postId,
      userId,
      content,
      createdAt,
    });
    searchModel.save();
    logger.info("Post saved successfully", { postId });
  } catch (error) {
    logger.error("Error while creating search post", data);
  }
};

const deleteSearchPost = async (data) => {
  try {
    const { postId } = data;
    const deleted = await Search.findOneAndDelete({ postId });

    if (!deleted) {
      logger.warn("Search post not found for deletion", { postId });
      return;
    }

    logger.info("Post deleted successfully", { postId });
  } catch (error) {
    logger.error("Error while deleting search post", data);
  }
};

export { createSearchPost, deleteSearchPost };
