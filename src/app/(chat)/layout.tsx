import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Chat layout with server-side auth guard.
 * Per Section 7: session re-validated on the server,
 * not just in middleware.
 */
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
