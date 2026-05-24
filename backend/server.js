const http = require("http");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./mockDB.js");
const bcrypt = require("bcrypt");

const PORT = 6767;
const JWT_SECRET_KEY =
  process.env.JWT_SECRET || "SECRET_JSON_KEY_VERY_VERY_CONFIDENTIAL_1255777";

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

function sendResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // to be changed on production (MUST!!!)
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  const url = request.url;
  const method = request.method;

  // CORS Preflight
  if (method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
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
      const cookieConfig = `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/`;
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": cookieConfig,
      });
      return response.end(
        JSON.stringify({ success: true, message: "Login successful!" }),
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
        return sendJSON(res, 400, { error: "Missing required fields" });
      }

      const userExists = db.findUserByEmail(email);
      if (userExists) {
        return sendJSON(res, 409, { error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: crypto.randomUUID(),
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

      return sendJSON(res, 201, {
        success: true,
        message: "User registered successfully!",
      });
    } catch (error) {
      return sendResponse(response, 500, { error: "Internal Server Error" });
    }
  }
  return sendResponse(response, 404, { error: "Route not found" });
});
