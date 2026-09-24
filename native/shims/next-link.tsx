import type { AnchorHTMLAttributes, MouseEvent } from "react";

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
}

export default function Link({ href, replace = false, onClick, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey ||
      props.target === "_blank" || !href.startsWith("/")
    ) return;

    event.preventDefault();
    window.history[replace ? "replaceState" : "pushState"]({}, "", href);
    window.dispatchEvent(new Event("native:navigation"));
    if (props.target !== "_self") window.scrollTo({ top: 0 });
  };

  return <a {...props} href={href} onClick={handleClick} />;
}
