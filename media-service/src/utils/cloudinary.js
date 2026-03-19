import { v2 as cloudinary } from "cloudinary";
import logger from "./logger.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_ENV_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloud = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.warn("Error while uploading media to cloud", error);
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    uploadStream.end(file.buffer);
  });
};

const deleteMediaFromCloud = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media deleted successfully from cloud storage", publicId);
    return result;
  } catch (error) {
    logger.error(`Error while deleting from cloud: ${publicId}`, error);
    throw error;
  }
};

export { uploadMediaToCloud, deleteMediaFromCloud };
