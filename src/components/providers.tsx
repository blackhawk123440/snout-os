"use client";

import { SessionProvider } from "next-auth/react";
import { CommandProvider } from './CommandProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CommandProvider>
        {children}
      </CommandProvider>
    </SessionProvider>
  );
}

