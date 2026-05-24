import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import * as db from "./mockDB.js";
import bcrypt from "bcrypt";

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

      response.setHeader("Set-Cookie", cookieConfig);
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

  return sendResponse(response, 404, { error: "Route not found" });
});

// STARTING THE SERVER

server.listen(PORT, () => {
  console.log(`Listening at ${PORT}...`);
});
