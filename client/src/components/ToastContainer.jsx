import { useEffect, useMemo, useState } from "react";
import { subscribeToast } from "../utils/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const isEmbedMode = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "1",
    []
  );

  useEffect(() => {
    const unsubscribe = subscribeToast((nextToast) => {
      setToasts((prev) => [...prev, nextToast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== nextToast.id));
      }, nextToast.duration);
    });
    return unsubscribe;
  }, []);

  if (isEmbedMode) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => (
        <div key={item.id} className={`toast-item ${item.type}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
