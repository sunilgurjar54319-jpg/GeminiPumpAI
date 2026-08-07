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

const rawDatabases = new Databases(client);


// =====================================================
// STABILITY HARDENING — READ RETRY ONLY
// =====================================================
//
// IMPORTANT:
// - READ operations may retry on temporary network errors.
// - WRITE operations are NOT automatically retried.
// - This prevents accidental duplicate ON/OFF commands.
// =====================================================

const READ_METHODS = new Set([
  "listDocuments",
  "getDocument"
]);

const MAX_READ_RETRIES = 2;
const RETRY_DELAY_MS = 1500;


// -----------------------------------------------------
// Decide whether an error is likely temporary/network
// -----------------------------------------------------

function isRetryableReadError(error) {

  if (!error) {
    return false;
  }

  const code = Number(error.code);

  // Common HTTP temporary/server conditions
  if (
    code === 408 ||
    code === 429 ||
    code === 500 ||
    code === 502 ||
    code === 503 ||
    code === 504
  ) {
    return true;
  }

  const message =
    String(error.message || "").toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("fetch failed")
  );
}


// -----------------------------------------------------
// Retry wrapper for READ operations only
// -----------------------------------------------------

async function executeReadWithRetry(
  methodName,
  originalMethod,
  args
) {

  let lastError;

  for (
    let attempt = 0;
    attempt <= MAX_READ_RETRIES;
    attempt++
  ) {

    try {

      return await originalMethod(...args);

    } catch (error) {

      lastError = error;

      if (
        attempt >= MAX_READ_RETRIES ||
        !isRetryableReadError(error)
      ) {
        throw error;
      }

      const retryNumber = attempt + 1;

      console.log(
        `⚠️ Appwrite ${methodName} read failed. ` +
        `Retry ${retryNumber}/${MAX_READ_RETRIES} ` +
        `in ${RETRY_DELAY_MS}ms: ${error.message}`
      );

      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_MS)
      );

    }

  }

  throw lastError;
}


// -----------------------------------------------------
// Keep the existing Databases API intact
// -----------------------------------------------------

const databases = new Proxy(
  rawDatabases,
  {

    get(target, property, receiver) {

      const original = Reflect.get(
        target,
        property,
        receiver
      );

      if (
        typeof original !== "function"
      ) {
        return original;
      }

      // Only these two operations get retry protection.
      if (READ_METHODS.has(property)) {

        return async (...args) => {

          return executeReadWithRetry(
            property,
            original.bind(target),
            args
          );

        };

      }

      // All writes remain exactly one attempt.
      return original.bind(target);
    }

  }
);


module.exports = databases;
