import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app.tsx";
import AppContext from "./components/AppContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContext>
      <App />
    </AppContext>
  </StrictMode>,
);
