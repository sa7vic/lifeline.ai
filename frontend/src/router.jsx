import React from "react";
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";

import AuthGate from "./pages/AuthGate.jsx";
import EmergencyInput from "./pages/EmergencyInput.jsx";
import Questionnaire from "./pages/Questionnaire.jsx";
import Guidance from "./pages/Guidance.jsx";
import ResponderConsole from "./pages/ResponderConsole.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <AuthGate /> },
  {
    path: "/emergency",
    element: (
      <ProtectedRoute>
        <EmergencyInput />
      </ProtectedRoute>
    )
  },
  {
    path: "/responder",
    element: (
      <ProtectedRoute>
        <ResponderConsole />
      </ProtectedRoute>
    )
  },
  {
    path: "/questionnaire/:incidentId",
    element: (
      <ProtectedRoute>
        <Questionnaire />
      </ProtectedRoute>
    )
  },
  {
    path: "/guidance/:incidentId",
    element: (
      <ProtectedRoute>
        <Guidance />
      </ProtectedRoute>
    )
  }
]);