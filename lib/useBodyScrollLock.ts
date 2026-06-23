import { useEffect } from "react";

/**
 * Locks background scroll while a modal is open.
 *
 * Plain `body { overflow: hidden }` is unreliable on mobile: iOS Safari ignores
 * it (the layout viewport keeps scrolling) and touch gestures chain to the
 * background once an inner scroll area hits its edge. Pinning the body with
 * `position: fixed` and restoring the scroll offset on unmount stops both.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.overflow = "hidden";
    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);
}
