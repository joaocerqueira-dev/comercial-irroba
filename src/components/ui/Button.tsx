import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-500",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-[32px] px-2.5 py-1.5 text-xs",
  md: "min-h-[44px] px-4 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
});

/** Botão só com ícone: exige aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { "aria-label": string }>(
  function IconButton({ className = "", ...rest }, ref) {
    return <Button ref={ref} variant="ghost" size="sm" className={`!px-2 ${className}`} title={rest["aria-label"]} {...rest} />;
  }
);
