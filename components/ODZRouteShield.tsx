"use client";

import { useEffect, useState } from "react";

export default function ODZRouteShield() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const alreadyShown = window.sessionStorage.getItem("odz-initial-splash");

    if (alreadyShown) return;

    setActive(true);
    window.sessionStorage.setItem("odz-initial-splash", "true");

    const timer = window.setTimeout(() => {
      setActive(false);
    }, 850);

    return () => window.clearTimeout(timer);
  }, []);

  if (!active) return null;

  return (
    <>
      <div className="odz-initial-splash">
        <div className="odz-initial-splash-card">
          <div className="odz-initial-splash-logo">ODZ.</div>
          <div className="odz-initial-splash-line" />
        </div>
      </div>

      <style jsx global>{`
        .odz-initial-splash {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: grid;
          place-items: center;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 20%, rgba(125, 211, 252, 0.08), transparent 34%),
            linear-gradient(135deg, rgba(7, 16, 24, 0.96), rgba(10, 14, 20, 0.94));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .odz-initial-splash-card {
          width: min(260px, 70vw);
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.045);
          padding: 1.25rem;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }

        .odz-initial-splash-logo {
          text-align: center;
          font-size: 1.65rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.92);
        }

        .odz-initial-splash-line {
          margin-top: 1rem;
          height: 0.3rem;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .odz-initial-splash-line::after {
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            rgba(125, 211, 252, 0.25),
            rgba(255, 255, 255, 0.85),
            rgba(74, 222, 128, 0.35)
          );
          content: "";
          animation: odz-initial-splash-move 720ms ease-in-out infinite alternate;
        }

        @keyframes odz-initial-splash-move {
          from {
            transform: translateX(0%);
          }

          to {
            transform: translateX(138%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .odz-initial-splash-line::after {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}