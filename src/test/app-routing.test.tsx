import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches routes for /virtual-trading and /platform", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const vtMatches = router.matchRoutes("/virtual-trading");
    const platformMatches = router.matchRoutes("/platform");

    expect(vtMatches.at(-1)?.routeId).toBe("/_site/virtual-trading");
    expect(platformMatches.at(-1)?.routeId).toBe("/_site/platform");
  });

  it("matches routes for /admin/tickets and /contact", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const adminTicketMatches = router.matchRoutes("/admin/tickets");
    const contactMatches = router.matchRoutes("/contact");

    expect(adminTicketMatches.at(-1)?.routeId).toBe("/admin/tickets");
    expect(contactMatches.at(-1)?.routeId).toBe("/_site/contact");
  });
});
