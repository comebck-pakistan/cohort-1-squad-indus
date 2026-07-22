import { createRoot } from "react-dom/client";
import App from "./App";
import { AppAuthProvider } from "./lib/app-auth";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AppAuthProvider>
    <App />
  </AppAuthProvider>,
);
