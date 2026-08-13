// Entry point — mounts <App /> to #root.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { warmUpBackend } from "./services/apiClient.js";
import "./styles/globals.css";

// The backend sleeps after ~15 minutes idle on Render's free tier and takes up
// to a minute to boot. Start that now, so it happens while the page loads and
// the user reads it, rather than after they submit a form.
warmUpBackend();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
