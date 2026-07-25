import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AccountsRoute } from "./app/routes/AccountsRoute";
import { GeneratorEvaluationRoute } from "./app/routes/GeneratorEvaluationRoute";
import { HelpCenterRoute } from "./app/routes/HelpCenterRoute";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <AccountsRoute /> },
      { path: "generator-evaluation", element: <GeneratorEvaluationRoute /> },
      { path: "help-center", element: <HelpCenterRoute /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
