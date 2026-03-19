import { createSearchPost } from "../../controllers/searchController.js";

const handlePostCreated = async (data) => {
  await createSearchPost(data);
};

export default handlePostCreated;
