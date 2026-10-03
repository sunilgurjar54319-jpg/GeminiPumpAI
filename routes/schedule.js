const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { Query, Permission, Role } = require("node-appwrite");
const { ID } = require("node-appwrite");
const { refreshSchedule, removeSchedule } = require("../services/scheduler");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = "schedules";


// =====================
// Create Schedule
// =====================
router.post("/", async (req, res) => {

  try {

    const {
      deviceId,
      startTime,
      endTime,
      days,
      enabled,
      command,
      scheduledDate
    } = req.body;

    if (!deviceId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "deviceId, startTime and endTime are required"
      });
    }

    const deviceResult = await databases.listDocuments(
      DATABASE_ID,
      "devices",
      [
        Query.equal("deviceId", deviceId),
        Query.limit(1)
      ]
    );

    const ownerId = deviceResult.documents[0]?.ownerId;

    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        deviceId,
        startTime,
        endTime,
        days: days || "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        enabled: enabled !== false,
        command: command || "",
        scheduledDate: scheduledDate || null
      },
      ownerId ? [Permission.read(Role.user(ownerId))] : []
    );

    await refreshSchedule(result.$id);

    res.json({
      success: true,
      schedule: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =====================
// Get Schedules
// =====================
router.get("/:deviceId", async (req, res) => {

  try {

    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal("deviceId", req.params.deviceId),
        Query.select([
          "deviceId",
          "startTime",
          "endTime",
          "days",
          "command",
          "enabled",
          "scheduledDate"
        ]),
        Query.limit(100)
      ]
    );

    const schedules = result.documents;

    res.json({
      success: true,
      schedules
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =====================
// Update Schedule
// =====================
router.put("/:id", async (req, res) => {

  try {

    const {
      startTime,
      endTime,
      days,
      enabled,
      command,
      scheduledDate
    } = req.body;

    const result = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      req.params.id,
      {
        startTime,
        endTime,
        days,
        enabled,
        command: command || "",
        scheduledDate: scheduledDate || null
      }
    );

    await refreshSchedule(result.$id);

    res.json({
      success: true,
      schedule: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =====================
// Delete Schedule
// =====================
router.delete("/:id", async (req, res) => {

  try {

    await removeSchedule(req.params.id);

    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_ID,
      req.params.id
    );

    res.json({
      success: true,
      message: "Schedule Deleted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


module.exports = router;
