"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ODZRouteShield() {
  const pathname = usePathname();
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setActive(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 750);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;

      if (!link) return;
      if (link.target === "_blank") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;

      setActive(true);
      window.setTimeout(() => setActive(false), 1200);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <>
      <div className={`odz-route-shield ${active ? "is-active" : ""}`}>
        <div className="odz-route-shield-card">
          <div className="odz-route-shield-logo">ODZ.</div>
          <div className="odz-route-shield-line" />
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          background: #071018;
        }

        main {
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .odz-route-shield {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: grid;
          place-items: center;
          pointer-events: none;
          opacity: 0;
          background:
            radial-gradient(circle at 50% 20%, rgba(125, 211, 252, 0.08), transparent 34%),
            linear-gradient(135deg, rgba(7, 16, 24, 0.94), rgba(10, 14, 20, 0.92));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: opacity 180ms ease;
        }

        .odz-route-shield.is-active {
          opacity: 1;
        }

        .odz-route-shield-card {
          width: min(260px, 70vw);
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.045);
          padding: 1.25rem;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }

        .odz-route-shield-logo {
          text-align: center;
          font-size: 1.65rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.92);
        }

        .odz-route-shield-line {
          margin-top: 1rem;
          height: 0.3rem;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .odz-route-shield-line::after {
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(125, 211, 252, 0.25), rgba(255, 255, 255, 0.85), rgba(74, 222, 128, 0.35));
          content: "";
          animation: odz-route-shield-move 720ms ease-in-out infinite alternate;
        }

        @keyframes odz-route-shield-move {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(138%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .odz-route-shield,
          .odz-route-shield-line::after {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
