"use client";
import ActionIcon from "./ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";

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
      className={`${addButtonClass} ${className}`}
      {...props}
    >
      <ActionIcon name="add" />

      {children}
    </button>
  );
}
