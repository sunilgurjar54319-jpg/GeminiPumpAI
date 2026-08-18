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

    const result = await databases.listDocuments(
      DATABASE_ID,
      DEVICES_COLLECTION,
      [
        Query.equal("deviceId", deviceId),
        Query.limit(1)
      ]
    );

    if (result.documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Device not found"
      });
    }

    let device = result.documents[0];

    // =========================================
    // LEGACY DEVICE OWNER AUTO-LINK
    // =========================================
    // Existing devices created before ownerId was
    // introduced may not have an ownerId.
    // Link such a device to the authenticated user.
    if (!device.ownerId) {

      try {

        device = await databases.updateDocument(
          DATABASE_ID,
          DEVICES_COLLECTION,
          device.$id,
          {
            ownerId: req.userId
          }
        );

        console.log(
          "Device owner auto-linked:",
          device.deviceId,
          "->",
          req.userId
        );

      } catch (ownerErr) {

        console.error(
          "Owner auto-link error:",
          ownerErr.message
        );

        return res.status(500).json({
          success: false,
          error: "Unable to link device ownership"
        });

      }

    }

    // Existing owner must belong to logged-in user.
    if (device.ownerId !== req.userId) {

      return res.status(403).json({
        success: false,
        error: "You are not the owner of this device"
      });

    }

    req.device = device;

    next();

  } catch (err) {
    console.error("Owner Check Error:", err.message);

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
