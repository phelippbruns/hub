"use client";

import { useEffect } from "react";

/**
 * Registra o service worker da PWA. Só em produção: em desenvolvimento o SW
 * atrapalha o hot reload.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
