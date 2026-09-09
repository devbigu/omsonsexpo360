import Card from "../models/Card.js";
import Exhibition from '../models/Exhibition.js';
import path from "path";
import fs from "fs";
import { parseBusinessCardImage } from "../utils/geminiClient.js";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const safeUnlink = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn('Failed to remove temp file:', filePath, err.message);
    }
  });
};

const toStandardFields = (src = {}) => ({
  companyName: src.companyName || src.company || "",
  contactPerson: src.contactPerson || src.name || "",
  designation: src.designation || src.title || "",
  email: src.email || "",
  mobile: src.mobile || src.phone || "",
  website: src.website || "",
  address: src.address || "",
  typeOfVisitor: src.typeOfVisitor || "",
  interestedProducts: Array.isArray(src.interestedProducts) ? src.interestedProducts : [],
  remarks: src.remarks || (Array.isArray(src.interestedProducts) ? src.interestedProducts.join(", ") : ""),
});

export const extractOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image uploaded",
      });
    }

    const imagePath = req.file.path;
    console.log("Sending image to Gemini for extraction:", imagePath);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const { fields, rawText } = await parseBusinessCardImage(base64Image, mimeType);
    const normalizedFields = toStandardFields(fields);

    console.log("\n=== FINAL NORMALIZED FIELDS ===");
    console.log(JSON.stringify(normalizedFields, null, 2));
    console.log("===============================\n");

    if (fs.existsSync(imagePath)) safeUnlink(imagePath);

    return res.json({
      success: true,
      extractedText: rawText || "",
      fields: normalizedFields
    });

  } catch (err) {
    console.error("Gemini extraction error:", err.message);
    if (req.file?.path) {
      safeUnlink(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: "Gemini extraction failed",
      details: err.message
    });
  }
};

export const saveEntry = async (req, res) => {
  try {
    let fields = {};
    // Parse fields JSON (from frontend) - move this up so we have access to fields early
    if (req.body.fields) {
      try {
        fields = JSON.parse(req.body.fields);
      } catch (e) {
        console.warn("Invalid JSON in fields");
      }
    }

    const exhibitionId = req.body.exhibitionId ?? fields.exhibitionId ?? null;
    if (exhibitionId) {
      const exhibition = await Exhibition.findById(exhibitionId);
      if (!exhibition) return res.status(404).json({ success: false, message: 'Exhibition not found' });
      const now = new Date();
      // Use setHours(0,0,0,0) or similar if we want to be lenient, but the user wants current time
      // Actually, just trust the backend time
      if (now < exhibition.startTime || now > new Date(new Date(exhibition.endTime).getTime() + 12 * 60 * 60 * 1000)) {
        return res.status(403).json({ success: false, message: 'This exhibition is not currently live (including buffer). Cannot save new cards.' });
      }
    }

    // New fields structure
    let interestedProducts = fields.interestedProducts || [];
    if (req.body.interestedProducts !== undefined) {
      if (Array.isArray(req.body.interestedProducts)) {
        interestedProducts = req.body.interestedProducts;
      } else if (typeof req.body.interestedProducts === 'string' && req.body.interestedProducts.trim()) {
        try {
          interestedProducts = JSON.parse(req.body.interestedProducts);
          if (!Array.isArray(interestedProducts)) {
            interestedProducts = interestedProducts ? [String(interestedProducts)] : [];
          }
        } catch (e) {
          interestedProducts = req.body.interestedProducts
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } else {
        interestedProducts = [];
      }
    }

    const newFields = {
      companyName: req.body.companyName ?? fields.companyName ?? "",
      contactPerson: req.body.contactPerson ?? fields.contactPerson ?? "",
      designation: req.body.designation ?? fields.designation ?? "",
      mobile: req.body.mobile ?? fields.mobile ?? "",
      email: req.body.email ?? fields.email ?? "",
      address: req.body.address ?? fields.address ?? "",
      website: req.body.website ?? fields.website ?? "",
      typeOfVisitor: req.body.typeOfVisitor ?? fields.typeOfVisitor ?? "",
      interestedProducts,
      remarks: req.body.remarks ?? fields.remarks ?? "",
    };
    fields = { ...newFields };
    console.log("Final parsed fields:", fields);

    // ---------------- FILE HANDLING ----------------
    let images = [];
    let audio = "";

    const allFiles = Object.values(req.files || {}).flat();

    // Handle multiple images (up to 5)
    const imgFiles = allFiles.filter(f => f.mimetype.startsWith("image/")).slice(0, 5);

    for (const imgFile of imgFiles) {
      // Store relative path for frontend access
      images.push(`/uploads/${imgFile.filename}`);
      // Do NOT unlink - we want to keep the file now
    }

    // Handle audio
    const audFile = allFiles.find(f => f.mimetype.startsWith("audio/"));
    if (audFile) {
      audio = `/uploads/${audFile.filename}`;
      // Do NOT unlink
    }

    // Fallback in case frontend sends base64 directly
    if (images.length === 0 && fields.images && Array.isArray(fields.images)) {
      images = fields.images;
    }
    if (!audio && fields.audio) audio = fields.audio;

    // ---------------- SAVE TO DB ----------------
    const card = await Card.create({
      ...fields,
      exhibitionId: req.body.exhibitionId ?? fields.exhibitionId ?? null,
      createdBy: req.body.createdBy ?? fields.createdBy ?? '',
      images,
      audio
    });

    return res.status(201).json({ success: true, data: card });

  } catch (error) {
    console.error("Save failed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- NEW PERFORMANCE OPTIMIZATION: IMAGE PROXY ---
export const getImageProxy = async (req, res) => {
  try {
    const { id, field, index } = req.query;
    if (!id) return res.status(400).send("Missing ID");

    const card = await Card.findById(id).select("images image fields capturedImage").lean();
    if (!card) return res.status(404).send("Card not found");

    let rawData = "";

    // Exhaustive search based on field name
    if (field === "images" && index !== undefined) {
      rawData = card.images?.[index];
    } else if (field === "fields.images" && index !== undefined) {
      rawData = card.fields?.images?.[index];
    } else if (field === "image") {
      rawData = card.image;
    } else if (field === "fields.image") {
      rawData = card.fields?.image;
    } else if (field === "capturedImage") {
      rawData = card.capturedImage;
    } else if (field === "fields.capturedImage") {
      rawData = card.fields?.capturedImage;
    }

    if (!rawData) return res.status(404).send("Image data not found");

    // If it's already a full URL or relative path, redirect
    if (rawData.startsWith("http") || rawData.startsWith("/uploads/")) {
      return res.redirect(rawData);
    }

    // Handle Base64
    let base64Data = rawData;
    let contentType = "image/jpeg";

    if (rawData.startsWith("data:")) {
      const parts = rawData.split(",");
      contentType = parts[0].split(":")[1].split(";")[0];
      base64Data = parts[1];
    }

    const buffer = Buffer.from(base64Data, "base64");
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
    return res.end(buffer);

  } catch (error) {
    console.error("Proxy failed:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getAllCards = async (_req, res) => {
  const start = Date.now();
  try {
    const { exhibitionId, page = 1, limit = 10 } = _req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (exhibitionId) filter.exhibitionId = exhibitionId;

    // 1. Fetch data efficiently
    const cards = await Card.find(filter)
      .select("companyName contactPerson designation mobile email address website typeOfVisitor interestedProducts remarks createdAt images image audio fields capturedImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // 2. Transformation: Replace giant Base64 strings with small Proxy URLs
    const optimizedCards = cards.map(cardDoc => {
      const card = { ...cardDoc };

      const processImage = (img, field, idx) => {
        if (!img || typeof img !== 'string') return img;
        // If it looks like Base64, replace with proxy
        if (img.startsWith("data:") || img.length > 300) {
          const query = `id=${card._id}&field=${field}${idx !== undefined ? `&index=${idx}` : ""}`;
          return `/api/cards/image-proxy?${query}`;
        }
        return img;
      };

      // Ensure 'images' array is never null
      if (!card.images) card.images = [];

      // Optimize Top-Level
      card.images = card.images.map((img, i) => processImage(img, "images", i));
      card.image = processImage(card.image, "image");
      card.capturedImage = processImage(card.capturedImage, "capturedImage");

      // Optimize 'fields' object
      if (card.fields) {
        if (Array.isArray(card.fields.images)) {
          card.fields.images = card.fields.images.map((img, i) => processImage(img, "fields.images", i));
          // Promote legacy images to top-level if top-level is empty
          if (card.images.length === 0) card.images = card.fields.images;
        }
        if (card.fields.image) {
          card.fields.image = processImage(card.fields.image, "fields.image");
          if (!card.image) card.image = card.fields.image;
        }
        if (card.fields.capturedImage) {
          card.fields.capturedImage = processImage(card.fields.capturedImage, "fields.capturedImage");
          if (!card.capturedImage) card.capturedImage = card.fields.capturedImage;
        }
      }

      return card;
    });

    const total = await Card.countDocuments(filter);

    const duration = Date.now() - start;
    console.log(`[API] GET /api/cards - ${duration}ms (Optimized with Proxy)`);

    res.status(200).json({
      success: true,
      data: optimizedCards,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      responseTime: duration
    });
  } catch (error) {
    console.error("Fetch failed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch cards", error: error.message });
  }
};

export const updateCardDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { fields = {} } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'Card ID is required' });
    }

    const allowedFields = [
      'companyName', 'contactPerson', 'designation', 'mobile', 'email',
      'address', 'website', 'typeOfVisitor', 'interestedProducts', 'remarks'
    ];
    const update = {};

    allowedFields.forEach((field) => {
      if (fields[field] !== undefined) {
        update[field] = fields[field];
      }
    });

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
    }

    const updated = await Card.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ success: false, message: 'Failed to update card', error: error.message });
  }
};
