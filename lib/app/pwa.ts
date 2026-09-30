export const PWA_SW_URL = "/sw.js";

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone === true;
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/i.test(ua);
  const isChromeIos = /CriOS/i.test(ua);
  const isFirefoxIos = /FxiOS/i.test(ua);
  return isIos && isWebkit && !isChromeIos && !isFirefoxIos;
}
