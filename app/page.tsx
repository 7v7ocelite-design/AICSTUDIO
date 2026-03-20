"use client";

import { Dashboard } from "@/components/dashboard";

export default function HomePage() {
  return (
    <Dashboard
      accessToken="no-auth"
      onSignOut={async () => {
        window.location.reload();
      }}
    />
  );
}
