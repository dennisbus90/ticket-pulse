import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.scss";
import App from "./App";
import { initSDK } from "./sdk";

console.log("Initializing Azure DevOps Extension SDK...");
const root = document.getElementById("root");
if (root) root.textContent = "Booting...";
const boot = import.meta.env.DEV ? Promise.resolve() : initSDK();

boot
  .then(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((err) => {
    const root = document.getElementById("root");
    if (root) {
      root.style.padding = "16px";
      root.style.color = "red";
      root.textContent = `SDK init failed: ${err?.message || err}`;
    }
    console.error("SDK init failed:", err);
  });
