import express from "express";
import {
  getRefreshToken,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/identityController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", getRefreshToken);
router.post("/logout", logoutUser);

export default router;
