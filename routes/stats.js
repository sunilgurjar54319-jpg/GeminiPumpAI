const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");
const { Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;


// Pump Statistics
router.get("/:deviceId", async (req, res) => {

  try {

    const result = await databases.listDocuments(
      DATABASE_ID,
      "history",
      [
        Query.equal(
          "deviceId",
          req.params.deviceId
        ),
        Query.orderDesc("$createdAt"),
        Query.limit(100)
      ]
    );


    let totalON = 0;
    let totalOFF = 0;


    result.documents.forEach(item => {

      if(item.command === "ON"){
        totalON++;
      }

      if(item.command === "OFF"){
        totalOFF++;
      }

    });


    res.json({
      success:true,
      deviceId:req.params.deviceId,
      totalON,
      totalOFF,
      totalRecords:result.documents.length,
      history:result.documents
    });


  } catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });

  }

});


module.exports = router;
