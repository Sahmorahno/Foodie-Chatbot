import "reflect-metadata";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import sharedSession from "express-socket.io-session";
import http from "http";
import path from "path";
import { createClient } from "redis";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { fastFoods } from "./utils/items.js";
import { COOKIE_NAME, __prod__ } from "./utils/constant.js";

const app = express();

let redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

let redisStore = new RedisStore({
  client: redisClient,
  prefix: "myapp:",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);
const io = new Server(server);

const orderHistory = [];

const sessionStore = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  name: COOKIE_NAME,
  store: redisStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
    httpOnly: !__prod__,
    sameSite: !__prod__ ? "none" : "lax",
    secure: !__prod__,
  },
});

app.use(express.static(__dirname + "/public"));

app.use(sessionStore);

io.engine.use(sessionStore);

io.use(sharedSession(sessionStore));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("bot-message", "Hello! What is your name?");

  socket.on("user-message", (message) => {
    console.log("User message received:", message);
    const session = socket.handshake.session;

    if (!session.userName) {
      session.userName = message;
      socket.emit(
        "bot-message",
        `Welcome to the ChatBot, ${session.userName}! To place an order kindly select\n1. To checkout an order kindly select\n99. To see your order history kindly select\n98. To see your current order kindly select\n97. To cancel an order kindly select\n0. Cancel order`
      );
    } else {
      switch (message) {
        case "1":
          const itemOptions = Object.keys(fastFoods)
            .map((key) => `${key}. ${fastFoods[key]}`)
            .join("\n");
          socket.emit(
            "bot-message",
            `Here is a list of items you can order:\n ${itemOptions} \nPlease select one by typing its number.`
          );
          break;

        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
          const selectedIndex = parseInt(message);
          if (fastFoods.hasOwnProperty(selectedIndex)) {
            const selectedItem = fastFoods[selectedIndex];
            session.currentOrder = session.currentOrder || [];
            session.currentOrder.push(selectedItem);
            socket.emit(
              "bot-message",
              `${selectedItem} has been added to your order. Do you want to add more fast foods to your order? Type numbers. If not, type 99 to checkout.`
            );
          } else {
            socket.emit("bot-message", "Invalid selection.");
          }
          break;

        case "99":
          if (!session.currentOrder || session.currentOrder.length === 0) {
            socket.emit(
              "bot-message",
              "No order to place. Place an order\n1. See menu"
            );
          } else {
            orderHistory.push(session.currentOrder);
            socket.emit("bot-message", "Order placed");
            delete session.currentOrder;
          }
          break;

        case "98":
          if (orderHistory.length === 0) {
            socket.emit("bot-message", "No previous orders");
          } else {
            const orderHistoryString = orderHistory
              .map((order, index) => `Order ${index + 1}: ${order.join(", ")}`)
              .join("\n");
            socket.emit(
              "bot-message",
              `Here is your order history:\n ${orderHistoryString}`
            );
          }
          break;

        case "97":
          if (!session.currentOrder || session.currentOrder.length === 0) {
            socket.emit(
              "bot-message",
              "No current order. Place an order\n1. See menu"
            );
          } else {
            const currentOrderString = session.currentOrder.join(", ");
            socket.emit(
              "bot-message",
              `Here is your current order:\n ${currentOrderString}`
            );
          }
          break;

        case "0":
          if (session.currentOrder && session.currentOrder.length > 0) {
            delete session.currentOrder;
            socket.emit("bot-message", "Order cancelled");
          } else {
            socket.emit("bot-message", "No current order to cancel");
          }
          break;

        default:
          socket.emit("bot-message", "Invalid selection.");
          break;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
