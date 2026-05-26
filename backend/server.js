import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import * as db from "./mockDB.js";
import bcrypt from "bcrypt";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 6767;
const JWT_SECRET_KEY =
  process.env.JWT_SECRET || "SECRET_JSON_KEY_VERY_VERY_CONFIDENTIAL_1255777";
const ALLOWED_ORIGIN = "http://localhost:5500"; // Security Vulneribility. MUST be changed on production (MUST!!!)

async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body recieved"));
      }
    });
  });
}

function sendResponse(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  const url = request.url;
  console.log(url);
  const method = request.method;

  // CORS Preflight
  if (method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return response.end();
  }

  // serve static html files

  if (
    method === "GET" &&
    !url.startsWith("/auth") &&
    !url.startsWith("/wallet")
  ) {
    const safePath = url === "/" ? "/Home.html" : url;
    const filePath = path.join(__dirname, "..", safePath);
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    };
    try {
      const content = fs.readFileSync(filePath);
      response.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "text/plain",
      });
      response.end(content);
      return;
    } catch {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
  }

  if (url === "/auth/login" && method === "POST") {
    try {
      const { accountNumber, password } = await parseRequestBody(request);
      if (!accountNumber || !password) {
        return sendResponse(response, 400, {
          error: "Missing account number or password",
        });
      }
      const user = db.findUserByAccNumber(accountNumber);

      if (!user) {
        return sendResponse(response, 404, { error: "User does not exist" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return sendResponse(response, 401, { error: "Incorrect password" });
      }

      const token = jwt.sign({ accountNumber }, JWT_SECRET_KEY, {
        expiresIn: "10m",
      });
      const cookieConfig = `token=${token}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/`; // have to add a secure flag if/after plublishing it in a secure https site domain! also change sameSit from Lax to Strict
      return sendResponse(
        response,
        200,
        { success: true, message: "Login successful!" },
        { "Set-Cookie": cookieConfig },
      );
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal Server Error" });
    }
  }

  if (url === "/auth/register" && method === "POST") {
    try {
      const body = await parseRequestBody(request);
      const { name, email, password } = body;

      if (!name || !email || !password) {
        return sendResponse(response, 400, {
          error: "Missing required fields",
        });
      }

      const userExists = db.findUserByEmail(email);
      if (userExists) {
        return sendResponse(response, 409, {
          error: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: crypto.randomUUID(),
        accountNumber: db.generateNextAccountNumber(),
        name,
        email,
        password_hash: hashedPassword,
        role: "user",
        dateCreated: Date.now(),
      };
      db.createUser(newUser);

      db.createWallet({
        id: crypto.randomUUID(),
        user_id: newUser.id,
        balance: 0,
        currency: "PKR",
      });

      const token = jwt.sign(
        { accountNumber: newUser.accountNumber },
        JWT_SECRET_KEY,
        {
          expiresIn: "10m",
        },
      );
      const cookieConfig = `token=${token}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/`;

      return sendResponse(
        response,
        201,
        {
          success: true,
          message: "User registered and logged in successfully!",
        },
        { "Set-Cookie": cookieConfig },
      );
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal Server Error" });
    }
  }

  if (url === "/auth/profile" && method === "GET") {
    try {
      const cookieHeader = request.headers.cookie || "";

      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return sendResponse(response, 401, {
          error: "Not authenticated. No token found.",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET_KEY);
      } catch (err) {
        return sendResponse(response, 401, {
          error: "Session expired or invalid token.",
        });
      }

      const user = db.findUserByAccNumber(decoded.accountNumber);
      if (!user) {
        return sendResponse(response, 404, { error: "User not found." });
      }

      const wallet = db.findWalletByUserId(user.id);

      return sendResponse(response, 200, {
        success: true,
        user: {
          id: user.id,
          accountNumber: user.accountNumber,
          name: user.name,
          email: user.email,
          role: user.role,
          dateCreated: user.dateCreated,
        },
        wallet: wallet
          ? {
              id: wallet.id,
              user_id: user.id,
              balance: wallet.balance,
              currency: wallet.currency,
            }
          : null,
      });
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal server error" });
    }
  }

  // --- WALLET DEPOSIT ROUTE ---
  if (url === "/wallet/deposit" && method === "POST") {
    try {
      const cookieHeader = request.headers.cookie || "";
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return sendResponse(response, 401, { error: "Not authenticated." });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET_KEY);
      } catch (err) {
        return sendResponse(response, 401, {
          error: "Session expired or invalid token.",
        });
      }

      const user = db.findUserByAccNumber(decoded.accountNumber);
      if (!user) {
        return sendResponse(response, 404, { error: "User not found." });
      }

      const { amount } = await parseRequestBody(request);
      if (!amount || amount <= 0) {
        return sendResponse(response, 400, {
          error: "Invalid deposit amount.",
        });
      }

      const wallet = db.findWalletByUserId(user.id);
      if (!wallet) {
        return sendResponse(response, 404, { error: "Wallet not found." });
      }

      wallet.balance += amount;

      db.recordTransaction({
        id: crypto.randomUUID(),
        userId: user.id,
        type: "Deposit",
        amount: amount,
        timestamp: Date.now()
      });

      return sendResponse(response, 200, {
        success: true,
        message: "Deposit processed successfully.",
        newBalance: wallet.balance,
      });
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal server error" });
    }
  }

  // --- WALLET WITHDRAW ROUTE ---
  if (url === "/wallet/withdraw" && method === "POST") {
    try {
      const cookieHeader = request.headers.cookie || "";
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return sendResponse(response, 401, { error: "Not authenticated." });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET_KEY);
      } catch (err) {
        return sendResponse(response, 401, {
          error: "Session expired or invalid token.",
        });
      }

      const user = db.findUserByAccNumber(decoded.accountNumber);
      if (!user) {
        return sendResponse(response, 404, { error: "User not found." });
      }

      const { amount } = await parseRequestBody(request);
      if (!amount || amount <= 0) {
        return sendResponse(response, 400, {
          error: "Invalid withdrawal amount.",
        });
      }

      const wallet = db.findWalletByUserId(user.id);
      if (!wallet) {
        return sendResponse(response, 404, { error: "Wallet not found." });
      }

      if (wallet.balance < amount) {
        return sendResponse(response, 400, { error: "Insufficient funds." });
      }

      wallet.balance -= amount;

      db.recordTransaction({
        id: crypto.randomUUID(),
        userId: user.id,
        type: "Deposit",
        amount: amount,
        timestamp: Date.now()
      });


      return sendResponse(response, 200, {
        success: true,
        message: "Withdrawal processed successfully.",
        newBalance: wallet.balance,
      });
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal server error" });
    }
  }

  // --- WALLET TRANSFER ROUTE ---
  if (url === "/wallet/transfer" && method === "POST") {
    try {
      const cookieHeader = request.headers.cookie || "";
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return sendResponse(response, 401, { error: "Not authenticated." });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET_KEY);
      } catch (err) {
        return sendResponse(response, 401, {
          error: "Session expired or invalid token.",
        });
      }

      const sender = db.findUserByAccNumber(decoded.accountNumber);
      if (!sender) {
        return sendResponse(response, 404, { error: "User not found." });
      }

      const { amount, recipient } = await parseRequestBody(request);

      if (!amount || amount <= 0) {
        return sendResponse(response, 400, {
          error: "Invalid transfer amount.",
        });
      }
      if (!recipient) {
        return sendResponse(response, 400, {
          error: "Recipient identifier missing.",
        });
      }

      let recipientUserId = null;

      // try searching recipient by email
      const recipientUser = db.findUserByEmail(recipient);
      if (recipientUser) {
        recipientUserId = recipientUser.id;
      } else {
        // else try searching  by wallet id
        const recipientWallet = db.findWalletById(recipient);
        if (recipientWallet) {
          recipientUserId = recipientWallet.user_id;
        }
      }

      if (!recipientUserId) {
        return sendResponse(response, 404, {
          error: "Recipient not found. Please check the email or Wallet ID.",
        });
      }

      if (recipientUserId === sender.id) {
        return sendResponse(response, 400, {
          error: "Cannot transfer to yourself.",
        });
      }

      try {
        db.executeTransfer(sender.id, recipientUserId, amount);
      } catch (err) {
        return sendResponse(response, 400, { error: err.message });
      }

      const updatedSenderWallet = db.findWalletByUserId(sender.id);

      return sendResponse(response, 200, {
        success: true,
        message: "Transfer processed successfully.",
        newBalance: updatedSenderWallet.balance,
      });
    } catch (error) {
      console.error("Transfer Error:", error);
      return sendResponse(response, 500, { error: "Internal server error" });
    }
  }

  // --- TRANSACTION HISTORY ROUTE ---
  if (url === "/wallet/transactions" && method === "GET") {
    try {
      const cookieHeader = request.headers.cookie || "";
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return sendResponse(response, 401, { error: "Not authenticated." });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET_KEY);
      } catch (err) {
        return sendResponse(response, 401, {
          error: "Session expired or invalid token.",
        });
      }

      const user = db.findUserByAccNumber(decoded.accountNumber);
      if (!user) {
        return sendResponse(response, 404, { error: "User not found." });
      }

      const history = db.getUserTransactions(user.id);

      return sendResponse(response, 200, {
        success: true,
        transactions: history,
      });
    } catch (error) {
      console.error("Transaction Fetch Error:", error);
      return sendResponse(response, 500, { error: "Internal server error" });
    }
  }

  return sendResponse(response, 404, { error: "Route not found" });
});

// STARTING THE SERVER

server.listen(PORT, () => {
  console.log(`Listening at ${PORT}...`);
});
