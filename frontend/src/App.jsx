import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import LocationTracker from "./components/common/LocationTracker.jsx";
import NotificationCenter from "./components/common/NotificationCenter.jsx";
import LanguageSwitcher from "./components/common/LanguageSwitcher.jsx";

export default function App() {
  return (
    <>
      <LanguageSwitcher />
      <LocationTracker />
      <NotificationCenter />
      <RouterProvider router={router} />
    </>
  );
}