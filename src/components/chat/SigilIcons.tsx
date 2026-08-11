"use client";

import { GATEWAYS, GatewayId } from "@/lib/ai-providers/registry";

/**
 * GatewaySigil is a generic component that reads raw SVG markup
 * from the GATEWAYS registry.
 */

export interface SigilProps {
  gateway: GatewayId;
  className?: string;
  size?: number;
}

export function GatewaySigil({ gateway, className = "", size = 24 }: SigilProps) {
  const config = GATEWAYS[gateway];
  
  if (!config || !config.sigil) {
    return null; // Fallback if no sigil is defined
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap={config.sigil.strokeLinecap || "square"}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: config.sigil.svgInnerHtml }}
    />
  );
}
