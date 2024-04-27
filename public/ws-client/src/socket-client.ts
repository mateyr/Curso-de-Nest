import { Manager, Socket } from "socket.io-client";

let socket: Socket;

export const connectToServer = (token: string) => {
  const manager = new Manager("http://localhost:3000/socket.io/socket.io.js", {
    extraHeaders: { authorization: token },
  });

  socket?.removeAllListeners();
  socket = manager.socket("/");

  addListener();
};

const addListener = () => {
  const serverStatusLabel = document.querySelector("#server-status")!;
  const clientUl = document.querySelector("#client-ul")!;

  const messageForm = document.querySelector<HTMLFormElement>("#message-form")!;
  const messageInput =
    document.querySelector<HTMLInputElement>("#message-input")!;
  const messageUl = document.querySelector("#messages-ul")!;

  socket.on("connect", () => {
    serverStatusLabel.innerHTML = "Connected";
  });

  socket.on("disconnect", () => {
    serverStatusLabel.innerHTML = "Disconnected";
  });

  socket.on("clients-updated", (clients: string[]) => {
    let clientsHtml = "";
    clients.forEach((clientId) => {
      clientsHtml += `<li>${clientId}</li>`;
    });

    clientUl.innerHTML = clientsHtml;
  });

  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (messageInput.value.trim().length <= 0) return;

    console.log(messageInput.value);

    socket.emit("message-from-client", {
      message: messageInput.value,
    });

    messageInput.value = "";
  });

  socket.on(
    "messages-from-server",
    (payload: { fullName: string; message: string }) => {
      const newMessage = `
      <li>
        <strong>${payload.fullName}</strong>
        <span>${payload.message}</span>
      </li>`;

      const li = document.createElement("li");
      li.innerHTML = newMessage;
      messageUl.append(li);
    }
  );
};
