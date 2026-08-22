const express = require("express");
const router = express.Router();

const { Client, Users, ID } = require("node-appwrite");

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);


// =========================================
// REGISTER — EMAIL + PASSWORD
// =========================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });

        }

        if (password.length < 8) {

            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters"
            });

        }

        const user = await users.create(
            ID.unique(),
            email.trim(),
            undefined,
            password,
            name || undefined
        );

        res.status(201).json({

            success: true,

            message: "Registration successful",

            user: {
                id: user.$id,
                name: user.name,
                email: user.email
            }

        });

    } catch (err) {

        console.error(
            "Register Error:",
            err.message
        );

        res.status(400).json({
            success: false,
            error: err.message
        });

    }

});


module.exports = router;
