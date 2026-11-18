import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/virtual-trading" });
  },
});
