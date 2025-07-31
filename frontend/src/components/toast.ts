export default function showToast({
  message,
  type,
  parent,
}: {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  parent?: HTMLElement | null;
}) {
  type = type || "info";
  const div = document.createElement("div");
  div.innerHTML = `
        <div class="toast toast-center z-10">
          <div class="alert shadow ${type === "success" && "alert-success"} ${type === "error" && "alert-error"} ${type === "warning" && "alert-warning"} ${type === "info" && "alert-info"}">
            <span>${message}</span>
          </div>
        </div>`;
  if (parent) {
    parent.appendChild(div);
  } else {
    document.body.appendChild(div);
  }
  setTimeout(() => {
    div.remove();
  }, 3000);
}
