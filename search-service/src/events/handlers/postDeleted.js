import { deleteSearchPost } from "../../controllers/searchController.js";

const handlePostDeleted = async (data) => {
  await deleteSearchPost(data);
};

export default handlePostDeleted;
