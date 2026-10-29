"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type DialogTone = "default" | "danger" | "success";
type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};
type PromptOptions = ConfirmOptions & {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "url";
  validate?: (value: string) => string | undefined;
};
type DialogRequest =
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "prompt" } & PromptOptions);
type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function RiveraDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const resolver = useRef<((value: boolean | string | null) => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const open = useCallback(<T extends boolean | string | null>(next: DialogRequest) => {
    resolver.current?.(request?.kind === "confirm" ? false : null);
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setValue(next.kind === "prompt" ? next.defaultValue ?? "" : "");
    setError("");
    setRequest(next);
    return new Promise<T>((resolve) => {
      resolver.current = resolve as (value: boolean | string | null) => void;
    });
  }, [request?.kind]);

  const finish = useCallback((result: boolean | string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setRequest(null);
    setError("");
    window.setTimeout(() => opener.current?.focus(), 0);
  }, []);

  const api: DialogApi = {
    confirm: (options) => open<boolean>({ kind: "confirm", ...options }),
    prompt: (options) => open<string | null>({ kind: "prompt", ...options }),
  };

  useEffect(() => {
    if (!request) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      if (request.kind === "prompt") inputRef.current?.focus();
      else cancelRef.current?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(request.kind === "confirm" ? false : null);
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]',
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish, request]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!request) return;
    if (request.kind === "confirm") return finish(true);
    const clean = value.trim();
    const validation =
      request.required && !clean
        ? `${request.label} is required.`
        : request.minLength && clean.length < request.minLength
          ? `Enter at least ${request.minLength} characters.`
          : request.validate?.(clean);
    if (validation) {
      setError(validation);
      inputRef.current?.focus();
      return;
    }
    finish(clean);
  }

  const Icon = request?.tone === "danger" ? AlertTriangle : request?.tone === "success" ? CheckCircle2 : Info;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && (
        <div className="rivera-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget)
            finish(request.kind === "confirm" ? false : null);
        }}>
          <section
            ref={modalRef}
            className={`rivera-dialog rivera-dialog-${request.tone ?? "default"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          >
            <button
              className="rivera-dialog-close"
              type="button"
              aria-label="Close dialog"
              onClick={() => finish(request.kind === "confirm" ? false : null)}
            >
              <X aria-hidden="true" />
            </button>
            <div className="rivera-dialog-heading">
              <span className="rivera-dialog-icon"><Icon aria-hidden="true" /></span>
              <div>
                <p className="eyebrow">RIVERA</p>
                <h2 id={titleId}>{request.title}</h2>
              </div>
            </div>
            <p id={descriptionId} className="rivera-dialog-description">{request.description}</p>
            <form onSubmit={submit}>
              {request.kind === "prompt" && (
                <label className="rivera-dialog-field">
                  <span>{request.label}</span>
                  {request.multiline ? (
                    <textarea
                      ref={(node) => { inputRef.current = node; }}
                      rows={4}
                      value={value}
                      placeholder={request.placeholder}
                      maxLength={request.maxLength}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) => { setValue(event.target.value); if (error) setError(""); }}
                    />
                  ) : (
                    <input
                      ref={(node) => { inputRef.current = node; }}
                      value={value}
                      placeholder={request.placeholder}
                      maxLength={request.maxLength}
                      inputMode={request.inputMode}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) => { setValue(event.target.value); if (error) setError(""); }}
                    />
                  )}
                  <small className="rivera-dialog-field-meta">
                    {request.minLength ? `Minimum ${request.minLength} characters` : " "}
                    {request.maxLength ? <span>{value.length}/{request.maxLength}</span> : null}
                  </small>
                </label>
              )}
              {error && <p className="rivera-dialog-error" id={errorId} role="alert">{error}</p>}
              <div className="rivera-dialog-actions">
                <button
                  ref={cancelRef}
                  type="button"
                  className="button secondary"
                  onClick={() => finish(request.kind === "confirm" ? false : null)}
                >
                  {request.cancelLabel ?? "Cancel"}
                </button>
                <button type="submit" className={`button ${request.tone === "danger" ? "danger" : "primary"}`}>
                  {request.confirmLabel ?? (request.kind === "prompt" ? "Continue" : "Confirm")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useRiveraDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useRiveraDialog must be used inside RiveraDialogProvider");
  return value;
}
