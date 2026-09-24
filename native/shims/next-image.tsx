import type { ImgHTMLAttributes } from "react";

type NativeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
  unoptimized?: boolean;
};

export default function Image({ priority: _priority, unoptimized: _unoptimized, ...props }: NativeImageProps) {
  return <img {...props} />;
}
