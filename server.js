const express = require("express");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const login = require("facebook-chat-api");
const app = express();

const PORT = process.env.PORT || 10000;
const OWNER_ID = "100081497970263"; // Replace with your UID

let api = null;
let LOCKED_GROUP_NAMES = {};
let LOCKED_NICKNAMES = {};

app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "lock-tool", resave: false, saveUninitialized: true }));

function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

app.get("/", isLoggedIn, (req, res) => {
  res.send(renderPage());
});

app.get("/login", (req, res) => {
  res.send(`<form method="post">
    <h3>Enter Your Facebook UID</h3>
    <input name="uid" placeholder="UID" required/>
    <button>Login</button>
  </form>`);
});

app.post("/login", (req, res) => {
  if (req.body.uid === OWNER_ID) {
    req.session.loggedIn = true;
    res.redirect("/");
  } else {
    res.send("Unauthorized");
  }
});

app.post("/upload", isLoggedIn, (req, res) => {
  if (!req.files?.appstate) return res.send("Missing appstate.json");
  req.files.appstate.mv("appstate.json", err => {
    if (err) return res.send("Upload error");
    const appState = JSON.parse(fs.readFileSync("appstate.json", "utf8"));
    login({ appState }, (err, loggedApi) => {
      if (err) return res.send("Login error: " + err);
      api = loggedApi;
      api.listenMqtt((err, event) => {
        if (event?.type === "event") {
          const tID = event.threadID;
          if (event.logMessageType === "log:thread-name" && LOCKED_GROUP_NAMES[tID])
            api.setTitle(LOCKED_GROUP_NAMES[tID], tID);
          if (event.logMessageType === "log:user-nickname") {
            const uID = event.logMessageData.participant_id;
            const newNick = event.logMessageData.nickname;
            if (LOCKED_NICKNAMES[tID]?.[uID] && LOCKED_NICKNAMES[tID][uID] !== newNick)
              api.changeNickname(LOCKED_NICKNAMES[tID][uID], tID, uID);
          }
        }
      });
      res.send("✅ Logged in & listening. Go back to <a href='/'>Dashboard</a>");
    });
  });
});

app.post("/lockname", isLoggedIn, (req, res) => {
  const threadID = req.body.threadID;
  api.getThreadInfo(threadID, (err, info) => {
    if (err) return res.send("Failed: " + err);
    LOCKED_GROUP_NAMES[threadID] = info.name;
    res.send("🔒 Group name locked to: " + info.name);
  });
});

app.post("/unlockname", isLoggedIn, (req, res) => {
  delete LOCKED_GROUP_NAMES[req.body.threadID];
  res.send("🔓 Group name unlocked");
});

app.post("/locknick", isLoggedIn, (req, res) => {
  const threadID = req.body.threadID;
  LOCKED_NICKNAMES[threadID] = {};
  api.getThreadInfo(threadID, (err, info) => {
    if (err) return res.send("Error: " + err);
    info.participantIDs.forEach(uid => {
      LOCKED_NICKNAMES[threadID][uid] = info.nicknames[uid] || "";
    });
    res.send("🔒 Nicknames locked.");
  });
});

app.post("/nickforall", isLoggedIn, (req, res) => {
  const { threadID, nickname } = req.body;
  LOCKED_NICKNAMES[threadID] = {};
  api.getThreadInfo(threadID, (err, info) => {
    if (err) return res.send("Error: " + err);
    info.participantIDs.forEach(uid => {
      api.changeNickname(nickname, threadID, uid);
      LOCKED_NICKNAMES[threadID][uid] = nickname;
    });
    res.send("✅ Set nickname for all and locked.");
  });
});

function renderPage() {
  return `
  <html><head><title>Group Lock Tool</title><style>
    body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
    form { margin: 15px 0; }
    input, button { padding: 8px; font-size: 16px; margin: 4px; }
  </style></head><body>
    <h2>🛡 Group Lock Tool</h2>

    <form method="POST" enctype="multipart/form-data" action="/upload">
      <input type="file" name="appstate" required />
      <button>Upload appstate.json</button>
    </form>

    <form method="POST" action="/lockname">
      <input name="threadID" placeholder="Thread ID" required />
      <button>🔒 Lock Group Name</button>
    </form>

    <form method="POST" action="/unlockname">
      <input name="threadID" placeholder="Thread ID" required />
      <button>🔓 Unlock Group Name</button>
    </form>

    <form method="POST" action="/locknick">
      <input name="threadID" placeholder="Thread ID" required />
      <button>🔒 Lock Nicknames</button>
    </form>

    <form method="POST" action="/nickforall">
      <input name="threadID" placeholder="Thread ID" required />
      <input name="nickname" placeholder="Nickname" required />
      <button>📝 Set Same Nickname for All</button>
    </form>
  </body></html>`;
}

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    
