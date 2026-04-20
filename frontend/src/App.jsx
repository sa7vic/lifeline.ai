import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import LocationTracker from "./components/common/LocationTracker.jsx";
import NotificationCenter from "./components/common/NotificationCenter.jsx";

export default function App() {
  return (
    <>
      <LocationTracker />
      <NotificationCenter />
      <RouterProvider router={router} />
    </>
  );
}