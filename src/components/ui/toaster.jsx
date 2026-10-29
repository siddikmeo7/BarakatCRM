import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

// Одно уведомление: само скрывается через несколько секунд
// и закрывается по нажатию на крестик.
function ToastItem({ id, title, description, action, duration = 4000, onDismiss, ...props }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => dismissRef.current(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration]);

  return (
    <Toast {...props}>
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      {action}
      <ToastClose onClick={() => onDismiss(id)} className="opacity-100" />
    </Toast>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts
        .filter((t) => t.open !== false)
        .map(({ id, title, description, action, onOpenChange, open, ...props }) => (
          <ToastItem
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            onDismiss={dismiss}
            {...props}
          />
        ))}
      <ToastViewport />
    </ToastProvider>
  );
}