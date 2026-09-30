"use client";

import Image from "next/image";
import { isStandaloneDisplayMode } from "@/lib/app/pwa";
import { useEffect, useState, useSyncExternalStore } from "react";

const PWA_ICON = "/images/pwa/icon-192.png";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const installed = useSyncExternalStore(
    () => () => undefined,
    () => isStandaloneDisplayMode(),
    () => false,
  );

  useEffect(() => {
    const onInstalled = () => {
      setDeferredPrompt(null);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (!mounted || installed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <span className="pwa-install-shell">
      <button
        className="pwa-install-button"
        type="button"
        onClick={() => void handleInstall()}
      >
        <span className="pwa-install-button-mark" aria-hidden="true">
          <Image alt="" height={22} src={PWA_ICON} width={22} />
        </span>
        <span className="pwa-install-button-label">Install app</span>
      </button>
    </span>
  );
}
