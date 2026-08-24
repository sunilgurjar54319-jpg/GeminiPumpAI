const { Client, Account } = require("node-appwrite");
require("dotenv").config();

const databases = require("../config/appwrite");
const { Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const DEVICES_COLLECTION =
  process.env.APPWRITE_DEVICES_COLLECTION_ID || "devices";

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const jwt = authHeader.slice(7).trim();

    if (!jwt) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing"
      });
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(jwt);

    const account = new Account(client);

    const user = await account.get();

    req.user = user;
    req.userId = user.$id;

    next();

  } catch (err) {
    console.error("Auth Error:", err.message);

    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication"
    });
  }
}

async function requireDeviceOwner(req, res, next) {
  try {

    const deviceId =
      req.body?.deviceId ||
      req.params?.deviceId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: "deviceId is required"
      });
    }

    console.log(
      "DEVICE NAME AUTH CHECK:",
      {
        deviceId,
        userId: req.userId,
        databaseId: DATABASE_ID,
        collectionId: DEVICES_COLLECTION
      }
    );

    const result = await databases.listDocuments(
      DATABASE_ID,
      DEVICES_COLLECTION,
      [
        Query.equal("deviceId", deviceId),
        Query.limit(1)
      ]
    );

    console.log(
      "DEVICE LOOKUP RESULT:",
      {
        deviceId,
        count: result.documents.length
      }
    );

    if (result.documents.length === 0) {

      return res.status(404).json({
        success: false,
        error: "Device not found",
        deviceId
      });

    }

    let device = result.documents[0];

    console.log(
      "DEVICE FOUND:",
      {
        documentId: device.$id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        ownerId: device.ownerId || "(missing)",
        currentUserId: req.userId
      }
    );

    // =========================================
  // =========================================
  // STRICT DEVICE OWNER CHECK
  // =========================================
  //
  // Device owner missing -> reject.
  // Device owner different -> reject.
  // ONLY exact owner is allowed.
  // =========================================

  if (!device.ownerId) {

    console.log(
      `🛑 DEVICE OWNER MISSING: ${device.deviceId}`
    );

    return res.status(403).json({
      success: false,
      error: "Device owner is not configured",
      deviceId
    });
  }

  if (device.ownerId !== req.userId) {

    console.log(
      `🛑 DEVICE OWNER MISMATCH: ${device.deviceId} | ` +
      `owner=${device.ownerId} | user=${req.userId}`
    );

    return res.status(403).json({
      success: false,
      error: "You do not own this device",
      deviceId
    });
  }

  console.log(
    `✅ DEVICE OWNER VERIFIED: ${device.deviceId} | ` +
    `owner=${device.ownerId}`
  );

    req.device = device;

    next();

  } catch (err) {

    console.error(
      "Owner Check Error:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error: "Unable to verify device ownership"
    });

  }
}

module.exports = {
  requireAuth,
  requireDeviceOwner
};
