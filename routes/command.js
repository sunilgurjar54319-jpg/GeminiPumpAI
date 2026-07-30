const express = require("express");
const router = express.Router();

const { sendCommand, getCommand, completeCommand } = require("../services/commandService");

router.post("/send", async (req, res) => {

    try {

        const { deviceId, command } = req.body;

        const result = await sendCommand(
            deviceId,
            command
        );

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

router.get("/get/:deviceId", async (req, res) => {

    try {

        const result = await getCommand(
            req.params.deviceId
        );

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success:false,
            error:err.message
        });

    }

});

router.post("/complete", async (req, res) => {

    try {

        const { commandId } = req.body;

        const result = await completeCommand(commandId);

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success:false,
            error:err.message
        });

    }

});

module.exports = router;
