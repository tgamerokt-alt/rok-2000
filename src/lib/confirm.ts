import Swal from "sweetalert2";

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel: string;
}

/** Themed SweetAlert2 confirmation — used before any destructive/irreversible action. */
export async function confirmAction({ title, text, confirmLabel, cancelLabel }: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    reverseButtons: true,
    background: "#0f172a",
    color: "#e2e8f0",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#334155",
  });
  return result.isConfirmed;
}

/** Themed SweetAlert2 toast for a completed action's result (e.g. a file
 * upload) — success auto-dismisses, errors wait for the user to close them. */
export async function notifyResult({ success, message }: { success: boolean; message: string }) {
  await Swal.fire({
    icon: success ? "success" : "error",
    text: message,
    background: "#0f172a",
    color: "#e2e8f0",
    confirmButtonColor: success ? "#f59e0b" : "#dc2626",
    timer: success ? 1800 : undefined,
    showConfirmButton: !success,
  });
}
