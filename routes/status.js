const express = require("express");
const router = express.Router();

const {
    updateStatus,
    getStatus
} = require("../services/statusService");

const {
    addHistory
} = require("../services/historyService");


// =========================================
// ESP32 STATUS UPDATE
// =========================================
router.post("/update", async (req, res) => {

    try {

        const { deviceId, status } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: "deviceId is required"
            });
        }

        const newStatus =
            String(status || "").toUpperCase();

        if (
            newStatus !== "ON" &&
            newStatus !== "OFF"
        ) {
            return res.status(400).json({
                success: false,
                error: "Status must be ON or OFF"
            });
        }


        // =====================================
        // Get current status BEFORE updating
        // =====================================
        const oldData =
            await getStatus(deviceId);

        const oldStatus =
            String(
                oldData?.status || "UNKNOWN"
            ).toUpperCase();


        // =====================================
        // Update actual device status
        // =====================================
        const result =
            await updateStatus(
                deviceId,
                newStatus
            );


        // =====================================
        // SAVE HISTORY ONLY WHEN STATE CHANGES
        // =====================================
        if (
            (oldStatus === "ON" || oldStatus === "OFF") &&
            oldStatus !== newStatus
        ) {

            try {

                await addHistory(
                    deviceId,
                    newStatus,
                    "Completed"
                );

                console.log(
                    `HISTORY: ${deviceId} ${oldStatus} -> ${newStatus}`
                );

            } catch (historyError) {

                // History failure should NOT make
                // ESP32 status update fail
                console.error(
                    "History Save Error:",
                    historyError.message
                );

            }

        } else {

            console.log(
                `ℹ️ History skipped: ${deviceId} ${oldStatus} -> ${newStatus}`
            );

        }


        res.json(result);

    } catch (err) {

        console.error(
            "Status Update Error:",
            err.message
        );

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


// =========================================
// GET STATUS
// =========================================
router.get("/:deviceId", async (req, res) => {

    try {

        const result =
            await getStatus(
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
