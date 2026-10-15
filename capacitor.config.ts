import type { CapacitorConfig } from "@capacitor/cli";

// Sky Bloxx Android wrapper.
// Android serves packaged game documents/media under this online origin via
// MainActivity's exact-path manifest. Accounts, scores and ads stay online.
const config: CapacitorConfig = {
  appId: "app.lovable.skyhighbloxx",
  appName: "Sky Bloxx",
  // CI replaces generated Android web assets with dist/client + CDN media.
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
