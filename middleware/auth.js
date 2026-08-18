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

    console.log(
      "AUTH SUCCESS:",
      {
        userId: user.$id,
        email: user.email
      }
    );

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
    // LEGACY / SINGLE-USER DEVICE AUTO LINK
    // =========================================
    //
    // PUMP001 is the existing device of this
    // GeminiPumpAI installation.
    //
    // If ownerId is missing OR this legacy device
    // has an old ownerId, link it to the currently
    // authenticated account.
    //
    // This keeps the existing PUMP001 usable
    // after the authentication system was added.
    //
    if (
      !device.ownerId ||
      device.ownerId !== req.userId
    ) {

      console.log(
        "DEVICE OWNER AUTO-LINK:",
        {
          deviceId: device.deviceId,
          oldOwnerId: device.ownerId || "(missing)",
          newOwnerId: req.userId
        }
      );

      try {

        device = await databases.updateDocument(
          DATABASE_ID,
          DEVICES_COLLECTION,
          device.$id,
          {
            ownerId: req.userId
          }
        );

      } catch (ownerErr) {

        console.error(
          "DEVICE OWNER AUTO-LINK ERROR:",
          ownerErr.message
        );

        return res.status(500).json({
          success: false,
          error: "Unable to link device ownership"
        });

      }

    }

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
