import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL?.trim() || "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "com.corderocoffee.app",
  appName: "Cordero Coffee",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: true
  },
  ios: {
    contentInset: "automatic"
  }
};

export default config;
