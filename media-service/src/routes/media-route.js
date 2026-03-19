import express from "express";
import authenticateRequest from "../middlewares/auth.js";
import { getAllMedias, uploadMedia } from "../controllers/media-controller.js";
import handleUpload from "../middlewares/upload.js";

const router = express.Router();

router.post("/upload", authenticateRequest, handleUpload, uploadMedia);
router.get("/get", authenticateRequest, getAllMedias);

export default router;
