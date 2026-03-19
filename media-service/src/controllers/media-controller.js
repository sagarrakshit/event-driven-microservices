import Media from "../models/Media.js";
import {
  deleteMediaFromCloud,
  uploadMediaToCloud,
} from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

const uploadMedia = async (req, res, next) => {
  logger.info("Starting media upload...");

  try {
    if (!req.file) {
      logger.error("No file found. Please add a file and try again.");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again.",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: name=${originalname}, type:${mimetype}`);
    logger.info("Uploading to cloudinary starting...");

    const cloudUploadResult = await uploadMediaToCloud(req.file);
    logger.info(
      `Cloud upload successful: Public Id: - ${cloudUploadResult.public_id}`,
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successful.",
    });
  } catch (error) {
    logger.warn("Error occured while uploading file", error);
    next(error);
  }
};

const getAllMedias = async (req, res, next) => {
  try {
    const results = await Media.find({});
    return res.json({ results });
  } catch (error) {
    logger.warn("Error occured while fetching medias", error);
    next(error);
  }
};

const deleteMedia = async ({ topic, partition, message }) => {
  try {
    const postData = JSON.parse(message.value.toString());
    logger.info("Consumed message", { topic, partition, postData });
    const { mediaIds, postId, userId } = postData;

    if (!mediaIds || mediaIds.length === 0) {
      logger.info("No medias to delete for post", { postId });
      return;
    }

    const mediaDocuments = await Media.find({ _id: { $in: mediaIds } });
    const cloudinaryDeletions = mediaDocuments.map((media) =>
      deleteMediaFromCloud(media.publicId),
    );
    await Promise.all(cloudinaryDeletions);

    await Media.deleteMany({ _id: { $in: mediaIds } });
    logger.info("Media deleted successfully for post", postId);
  } catch (error) {
    logger.error("Error processing delete media event", {
      error: error.message,
      topic,
      partition,
    });
  }
};

export { uploadMedia, getAllMedias, deleteMedia };
