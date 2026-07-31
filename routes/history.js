const express = require("express");
const router = express.Router();

const {
  getHistory,
  clearHistory
} = require("../services/historyService");


// Get History
router.get("/:deviceId", async (req, res) => {

  try {

    const result = await getHistory(
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


// Clear History
router.delete("/:deviceId", async (req, res) => {

  try {

    const result = await clearHistory(
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


module.exports = router;
