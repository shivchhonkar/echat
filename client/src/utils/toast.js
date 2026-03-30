const listeners = new Set();

function emit(type, message, options = {}) {
  const toast = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message: String(message || ""),
    duration: Number(options.duration || 3200)
  };
  listeners.forEach((listener) => listener(toast));
}

export const toast = {
  success(message, options) {
    emit("success", message, options);
  },
  error(message, options) {
    emit("error", message, options);
  },
  info(message, options) {
    emit("info", message, options);
  }
};

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
