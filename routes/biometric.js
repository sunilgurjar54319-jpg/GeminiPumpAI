const express = require("express");
const router = express.Router();

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require("@simplewebauthn/server");

const { ID, Query, Client, Users } = require("node-appwrite");
const databases = require("../config/appwrite");
const { requireAuth } = require("../middleware/auth");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = "biometriccredentials";

// WebAuthn RP configuration
const RP_NAME = "Gemini Pump AI";

// IMPORTANT:
// This must match the domain from which the frontend is actually opened.
// For now use your Render domain.
const RP_ID = "gemini-pump-ai.vercel.app";
const ORIGIN = "https://gemini-pump-ai.vercel.app";

// Temporary in-memory challenge store.
// Challenge is short-lived and is only used during registration.
const registrationChallenges = new Map();



// Temporary authentication challenge store.
const authenticationChallenges = new Map();


// =====================================================
// LOGIN OPTIONS
// =====================================================

router.post(
  "/login/options",
  async (req, res) => {
    try {
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "required"
      });

      authenticationChallenges.set(options.challenge, {
        challenge: options.challenge,
        createdAt: Date.now()
      });

      res.json({
        success: true,
        options
      });

    } catch (err) {
      console.error(
        "Biometric Login Options Error:",
        err.message
      );

      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);


// =====================================================
// LOGIN VERIFY
// =====================================================

router.post(
  "/login/verify",
  async (req, res) => {
    try {
      const credentialId =
        req.body?.id || req.body?.rawId;

      if (!credentialId) {
        return res.status(400).json({
          success: false,
          error: "Credential ID is required."
        });
      }

      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal("credentialId", credentialId),
          Query.limit(1)
        ]
      );

      if (existing.documents.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Biometric credential not registered."
        });
      }

      const credential = existing.documents[0];

      // Read the challenge from WebAuthn clientDataJSON
      // so we verify the exact login attempt that was created.
      let clientChallenge;

      try {
        const clientDataJSON =
          Buffer.from(
            req.body?.response?.clientDataJSON || "",
            "base64url"
          ).toString("utf8");

        const clientData = JSON.parse(clientDataJSON);
        clientChallenge = clientData.challenge;
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid WebAuthn client data."
        });
      }

      if (!clientChallenge) {
        return res.status(400).json({
          success: false,
          error: "WebAuthn challenge missing."
        });
      }

      const challengeEntry =
        authenticationChallenges.get(clientChallenge);

      if (!challengeEntry) {
        return res.status(400).json({
          success: false,
          error: "Biometric login session expired."
        });
      }

      if (
        Date.now() - challengeEntry.createdAt >
        5 * 60 * 1000
      ) {
        authenticationChallenges.delete(
          clientChallenge
        );

        return res.status(400).json({
          success: false,
          error: "Biometric login session expired."
        });
      }

      const verification =
        await verifyAuthenticationResponse({
          response: req.body,
          expectedChallenge: challengeEntry.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          credential: {
            id: credential.credentialId,
            publicKey: Buffer.from(
              credential.publicKey,
              "base64"
            ),
            counter: credential.counter || 0,
            transports: credential.transports
              ? credential.transports.split(",").filter(Boolean)
              : undefined
          },
          requireUserVerification: true
        });

      if (!verification.verified) {
        return res.status(401).json({
          success: false,
          error: "Biometric authentication failed."
        });
      }

      const newCounter =
        verification.authenticationInfo?.newCounter ??
        credential.counter ??
        0;

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        credential.$id,
        {
          counter: newCounter
        }
      );

      authenticationChallenges.delete(
        clientChallenge
      );

      // Create an Appwrite session for the credential owner.
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const users = new Users(client);

      const session =
        await users.createSession(
          credential.userId
        );

      // Create a JWT from that Appwrite session.
      const sessionClient = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setSession(session.secret);

      const sessionAccount =
        new (require("node-appwrite").Account)(
          sessionClient
        );

      const jwtResult =
        await sessionAccount.createJWT();

      res.json({
        success: true,
        message: "Biometric login successful.",
        jwt: jwtResult.jwt
      });

    } catch (err) {
      console.error(
        "Biometric Login Verify Error:",
        err.message
      );

      res.status(401).json({
        success: false,
        error: err.message
      });
    }
  }
);


// =====================================================
// REGISTRATION OPTIONS
// =====================================================

router.post(
  "/register/options",
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.userId;

      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal("userId", userId),
          Query.limit(100)
        ]
      );

      const excludeCredentials = existing.documents
        .filter(doc => doc.credentialId)
        .map(doc => ({
          id: doc.credentialId
        }));

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: req.user.email || userId,
        userDisplayName: req.user.name || "User",
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required"
        },
        supportedAlgorithmIDs: [-7, -257]
      });

      registrationChallenges.set(userId, {
        challenge: options.challenge,
        createdAt: Date.now()
      });

      res.json({
        success: true,
        options
      });

    } catch (err) {
      console.error(
        "Biometric Registration Options Error:",
        err.message
      );

      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);


// =====================================================
// REGISTRATION VERIFY
// =====================================================

router.post(
  "/register/verify",
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.userId;
      const savedChallenge = registrationChallenges.get(userId);

      if (!savedChallenge) {
        return res.status(400).json({
          success: false,
          error: "Biometric registration session expired."
        });
      }

      // Challenge valid for 5 minutes only.
      if (Date.now() - savedChallenge.createdAt > 5 * 60 * 1000) {
        registrationChallenges.delete(userId);

        return res.status(400).json({
          success: false,
          error: "Biometric registration session expired."
        });
      }

      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge: savedChallenge.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({
          success: false,
          error: "Biometric registration verification failed."
        });
      }

      const registrationInfo = verification.registrationInfo;

      const credentialId =
        registrationInfo.credential.id;

      const publicKey =
        Buffer.from(
          registrationInfo.credential.publicKey
        ).toString("base64");

      const counter =
        registrationInfo.credential.counter || 0;

      const transports =
        req.body?.response?.transports || [];

      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal("userId", userId),
          Query.equal("credentialId", credentialId),
          Query.limit(1)
        ]
      );

      if (existing.documents.length > 0) {
        registrationChallenges.delete(userId);

        return res.json({
          success: true,
          message: "Biometric credential already registered."
        });
      }

      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          userId,
          credentialId,
          publicKey,
          counter,
          transports: Array.isArray(transports)
            ? transports.join(",")
            : "",
          createdAt: new Date().toISOString()
        }
      );

      registrationChallenges.delete(userId);

      res.json({
        success: true,
        message: "Biometric enabled successfully."
      });

    } catch (err) {
      console.error(
        "Biometric Registration Verify Error:",
        err.message
      );

      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }
);


module.exports = router;
