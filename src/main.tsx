import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("❌ Root element not found");
  document.body.innerHTML = '<h1 style="color: red; padding: 20px;">Root element not found!</h1>';
  throw new Error("Root element not found");
}

console.log("✅ Root element found, initializing React app...");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

console.log("✅ React app rendered successfully");

