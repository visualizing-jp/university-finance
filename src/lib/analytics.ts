declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = "G-1945XFLY45";

/** replaceState 後のパスを page_view する。ルートから比較URLへ置き換えたあとも拾う。 */
export function trackPage(): void {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    send_to: GA_ID,
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}
