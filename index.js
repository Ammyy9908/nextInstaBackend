const app_rouetes = require("./routes/app_routes");
const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { joinUser, getCurrentUser, userLeave } = require("./utils/users");

const serviceAccount = require("./ServiceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
const db = admin.firestore();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: "['GET','POST']",
  },
});

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World");
});

async function validateToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send("Access Denied");
  }
  try {
    const decoded = await jwt.verify(token, "secret");
    if (decoded) {
      req.message = decoded;
      next();
    } else {
      return res.status(401).send("Access Denied");
    }
  } catch (e) {
    return res.status(401).send("Access Denied");
  }
}

app
  .get("/message", validateToken, (req, res) => {
    const { message } = req;
    res.status(200).send({ message: message });
  })
  .post("/activity", async (req, res) => {
    const { user } = req.body;
    await db.collection("online_activity").doc(user).set({
      user: user,
    });
    res.status(200).send({ success: true });
  })
  .post("/message/:from/:to", async (req, res) => {
    const { from, to } = req.params;
    const { message } = req.body;
    const token = await jwt.sign({ message: message.content }, "NEXT_SECRET");

    try {
      await db.collection("messages").doc(new Date().getTime().toString()).set({
        message_id: new Date().getTime().toString(),
        from: from,
        to: to,
        message,
        created_at: new Date().getTime(),
        sender_reaction: null,
        reciever_reaction: null,
        message_token: token,
      });

      res.send({ message: "Message sent" });
    } catch (e) {
      res.send({ message: "Error" });
    }
  });

const port = process.env.PORT || 5000;

app.set("socketio", io);

io.on("connection", async (socket) => {
  console.log(socket.id);
  socket.on("join", async ({ user }) => {
    joinUser(socket.id, user);
    // console.log(new_user);
    const joined = await db.collection("onlineactivities").doc(user).set(
      {
        id: user,
        live: true,
        last_login: new Date().getTime(),
        socket_id: socket.id,
      },
      {
        merge: true,
      }
    );

    if (joined) {
      console.log("joined");
    }
    // send room info when user joins
  });
  socket.on("disconnect", async () => {
    const user = getCurrentUser(socket.id);
    console.log(user);
    const leaved = await db
      .collection("onlineactivities")
      .doc(user.uid)
      .update({
        live: false,
        last_login: new Date().getTime(),
      });

    if (leaved) {
      console.log("Leaved");
      userLeave(socket.id);
    }
    console.log("Client disconnected");
  });
});

server.listen(port, () => {
  console.log(`Listening on ${port}`);
});
