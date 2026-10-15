import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // The build's page renderer always asks for "/privacy/" and is not allowed to
    // follow redirects; with the default "never" the router bounces that request
    // back to "/privacy", so only the home screen ever gets rendered. "always"
    // makes the slashed form canonical and every page render.
    trailingSlash: "always",
  });

  return router;
};
