const databases = require("../config/appwrite");
const { ID, Query } = require("node-appwrite");


// Update Device Status
async function updateStatus(deviceId, status) {

    try {

        const old = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            "status",
            [
                Query.equal("deviceId", deviceId)
            ]
        );


        if(old.documents.length > 0){

            return await databases.updateDocument(
                process.env.APPWRITE_DATABASE_ID,
                "status",
                old.documents[0].$id,
                {
                    status,
                    updatedAt: new Date().toISOString()
                }
            );

        }


        return await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            "status",
            ID.unique(),
            {
                deviceId,
                status,
                updatedAt: new Date().toISOString()
            }
        );


    } catch(err){

        console.error(err);
        throw err;

    }

}


// Get Status
async function getStatus(deviceId){

    const result = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        "status",
        [
            Query.equal("deviceId", deviceId)
        ]
    );

    if(result.documents.length === 0){
        return {
            status:"UNKNOWN"
        };
    }


    return result.documents[0];

}


module.exports = {
    updateStatus,
    getStatus
};
