import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-800",
  secondary:
    "border border-zinc-200 bg-white text-irroba-ink hover:border-brand-200 hover:bg-brand-50/50",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-irroba-ink",
  danger:
    "bg-brand-800 text-white hover:bg-brand-900",
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-heading font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
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
