import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Chat layout with server-side auth guard.
 * Per Section 7: session re-validated on the server,
 * not just in middleware.
 */

// F2: private conversations must never be indexed, even if an
// auth redirect ever fails open.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
