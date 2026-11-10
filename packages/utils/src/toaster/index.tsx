import toast from "react-hot-toast";



export function ErrorToaster (e: any) {
  console.log("Error", e);
  // an app-level handler already showed its own UI for this error (e.g. the subscription upgrade dialog)
  if (e?.uiHandled) return;
  const data = e?.response?.data;
  toast.error(data?.message || data?.error || e?.message || "خطای نامشخص")
}

export function SuccessToaster (e: any) {
  console.log("Success", e);
  const data = e?.response?.data;
  toast.success(data?.message || data?.error || e?.message || "انجام شد")
}
