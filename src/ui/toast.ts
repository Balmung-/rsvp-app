// Tiny global toast bus. Call toast("message", "success") from anywhere
// in client code; <Toaster /> in the admin layout listens on window.
export type ToastKind = "info" | "success" | "error";

export interface ToastDetail {
  text: string;
  kind: ToastKind;
}

export function toast(text: string, kind: ToastKind = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("app:toast", { detail: { text, kind } }));
}
