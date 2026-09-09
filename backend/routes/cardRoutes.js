import express from "express";
import { cardUpload } from "../config/multer.js";
import { saveEntry, getAllCards, extractOCR, updateCardDetails, getImageProxy } from "../controllers/cardController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Routes
router.get("/image-proxy", getImageProxy); // Public proxy for performance
router.post("/save-entry", protect, cardUpload.fields([{ name: "image", maxCount: 5 }, { name: "audio", maxCount: 1 }]), saveEntry);
router.get("/", protect, getAllCards);
router.put("/:id", protect, updateCardDetails);
router.post("/extract-ocr", protect, cardUpload.single("image"), extractOCR);

export default router;
