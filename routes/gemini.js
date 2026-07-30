const express = require("express");
const router = express.Router();

const { understandCommand } = require("../services/geminiService");
const { sendCommand } = require("../services/commandService");


router.post("/voice", async (req, res) => {

    try {

        const { text } = req.body;

        const command = await understandCommand(text);

        if (!command) {
            return res.json({
                success:false,
                message:"Command not understood"
            });
        }


        const result = await sendCommand(
            "PUMP001",
            command
        );


        res.json({
            success:true,
            command:command,
            result:result
        });


    } catch(error){

        res.status(500).json({
            success:false,
            error:error.message
        });

    }

});


module.exports = router;
