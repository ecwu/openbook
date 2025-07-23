"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";
import type * as React from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
} & Omit<NextThemesProviderProps, "children">;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
