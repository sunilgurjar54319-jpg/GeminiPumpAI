const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { ID } = require("node-appwrite");

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
      }
    );

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
      COLLECTION_ID
    );

    const schedules = result.documents.filter(
      item => item.deviceId === req.params.deviceId
    );

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
