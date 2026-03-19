import {
  producePostCreatedEvent,
  producePostDeletedEvent,
} from "../events/kafka.js";
import { Post } from "../models/Post.js";
import logger from "../utils/logger.js";
import { validatePost } from "../utils/validation.js";

const POST_VERSION_KEY = "posts:version";

const getPostsVersion = async (redisClient) => {
  // Start with v0 so first INCR moves to v1 and invalidates old keys.
  return (await redisClient.get(POST_VERSION_KEY)) ?? "0";
};

const invalidatePostCache = async (req, postId) => {
  try {
    const pipeline = req.redisClient.multi();

    /**
     * getting keys using '*' is BLOCKING and deleting is expensive
     * eg:
     * const keys = await req.redisClient.keys("posts:*");
     * if (keys.length) {
     *  await req.redisClient.del(keys);
     * }
     */

    if (postId) {
      pipeline.unlink(`post:${postId}`);
    }

    pipeline.incr(POST_VERSION_KEY); // used version control to invalidate cache
    await pipeline.exec();
  } catch (error) {
    logger.warn("Cache invalidation failed", { error: error.message, postId });
  }
};

const createPost = async (req, res, next) => {
  try {
    const { error } = validatePost(req.body);
    if (error) {
      logger.warn("Post validation error", error);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    await producePostCreatedEvent({
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user,
      content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostCache(req);
    logger.info("Post created successfully", { newlyCreatedPost });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error occurred while creating post", error);
    return next(error);
  }
};

const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;

    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      logger.info("Request served from cache");
      return res.json(JSON.parse(cachedPost));
    }

    const post = await Post.findById(postId).lean();
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post)); // 1 hour
    return res.json(post);
  } catch (error) {
    logger.error("Error getting post", error);
    return next(error);
  }
};

const getAllPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    //return from cache if found
    const version = await getPostsVersion(req.redisClient);
    const cacheKey = `posts:v${version}:${page}:${limit}`;

    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    // get posts from db
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();
    const totalPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    };

    // save in cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return res.json(result);
  } catch (error) {
    logger.error("Error getting post", error);
    return next(error);
  }
};

/**Implemented eventual consistency
 * But Outbox Pattern is more robust
 * 1. Delete post from MongoDB
 * 2. Write a "post.deleted" event to an outbox collection in the SAME MongoDB transaction
 * 3. A separate worker reads the outbox and publishes to Kafka
 * 4. If Kafka fails, worker retries until it succeeds
 */
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    try {
      const postDetails = {
        postId: post._id.toString(),
        userId: req.user.userId,
        mediaIds: post.mediaIds,
      };
      await producePostDeletedEvent(postDetails); // <- produce an delete post event
      logger.info("Deleted post. Fired post.delete event.");
    } catch (error) {
      // log it but don't fail the request
      logger.error("Kafka event failed, media files may be orphaned", {
        postId: req.params.id,
      });
      logger.error("Kafka error", error);
      //TODO: Orphaned media files are cleaned up later by a scheduled job.
    }

    await invalidatePostCache(req, req.params.id); // <- invalidated past cache

    return res.json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    return next(error);
  }
};

export { createPost, getPost, getAllPosts, deletePost };
