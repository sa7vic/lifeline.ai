import React from "react";

export default function EmergencyCallButton() {
  return (
    <a
      className="w-full inline-flex justify-center px-3 py-3 rounded bg-red-600 hover:bg-red-500 font-semibold"
      href="tel:112"
    >
      Call Emergency (112)
    </a>
  );
}