const express = require("express");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const login = require("facebook-chat-api");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;
const OWNER_ID = "61572798270023";

let api = null;
let LOCKED_GROUP_NAMES = {};
let LOCKED_NICKNAMES = {};

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "lock-tool",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.send(`
    <form method="POST" action="/login" style="text-align:center;margin-top:80px;">
      <h2>Enter UID to Access Tool</h2>
      <input name="uid" placeholder="Your Facebook UID" required/>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  if (req.body.uid === OWNER_ID) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.send(`<h3>Unauthorized</h3><a href="/login">Try Again</a>`);
  }
});

app.get("/", isLoggedIn, (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Group Lock Tool</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Arial; background: #f2f2f2; padding: 20px; }
      .box { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
      input, button { padding: 10px; font-size: 16px; margin-top: 5px; width: 100%; }
      button { background: #1877f2; color: white; border: none; border-radius: 4px; margin-top: 10px; }
      h2 { color: #1877f2; }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>Upload Appstate</h2>
      <form method="POST" action="/upload" enctype="multipart/form-data">
        <input type="file" name="appstate" required />
        <button type="submit">Upload & Login</button>
      </form>
    </div>

    <div class="box">
      <h2>Lock Group Name</h2>
      <form method="POST" action="/lockname">
        <input type="text" name="threadID" placeholder="Group Thread ID" required />
        <button type="submit">Lock Name</button>
      </form>
    </div>

    <div class="box">
      <h2>Unlock Group Name</h2>
      <form method="POST" action="/unlockname">
        <input type="text" name="threadID" placeholder="Group Thread ID" required />
        <button type="submit">Unlock Name</button>
      </form>
    </div>

    <div class="box">
      <h2>Lock All Nicknames</h2>
      <form method="POST" action="/locknick">
        <input type="text" name="threadID" placeholder="Group Thread ID" required />
        <button type="submit">Lock Nicknames</button>
      </form>
    </div>

    <div class="box">
      <h2>Set Same Nickname for All</h2>
      <form method="POST" action="/nickforall">
        <input type="text" name="threadID" placeholder="Group Thread ID" required />
        <input type="text" name="nickname" placeholder="Nickname" required />
        <button type="submit">Set Nickname</button>
      </form>
    </div>

    <div class="box">
      <a href="/logout"><button style="background:#d9534f;">Logout</button></a>
    </div>
  </body>
  </html>
  `);
});

app.post("/upload", isLoggedIn, (req, res) => {
  if (!req.files?.appstate) return res.send("No file uploaded.");
  const file = req.files.appstate;
  const pathToSave = path.join(uploadsDir, "appstate.json");

  file.mv(pathToSave, (err) => {
    if (err) return res.send("Failed to save file.");

    const appState = JSON.parse(fs.readFileSync(pathToSave, "utf8"));
    login({ appState }, (err, fbApi) => {
      if (err) return res.send("Login failed: " + err.message);
      api = fbApi;
      res.redirect("/");
    });
  });
});

app.post("/lockname", isLoggedIn, (req, res) => {
  const id = req.body.threadID;
  if (!api) return res.send("Login first.");
  api.getThreadInfo(id, (err, info) => {
    if (err) return res.send("Failed to get thread info.");
    LOCKED_GROUP_NAMES[id] = info.name;
    res.send(`Group name locked as: ${info.name}`);
  });
});

app.post("/unlockname", isLoggedIn, (req, res) => {
  const id = req.body.threadID;
  delete LOCKED_GROUP_NAMES[id];
  res.send(`Group name unlocked for ${id}`);
});

app.post("/locknick", isLoggedIn, (req, res) => {
  const id = req.body.threadID;
  if (!api) return res.send("Login first.");
  api.getThreadInfo(id, (err, info) => {
    if (err) return res.send("Failed to get thread info.");
    LOCKED_NICKNAMES[id] = {};
    info.participantIDs.forEach(uid => {
      LOCKED_NICKNAMES[id][uid] = info.nicknames[uid] || "";
    });
    res.send(`Locked nicknames for thread ${id}`);
  });
});

app.post("/nickforall", isLoggedIn, (req, res) => {
  const id = req.body.threadID;
  const nick = req.body.nickname;
  if (!api) return res.send("Login first.");
  api.getThreadInfo(id, (err, info) => {
    if (err) return res.send("Failed to get thread info.");
    const users = info.participantIDs;
    users.forEach(uid => {
      api.setNickname(nick, id, uid, () => {});
    });
    res.send(`Nickname "${nick}" set for all in thread ${id}`);
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  api = null;
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
