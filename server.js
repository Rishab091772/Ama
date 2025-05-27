const express = require("express");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const login = require("facebook-chat-api");
const app = express();

const PORT = process.env.PORT || 10000;
const OWNER_ID = "61572798270023"; // Replace with your UID

let api = null;
let LOCKED_GROUP_NAMES = {};
let LOCKED_NICKNAMES = {};

app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
  secret: "lock-tool", 
  resave: false, 
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

// Login Page
app.get("/login", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Group Lock Tool</title>
    <style>
      * {
        box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f5f6f8;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }
      .login-container {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 400px;
      }
      h1 {
        color: #1877f2;
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
      }
      button {
        width: 100%;
        padding: 12px;
        background: #1877f2;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      button:hover {
        background: #166fe5;
      }
      @media (max-width: 480px) {
        .login-container {
          padding: 1.5rem;
          margin: 1rem;
        }
      }
    </style>
  </head>
  <body>
    <div class="login-container">
      <h1>Group Lock Tool</h1>
      <form method="post">
        <div class="form-group">
          <label for="uid">Facebook UID</label>
          <input type="text" id="uid" name="uid" placeholder="Enter your UID" required>
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.post("/login", (req, res) => {
  if (req.body.uid === OWNER_ID) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.send(`
      <div style="text-align:center; padding:2rem;">
        <h2 style="color:#ff3333;">Unauthorized</h2>
        <p>You don't have permission to access this tool.</p>
        <a href="/login" style="color:#1877f2;">Go back to login</a>
      </div>
    `);
  }
});

// Main Dashboard
app.get("/", isLoggedIn, (req, res) => {
  res.send(renderDashboard());
});

// Your existing API endpoints remain the same...

function renderDashboard() {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Group Lock Tool</title>
    <style>
      :root {
        --primary: #1877f2;
        --primary-hover: #166fe5;
        --danger: #ff4444;
        --danger-hover: #cc0000;
        --success: #00c851;
        --success-hover: #007e33;
        --border: #dddfe2;
        --text: #1d2129;
        --bg: #f0f2f5;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }
      body {
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      header {
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 15px 0;
        margin-bottom: 20px;
      }
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary);
      }
      .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 20px;
        margin-bottom: 20px;
      }
      .card h2 {
        margin-bottom: 15px;
        color: var(--primary);
        font-size: 20px;
      }
      .form-group {
        margin-bottom: 15px;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }
      input {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 16px;
      }
      button {
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-primary {
        background: var(--primary);
        color: white;
      }
      .btn-primary:hover {
        background: var(--primary-hover);
      }
      .btn-danger {
        background: var(--danger);
        color: white;
      }
      .btn-danger:hover {
        background: var(--danger-hover);
      }
      .btn-success {
        background: var(--success);
        color: white;
      }
      .btn-success:hover {
        background: var(--success-hover);
      }
      .status {
        padding: 10px;
        border-radius: 6px;
        margin: 10px 0;
      }
      .status-success {
        background: #d4edda;
        color: #155724;
      }
      .status-error {
        background: #f8d7da;
        color: #721c24;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }
      @media (max-width: 768px) {
        .grid {
          grid-template-columns: 1fr;
        }
        .header-content {
          flex-direction: column;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="header-content">
        <div class="logo">🛡 Group Lock Tool</div>
        <div>
          <a href="/logout" style="color: var(--danger); text-decoration: none;">Logout</a>
        </div>
      </div>
    </header>

    <div class="container">
      <div class="grid">
        <!-- Appstate Upload -->
        <div class="card">
          <h2>🔑 Facebook Authentication</h2>
          <form method="POST" enctype="multipart/form-data" action="/upload">
            <div class="form-group">
              <label for="appstate">Upload appstate.json</label>
              <input type="file" name="appstate" id="appstate" required>
            </div>
            <button type="submit" class="btn-primary">Upload & Login</button>
          </form>
        </div>

        <!-- Group Name Lock -->
        <div class="card">
          <h2>🔒 Group Name Lock</h2>
          <form method="POST" action="/lockname">
            <div class="form-group">
              <label for="lockname-thread">Thread ID</label>
              <input type="text" name="threadID" id="lockname-thread" required>
            </div>
            <button type="submit" class="btn-primary">Lock Current Name</button>
          </form>
          <form method="POST" action="/unlockname" style="margin-top: 15px;">
            <div class="form-group">
              <label for="unlockname-thread">Thread ID</label>
              <input type="text" name="threadID" id="unlockname-thread" required>
            </div>
            <button type="submit" class="btn-danger">Unlock Name</button>
          </form>
        </div>

        <!-- Nickname Management -->
        <div class="card">
          <h2>👤 Nickname Controls</h2>
          <form method="POST" action="/locknick">
            <div class="form-group">
              <label for="locknick-thread">Thread ID</label>
              <input type="text" name="threadID" id="locknick-thread" required>
            </div>
            <button type="submit" class="btn-primary">Lock Current Nicknames</button>
          </form>
          <form method="POST" action="/nickforall" style="margin-top: 15px;">
            <div class="form-group">
              <label for="nickforall-thread">Thread ID</label>
              <input type="text" name="threadID" id="nickforall-thread" required>
            </div>
            <div class="form-group">
              <label for="nickname">Nickname</label>
              <input type="text" name="nickname" id="nickname" required>
            </div>
            <button type="submit" class="btn-success">Set Same Nickname for All</button>
          </form>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Add logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Your existing API endpoints (upload, lockname, unlockname, locknick, nickforall) remain unchanged...

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
