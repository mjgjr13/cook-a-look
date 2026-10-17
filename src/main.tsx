import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
// Self-hosted fonts (no request to Google Fonts; faster and keeps visitor IPs private)
// Logo wordmark only
import "@fontsource/cormorant-garamond/600.css";
// Headings
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/spectral/500.css";
// Body and UI
import "@fontsource-variable/instrument-sans/wght.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
