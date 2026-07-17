import { useEffect } from "react";
import type { ReactNode } from "react";

/** The overlay window every dialog lives in: dimmed backdrop, parchment card,
 * double gold border like the sidebar's. Esc and a backdrop click close it —
 * clicks inside the card don't (the stopPropagation), so selecting text in a
 * dialog never slams the window shut. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86svh] w-[min(880px,92vw)] overflow-y-auto border-[3px] border-double border-gold bg-parchment-50 px-7 py-6 shadow-xl"
      >
        <div className="flex items-baseline justify-between mb-4">
          <div className="font-fell text-[24px]">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-bronze hover:text-rust bg-transparent border-0 cursor-pointer text-[15px] px-1"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
