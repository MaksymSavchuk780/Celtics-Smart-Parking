import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { syncServerParking } from "./parking";
import "./index.css";

void syncServerParking();
window.setInterval(() => void syncServerParking(), 15000);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
