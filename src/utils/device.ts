export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || navigator.vendor || "";
  const uaMobile = /android|iphone|ipad|ipod|iemobile|opera mini|mobile/i.test(userAgent);
  const touchDevice = navigator.maxTouchPoints > 1 || window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 900px)").matches;

  return uaMobile || (touchDevice && smallViewport);
}

export function isDesktopDevice(): boolean {
  return !isMobileDevice();
}
