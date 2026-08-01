const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");
const { updateStatus } = require("./statusService");
const { getStatus } = require("./statusService");


// Send New Command

  async function sendCommand(deviceId, command) {

  try {

    // Check current pump status
    const currentStatus =
      await getStatus(deviceId);


    // Ignore duplicate command
    if (
      currentStatus.status === command
    ) {

      return {
        ignored: true,
        message: "Pump already " + command,
        status: currentStatus.status
      };

    }

    // Check existing pending command
    const pending = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      "commands",
      [
        Query.equal("deviceId", deviceId),
        Query.equal("executed", false)
      ]
    );


    // Already pending command exists
    if (pending.documents.length > 0) {

      return pending.documents[0];

    }


    // Create new command
    const result = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      "commands",
      ID.unique(),
      {
        deviceId,
        command,
        executed: false,
        createdAt: new Date().toISOString()
      }
    );


    return result;


  } catch (err) {

    console.error(err);
    throw err;

  }

}



// Get Pending Command
async function getCommand(deviceId) {

  try {

    const result = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      "commands",
      [
        Query.equal("deviceId", deviceId),
        Query.equal("executed", false)
      ]
    );


    if (result.documents.length === 0) {

      return {
        command: "NONE"
      };

    }


    return result.documents[0];


  } catch (err) {

    console.error(err);
    throw err;

  }

}




// Complete Command + Save History + Update Status
async function completeCommand(commandId) {

  try {


    // Get command details
    const command = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      "commands",
      commandId
    );



    // Mark command completed
    const updated = await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      "commands",
      commandId,
      {
        executed: true
      }
    );



    // Save History
    await addHistory(
      command.deviceId,
      command.command,
      "Completed"
    );



    // Update Current Status
    await updateStatus(
      command.deviceId,
      command.command
    );



    return updated;



  } catch (err) {

    console.error(err);
    throw err;

  }

}



module.exports = {

  sendCommand,
  getCommand,
  completeCommand

};
