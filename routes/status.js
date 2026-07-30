const express = require("express");
const router = express.Router();

const {
    updateStatus,
    getStatus
} = require("../services/statusService");


// Update Status
router.post("/update", async (req, res) => {

    try {

        const { deviceId, status } = req.body;

        const result = await updateStatus(
            deviceId,
            status
        );

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


// Get Status
router.get("/:deviceId", async (req, res) => {

    try {

        const result = await getStatus(
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
