import React from "react";
import ReactDOM from "react-dom";
import * as fcl from "@onflow/fcl";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "dotenv/config";
console.log(process.env)

fcl
  .config()
  .put("accessNode.api", "https://flow-access-mainnet.portto.io")
  .put("challenge.handshake", "https://flow-wallet.blocto.app/authn")
  .put("challenge.scope", "email");

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);
