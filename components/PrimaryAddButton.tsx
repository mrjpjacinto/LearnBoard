"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type PrimaryAddButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  };

export default function PrimaryAddButton({
  children,
  className = "",
  type = "button",
  ...props
}: PrimaryAddButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>

      {children}
    </button>
  );
}