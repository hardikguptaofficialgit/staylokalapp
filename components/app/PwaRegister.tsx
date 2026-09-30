"use client";

import { PWA_SW_URL } from "@/lib/app/pwa";
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register(PWA_SW_URL, { scope: "/" }).catch((error) => {
        console.warn("StayLokal service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
