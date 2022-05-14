const app_rouetes = require("./routes/app_routes");
const express = require("express");
const http = require("http");
const cors = require("cors");
const admin = require("firebase-admin");
const { joinUser, getCurrentUser, userLeave } = require("./utils/users");

const serviceAccount = require("./serviceAccount.json");
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

app
  .get("/fetch", (req, res) => {
    res.send("Chat route");
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
    try {
      const sented = await db
        .collection("messages")
        .doc(new Date().getTime().toString())
        .set({
          from: from,
          to: to,
          message,
          created_at: new Date().getTime(),
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
