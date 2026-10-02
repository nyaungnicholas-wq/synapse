import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "md" | "lg";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  const base = "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClass = size === "lg" ? "min-h-14 px-7 text-lg" : "min-h-12 px-5 text-base";
  const variantClass = {
    primary: "bg-clay text-white hover:bg-clay-hover",
    secondary: "border-2 border-ink bg-surface text-ink hover:bg-sand",
    quiet: "text-ink-soft underline-offset-4 hover:underline hover:text-ink",
    danger: "bg-danger text-white hover:opacity-90",
  }[variant];
  return cx(base, sizeClass, variantClass, extra);
}

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ className, as = "div", ...props }: ComponentProps<"div"> & { as?: "div" | "section" | "article" | "li" }) {
  const Tag = as as "div"; // same props for every allowed tag
  return <Tag className={cx("rounded-card border border-line bg-surface p-6 shadow-card sm:p-8", className)} {...props} />;
}

export type Tone = "neutral" | "clay" | "sage" | "honey" | "plum";

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const toneClass = {
    neutral: "bg-sand text-ink-soft",
    clay: "bg-clay-soft text-clay-hover",
    sage: "bg-sage-soft text-sage-deep",
    honey: "bg-honey-soft text-honey-ink",
    plum: "bg-plum-soft text-plum",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", toneClass, className)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div>
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-clay">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl text-ink">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-lg text-ink-soft">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}

function getFieldIds(name: string, id?: string) {
  const baseId = id ?? `field-${name}`;
  return { id: baseId, hintId: `${baseId}-hint`, errorId: `${baseId}-error` };
}

function getAriaDescribedBy(hintId?: string, errorId?: string) {
  const ids = [hintId, errorId].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function renderLabel(label: string, htmlFor: string) {
  return <label htmlFor={htmlFor} className="block text-base font-semibold text-ink">{label}</label>;
}

function renderHint(hint?: string, hintId?: string) {
  return hint ? <p id={hintId} className="text-ink-muted">{hint}</p> : null;
}

function renderError(error?: string | string[], errorId?: string) {
  const message = Array.isArray(error) ? error[0] : error;
  return message ? <p id={errorId} role="alert" className="text-danger font-semibold">{message}</p> : null;
}

function getControlClassName(error?: string | string[], extra?: string) {
  const base = "block w-full min-h-12 rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-focus";
  const errorClass = error ? "border-danger" : "";
  return cx(base, errorClass, extra);
}

export function TextField({ label, name, hint, error, id, className, ...props }: ComponentProps<"input"> & { label: string; name: string; hint?: string; error?: string | string[] }) {
  const { id: fieldId, hintId, errorId } = getFieldIds(name, id);
  const describedBy = getAriaDescribedBy(hint ? hintId : undefined, error ? errorId : undefined);
  return (
    <div className={cx("space-y-2", className)}>
      {renderLabel(label, fieldId)}
      <input id={fieldId} name={name} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={getControlClassName(error)} {...props} />
      {renderHint(hint, hintId)}
      {renderError(error, errorId)}
    </div>
  );
}

export function TextArea({ label, name, hint, error, id, className, rows = 5, ...props }: ComponentProps<"textarea"> & { label: string; name: string; hint?: string; error?: string | string[] }) {
  const { id: fieldId, hintId, errorId } = getFieldIds(name, id);
  const describedBy = getAriaDescribedBy(hint ? hintId : undefined, error ? errorId : undefined);
  return (
    <div className={cx("space-y-2", className)}>
      {renderLabel(label, fieldId)}
      <textarea id={fieldId} name={name} rows={rows} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={getControlClassName(error)} {...props} />
      {renderHint(hint, hintId)}
      {renderError(error, errorId)}
    </div>
  );
}

export function SelectField({ label, name, hint, error, id, options, className, ...props }: ComponentProps<"select"> & { label: string; name: string; hint?: string; error?: string | string[]; options: { value: string; label: string }[] }) {
  const { id: fieldId, hintId, errorId } = getFieldIds(name, id);
  const describedBy = getAriaDescribedBy(hint ? hintId : undefined, error ? errorId : undefined);
  return (
    <div className={cx("space-y-2", className)}>
      {renderLabel(label, fieldId)}
      <select id={fieldId} name={name} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={getControlClassName(error)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {renderHint(hint, hintId)}
      {renderError(error, errorId)}
    </div>
  );
}

export function ChoiceCard({ type, name, value, label, description, defaultChecked, required }: { type: "radio" | "checkbox"; name: string; value: string; label: string; description?: string; defaultChecked?: boolean; required?: boolean }) {
  return (
    <label className="flex items-start gap-4 rounded-control border-2 border-line-strong bg-surface p-4 cursor-pointer hover:border-ink has-[:checked]:border-clay has-[:checked]:bg-clay-soft">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} required={required} className="size-6 accent-clay shrink-0 mt-0.5" />
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="block text-ink-soft text-base">{description}</span>}
      </span>
    </label>
  );
}

export function Fieldset({ legend, hint, error, children, className }: { legend: string; hint?: string; error?: string | string[]; children: ReactNode; className?: string }) {
  const base = `fieldset-${legend.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const errorId = `${base}-error`;
  const hintId = `${base}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className={cx("space-y-3", className)} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="text-lg font-semibold text-ink mb-1">{legend}</legend>
      {hint && <p id={hintId} className="text-ink-muted">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {error && <p id={errorId} role="alert" className="text-danger font-semibold">{Array.isArray(error) ? error[0] : error}</p>}
    </fieldset>
  );
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "error"; title?: string; children: ReactNode; className?: string }) {
  const toneClass = {
    info: "border-focus bg-surface",
    success: "border-sage bg-sage-soft",
    error: "border-danger bg-danger-soft",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-control border-l-4 p-4", toneClass, className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

/** `body` is accepted as an alias for children. */
export function EmptyState({ icon, title, children, body, action }: { icon?: ReactNode; title: string; children?: ReactNode; body?: ReactNode; action?: ReactNode }) {
  children ??= body;
  return (
    <div className="rounded-card border-2 border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="size-14 rounded-full bg-sand grid place-items-center text-clay mx-auto mb-4" aria-hidden="true">{icon}</div>}
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {children && <div className="mt-2 max-w-md mx-auto text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-card bg-sand p-5">
      <dt className="text-base font-semibold text-ink-soft">{label}</dt>
      <dd className="font-display text-4xl text-ink">{value}</dd>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bgIndex = sum % 4;
  const bgClass = ["bg-clay-soft text-clay-hover", "bg-sage-soft text-sage-deep", "bg-honey-soft text-honey-ink", "bg-plum-soft text-plum"][bgIndex];
  const sizeClass = { sm: "size-9 text-sm", md: "size-12 text-lg", lg: "size-16 text-2xl" }[size];
  return <span aria-hidden="true" className={cx("font-display font-semibold grid place-items-center rounded-full shrink-0", bgClass, sizeClass, className)}>{initials.toUpperCase()}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-control bg-sand", className)} />;
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <h2 id={id} className="font-display text-2xl text-ink">{children}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
/** Filter pill (theme / category chooser). Active pills are solid ink so the choice is obvious. */
export function pillClass(active: boolean): string {
  return cx(
    "inline-flex min-h-12 items-center rounded-full border-2 px-4 font-semibold transition-colors",
    active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink",
  );
}
