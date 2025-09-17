// app/providers.tsx
"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

/**
 * 統一放所有只在 client 端需要的 Provider／效果。
 * - 不改動你的 UI 結構，只是把 children 包起來
 * - 可安全加入更多 Provider（如 React Query、Zustand persist 等）
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
