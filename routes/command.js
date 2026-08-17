const express = require("express");
const router = express.Router();

const {
  requireAuth,
  requireDeviceOwner
} = require("../middleware/auth");

const {
  sendCommand,
  getCommand,
  completeCommand
} = require("../services/commandService");

// ==================================
// SEND COMMAND
// Login + Device Owner required
// ==================================
router.post(
  "/send",
  requireAuth,
  requireDeviceOwner,
  async (req, res) => {
    try {
      const { deviceId, command } = req.body;

      if (!deviceId || !command) {
        return res.status(400).json({
          success: false,
          error: "deviceId and command are required"
        });
      }

      const result = await sendCommand(
        deviceId,
        command
      );

      res.json(result);

    } catch (err) {
      console.error("Send Command Route Error:", err.message);

      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);

// ==================================
// GET PENDING COMMAND
// Device firmware uses this.
// ==================================
router.get("/get/:deviceId", async (req, res) => {
  try {
    const result = await getCommand(
      req.params.deviceId
    );

    res.json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ==================================
// COMPLETE COMMAND
// Device firmware uses this.
// ==================================
router.post("/complete", async (req, res) => {
  try {
    const { commandId } = req.body;

    if (!commandId) {
      return res.status(400).json({
        success: false,
        error: "commandId is required"
      });
    }

    const result = await completeCommand(
      commandId
    );

    res.json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
