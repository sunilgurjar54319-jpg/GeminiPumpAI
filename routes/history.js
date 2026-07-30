const express = require("express");
const router = express.Router();

const { getHistory } = require("../services/historyService");


router.get("/:deviceId", async (req, res) => {

    try {

        const result = await getHistory(
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


module.exports = router;
