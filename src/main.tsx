import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Provider } from "react-redux";
import { persistor, store } from "./state.ts";
import { PersistGate } from "redux-persist/integration/react";

if (localStorage.getItem("state-version") !== "1") {
  localStorage.removeItem("persist:root");
  localStorage.removeItem("persist:generatedImages");
  localStorage.setItem("state-version", "1");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
