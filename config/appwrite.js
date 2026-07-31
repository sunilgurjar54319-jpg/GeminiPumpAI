const { Client, Databases } = require("node-appwrite");

require("dotenv").config();

// Force IPv4 (Termux workaround)
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first";

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

module.exports = databases;
