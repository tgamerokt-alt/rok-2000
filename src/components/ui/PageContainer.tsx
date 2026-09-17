import { ReactNode } from "react";

export function PageContainer({
  children,
  maxWidth = "max-w-4xl",
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return <div className={`mx-auto w-full ${maxWidth} px-4 py-8 sm:px-6 lg:px-10`}>{children}</div>;
}
