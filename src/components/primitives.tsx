"use client";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./icons";

export function Button({
  variant = "primary",
  busy = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {children}
      {busy && <span className="busy-dot" aria-hidden="true" />}
    </button>
  );
}
export function Dialog({
  open,
  title,
  children,
  onClose,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={id}>{title}</h2>
        {dismissible && (
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" />
          </Button>
        )}
      </div>
      {children}
    </dialog>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <Icon name="sync" />
      <span>NenSync</span>
    </span>
  );
}
