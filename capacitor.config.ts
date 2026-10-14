import type { CapacitorConfig } from "@capacitor/cli";

// Sky Bloxx Android wrapper.
// The game is a live online app (cloud saves, coins, leaderboard), so the
// native shell loads the published app URL and requires internet.
const config: CapacitorConfig = {
  appId: "app.lovable.skyhighbloxx",
  appName: "Sky Bloxx",
  // Placeholder web assets — the real content comes from server.url below.
  webDir: "public",
  server: {
    url: "https://sky-high-bloxx.lovable.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
