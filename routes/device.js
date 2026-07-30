const express = require("express");
const router = express.Router();

const { registerDevice } = require("../services/deviceService");

router.post("/register", async (req, res) => {

    try {

        const { deviceId, deviceName } = req.body;

        const result = await registerDevice(
            deviceId,
            deviceName
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
