import Link from "next/link";
import { NotFoundTitle, NotFoundDescription, NotFoundGoHome } from "./NotFoundText";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      {/* ── Background Detail ───────────────────────────── */}
      <div className="absolute -right-32 -bottom-32 opacity-[0.03] pointer-events-none select-none text-text-primary">
        <svg
          width="600"
          height="600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 22h20L12 2z" />
          <path d="M12 22V2" />
        </svg>
      </div>

      <div className="animate-fade-in w-full max-w-md relative z-10 text-center">
        {/* ── 404 Content ──────────────────────────────── */}
        <div className="mb-8">
          <h1 className="font-display text-[64px] font-bold text-text-primary tracking-tight leading-none mb-4">
            404
          </h1>
          <h2 className="font-body text-xl font-medium text-text-primary mb-3">
            <NotFoundTitle />
          </h2>
          <p className="font-body text-[15px] text-text-secondary max-w-[280px] mx-auto leading-relaxed">
            <NotFoundDescription />
          </p>
        </div>

        {/* ── Action Button ──────────────────────────────── */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="btn-primary inline-flex items-center justify-center px-6"
          >
            <NotFoundGoHome />
          </Link>
        </div>
      </div>
    </div>
  );
}
