"use client";

import { useLocalStorageMigration } from "@/hooks/useLocalStorageMigration";

export default function MigrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useLocalStorageMigration();
  return <>{children}</>;
}
