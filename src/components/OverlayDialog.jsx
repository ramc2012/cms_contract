import React, { useEffect, useRef } from "react";

/**
 * Reusable overlay dialog (modal) component.
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - wide: boolean (optional, wider dialog for large forms)
 *  - children: JSX
 */
export default function OverlayDialog({ open, onClose, title, wide, children }) {
    const dialogRef = useRef(null);

    /* Close on Escape */
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    /* Lock body scroll while open */
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    /* Focus trap — focus dialog on open */
    useEffect(() => {
        if (open && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={`overlay-dialog ${wide ? "overlay-dialog--wide" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="overlay-dialog-header">
                    <h3 className="overlay-dialog-title">{title}</h3>
                    <button
                        type="button"
                        className="overlay-dialog-close"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>
                <div className="overlay-dialog-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
