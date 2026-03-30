import { useEffect, useState } from "react";
import { subscribeToast } from "../utils/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((nextToast) => {
      setToasts((prev) => [...prev, nextToast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== nextToast.id));
      }, nextToast.duration);
    });
    return unsubscribe;
  }, []);

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
