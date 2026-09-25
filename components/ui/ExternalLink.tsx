"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { openExternalUrl } from "@/lib/platform/external-links";
import { platformRuntime } from "@/lib/platform/runtime";

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function ExternalLink({ href, onClick, ...props }: ExternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !platformRuntime.isNative) return;
    event.preventDefault();
    void openExternalUrl(href);
  };

  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    />
  );
}
