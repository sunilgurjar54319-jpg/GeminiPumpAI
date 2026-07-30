const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");
const { addHistory } = require("./historyService");


// Send New Command
async function sendCommand(deviceId, command) {

    try {

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


// Complete Command + Save History
async function completeCommand(commandId) {

    try {

        // Get command details first
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


        // Save history
        await addHistory(
            command.deviceId,
            command.command,
            "Completed"
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
