import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import generateAndSaveToken from "../utils/generateAndSaveToken.js";
import logger from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";

const getValidationMessage = (error) =>
  error?.details?.[0]?.message || "Invalid request payload.";

const sendValidationError = (res, error) =>
  res.status(400).json({
    success: false,
    message: getValidationMessage(error),
  });

const sendInvalidCredentials = (res) =>
  res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });

const sendUserExists = (res) => {
  res.status(409).json({
    success: false,
    message: "User already exists.",
  });
};

const sendUserNotFound = (res) => {
  res.status(401).json({
    success: false,
    message: "User not found",
  });
};

const registerUser = async (req, res, next) => {
  logger.info("Registering user");
  try {
    // validate user details
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error", getValidationMessage(error));
      return sendValidationError(res, error);
    }
    // check if username or email exists
    const { email, username, password } = req.body;
    const isUsernameOrEmailExist = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (isUsernameOrEmailExist) {
      logger.warn("User already exists");
      return sendUserExists(res);
    }

    //save user to db
    const user = new User({ username, email, password });
    await user.save();
    logger.info("User created successfully", user._id);

    //get access and refresh tokens
    const { accessToken, refreshToken } = await generateAndSaveToken(user);

    return res.status(201).json({
      success: true,
      message: "User registration complete.",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    error.status = 500;
    error.clientMessage = "Registration failed";
    return next(error);
  }
};

//login user
const loginUser = async (req, res, next) => {
  logger.info(`Logging in....`);
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", getValidationMessage(error));
      return sendValidationError(res, error);
    }

    //check if user and password matches
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Invalid user`);
      return sendInvalidCredentials(res);
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn(`Invalid password`);
      return sendInvalidCredentials(res);
    }

    const { accessToken, refreshToken } = await generateAndSaveToken(user);

    return res.json({
      refreshToken,
      accessToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    return next(error);
  }
};

const getRefreshToken = async (req, res, next) => {
  logger.info("Getting refresh token...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn(`Missing refresh token`);
      return res.status(401).json({
        success: false,
        message: "Missing refresh tokens.",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return sendUserNotFound(res);
    }

    //delete the old token, generate new
    await RefreshToken.deleteOne({ _id: storedToken._id });
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateAndSaveToken(user);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Could not get refresh token", error);
    return next(error);
  }
};

const logoutUser = async (req, res, next) => {
  logger.info("Logging out....");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn(`Missing refresh token`);
      return res.status(401).json({
        success: false,
        message: "Missing refresh tokens.",
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error while logging out.", error);
    return next(error);
  }
};

export { loginUser, registerUser, getRefreshToken, logoutUser };
