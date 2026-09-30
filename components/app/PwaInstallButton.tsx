"use client";

import Image from "next/image";
import { isIosSafari, isStandaloneDisplayMode } from "@/lib/app/pwa";
import { useEffect, useState, useSyncExternalStore } from "react";

const PWA_ICON = "/images/pwa/icon-192.png";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallPlacement = "center" | "menu";

function useCompactHeader() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(max-width: 900px)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 900px)").matches,
    () => false,
  );
}

function PwaIosHint({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="pwa-ios-hint" role="dialog" aria-labelledby="pwa-ios-hint-title">
      <button className="pwa-ios-hint-close" type="button" aria-label="Close install instructions" onClick={onClose}>
        ×
      </button>
      <div className="pwa-ios-hint-brand">
        <Image alt="" className="pwa-ios-hint-logo" height={36} src={PWA_ICON} width={36} />
        <p className="pwa-ios-hint-title" id="pwa-ios-hint-title">Install StayLokal</p>
      </div>
      <p className="pwa-ios-hint-copy">
        Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> to install the app on your iPhone or iPad.
      </p>
    </div>
  );
}

export default function PwaInstallButton({ placement = "center" }: { placement?: PwaInstallPlacement }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const compactHeader = useCompactHeader();
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
      setIosHintOpen(false);
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

  if (!mounted || installed) return null;

  const showIosInstall = compactHeader && isIosSafari();
  if (!deferredPrompt && !showIosInstall) return null;
  if (placement === "center" && compactHeader) return null;
  if (placement === "menu" && !compactHeader) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function onInstallClick() {
    if (deferredPrompt) void handleInstall();
    else setIosHintOpen(true);
  }

  if (placement === "menu") {
    return (
      <>
        <button className="mobile-header-menu-install" type="button" onClick={onInstallClick}>
          Install app
        </button>
        <PwaIosHint open={iosHintOpen && !deferredPrompt} onClose={() => setIosHintOpen(false)} />
      </>
    );
  }

  return (
    <>
      <span className="pwa-install-shell">
        <button className="pwa-install-button" type="button" onClick={onInstallClick}>
          <span className="pwa-install-button-mark" aria-hidden="true">
            <Image alt="" height={22} src={PWA_ICON} width={22} />
          </span>
          <span className="pwa-install-button-label">Install app</span>
        </button>
      </span>
      <PwaIosHint open={iosHintOpen && !deferredPrompt} onClose={() => setIosHintOpen(false)} />
    </>
  );
}
