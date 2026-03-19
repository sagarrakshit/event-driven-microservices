import Joi from "joi";

const validatePost = (data) => {
  const schema = Joi.object({
    content: Joi.string().min(1).max(5000).required(),
    mediaIds: Joi.array().items(Joi.string()).optional(),
  });

  return schema.validate(data);
};

export { validatePost };
