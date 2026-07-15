import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initEngine } from "./engine/swiss";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";

// The WASM engine loads once, before React ever mounts — so computeChart can
// stay synchronous and no component needs a loading state. Until it resolves
// the page just shows whatever sits in #root in index.html. The second callback
// handles ONLY a failed load (network, blocked .wasm): without it the app would
// sit on the placeholder forever with the error buried in the console.
initEngine().then(
  () => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  (err) => {
    console.error("Swiss Ephemeris failed to load:", err);
    document.getElementById("root")!.innerHTML =
      '<p style="font-style: italic; text-align: center; margin-top: 40vh">' +
      "The ephemeris could not be loaded — check your connection and reload the page.</p>";
  },
);
