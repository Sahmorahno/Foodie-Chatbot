const io = "./module/io.js";
const socket = io();

// Query DOM elements
const inputField = document.getElementById("inputField");
const formEl = document.querySelector("form");
const chatBox = document.getElementById("chatBox");
const sendButtonEl = document.getElementById("sendButton");

// Helper function to append a message to the chat box
function appendMessage(message, sender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message-text", sender);
  messageElement.textContent = message;

  const timestamp = new Date().toLocaleTimeString(); // create timestamp
  const timestampElement = document.createElement("span"); // create span element for timestamp
  timestampElement.classList.add("timestamp");
  timestampElement.textContent = timestamp;

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message-container");
  messageContainer.appendChild(messageElement);
  messageContainer.appendChild(timestampElement);
  chatBox.appendChild(messageContainer);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle sending messages
function sendMessage() {
  alert("Yes oo");
  const message = inputField.value.trim();
  if (message === "") {
    return;
  }
  appendMessage(message, "user");
  socket.emit("user-message", message);
  inputField.value = "";
}

// Handle receiving messages from the server
socket.on("bot-message", (message) => {
  appendMessage(message, "bot");
});

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

sendButtonEl.addEventListener("click", sendMessage);

inputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});
