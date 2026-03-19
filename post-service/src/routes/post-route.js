import express from "express";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPost,
} from "../controllers/post-controller.js";
import authenticateRequest from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticateRequest);

router.post("/create-post", createPost);
router.delete("/:id", deletePost);
router.get("/all-posts", getAllPosts);
router.get("/:id", getPost);

export default router;
