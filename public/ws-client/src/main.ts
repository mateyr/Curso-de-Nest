import { connectToServer } from "./socket-client";
import "./style.css";
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
// import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
  <h2>WebScoket - Client</h2>

  <input id="jwt-token" placeholder="Json Web Token"/>
  <button id="btn-connect">Connect</button>
  
  <br/>
  <span id="server-status">Offline</span>
  
  <ul id="client-ul">
  </ul>

  <form id="message-form">
    <input placeholder="message" id="message-input"/>
  <form>
  </div>

  <h3>Messages</h3>
  <ul id="messages-ul"></ul>
`;
//setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

const jwtToken = document.querySelector<HTMLInputElement>("#jwt-token")!;
const btnConnect = document.querySelector<HTMLButtonElement>("#btn-connect")!;

btnConnect.addEventListener("click", () => {
  if (jwtToken.value.trim().length <= 0) {
    return alert("Enter a valid JWT");
  }
  connectToServer(jwtToken.value);
});
