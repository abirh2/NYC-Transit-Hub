import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/app/globals.css";
import { NativeApp } from "./NativeApp";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Native application root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <NativeApp />
  </StrictMode>,
);
