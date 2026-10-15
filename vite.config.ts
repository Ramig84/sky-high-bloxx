// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Android packages these public documents and the client bundle; online
    // server functions remain on the published same-origin service.
    // maxRedirects: the server normalises "/privacy/" to "/privacy", and the build
    // wrapper defaults to following zero redirects, which silently skips every page
    // except the home screen. Five hops lets all four documents prerender.
    pages: ["/", "/privacy", "/terms", "/delete-account"].map(path => ({ path, prerender: { enabled: true, maxRedirects: 5 } })),
    prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false, failOnError: true },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
