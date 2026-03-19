import multer from "multer";
import logger from "../utils/logger.js";

//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

const handleUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      logger.error("Multer error occured while uploading:", err);
      return res.status(400).json({
        success: false,
        error: "Corrupt file. Could not upload",
      });
    } else if (err) {
      logger.error("Unknown error occured while uploading:", err);
      return res.status(500).json({
        success: false,
        error: "Unknown error occured while uploading",
      });
    }

    if (!req.file) {
      logger.error("No file to upload:", err);
      return res.status(400).json({
        success: false,
        message: "No file found!",
      });
    }

    next();
  });
};

export default handleUpload;
