"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthRedirectHandler() {
  const router = useRouter();
  useEffect(() => {
    // Redirect user to homepage or dashboard after email confirmation
    router.replace("/");
  }, []);
  return <div>Redirecting...</div>;
}
