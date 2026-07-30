const express = require("express");
const router = express.Router();

const databases = require("../config/appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = "schedules";


// Create Schedule
router.post("/", async (req, res) => {

  try {

    const {
      deviceId,
      startTime,
      endTime,
      days,
      enabled
    } = req.body;


    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      "unique()",
      {
        deviceId,
        startTime,
        endTime,
        days,
        enabled
      }
    );


    res.json({
      success:true,
      schedule:result
    });


  } catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });

  }

});


// Get All Schedule
router.get("/:deviceId", async (req,res)=>{

  try{

    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID
    );


    const schedules =
      result.documents.filter(
        item => item.deviceId === req.params.deviceId
      );


    res.json({
      success:true,
      schedules
    });


  }catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });

  }

});


module.exports = router;
