import { lazy, Suspense, type ComponentType } from "react";

interface DynamicOptions {
  loading?: ComponentType;
  ssr?: boolean;
}

export default function dynamic<Props extends object>(
  loader: () => Promise<{ default: ComponentType<Props> }>,
  options: DynamicOptions = {},
): ComponentType<Props> {
  const LazyComponent = lazy(loader);
  const Loading = options.loading;

  return function DynamicComponent(props: Props) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
