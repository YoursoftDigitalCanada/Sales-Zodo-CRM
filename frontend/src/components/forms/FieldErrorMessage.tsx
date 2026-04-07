import * as React from "react";
import { X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type FieldErrorMessageProps = React.HTMLAttributes<HTMLDivElement> & {
  message?: React.ReactNode;
  onDismiss?: () => void;
};

const FieldErrorMessage = React.forwardRef<HTMLDivElement, FieldErrorMessageProps>(
  ({ className, message, onDismiss, ...props }, ref) => {
    if (!message) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "mt-1.5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-700",
          className,
        )}
        {...props}
      >
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1 leading-5">{message}</div>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="shrink-0 rounded-sm p-0.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  },
);

FieldErrorMessage.displayName = "FieldErrorMessage";

export default FieldErrorMessage;
