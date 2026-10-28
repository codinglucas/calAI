import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

export function TextField({ label, name, error, id = name, ...props }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        // text-base (16px) stops iOS Safari from zooming in on focus.
        className="border-border bg-card focus:border-accent focus:ring-accent/30 aria-invalid:border-danger h-12 rounded-xl border px-3 text-base outline-none focus:ring-2"
        {...props}
      />
      {error && (
        <p id={errorId} className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
