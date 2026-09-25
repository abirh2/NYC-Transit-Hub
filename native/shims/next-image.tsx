import type { ImgHTMLAttributes } from "react";

/* eslint-disable @next/next/no-img-element */

type NativeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
  unoptimized?: boolean;
};

export default function Image(props: NativeImageProps) {
  const { priority, unoptimized, alt = "", ...imageProps } = props;
  void priority;
  void unoptimized;

  return <img {...imageProps} alt={alt} />;
}
