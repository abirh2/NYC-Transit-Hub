import type { CapacitorConfig } from "@capacitor/cli";

const useRemoteServer = process.env.CAPACITOR_USE_REMOTE_SERVER === "true";
const configuredServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

function getRemoteServerConfig(): CapacitorConfig["server"] {
  if (!useRemoteServer) {
    return undefined;
  }

  const serverUrl = new URL(
    configuredServerUrl || "https://nyctransithub.vercel.app/",
  );

  if (!["http:", "https:"].includes(serverUrl.protocol)) {
    throw new Error(
      "CAPACITOR_SERVER_URL must use the http: or https: protocol.",
    );
  }

  if (serverUrl.username || serverUrl.password) {
    throw new Error("CAPACITOR_SERVER_URL must not contain credentials.");
  }

  return {
    url: serverUrl.toString(),
    cleartext: serverUrl.protocol === "http:",
  };
}

const config: CapacitorConfig = {
  appId: "com.abirhossain.nyctransithub",
  appName: "NYC Transit Hub",
  webDir: "capacitor-web",
  server: getRemoteServerConfig(),
};

export default config;
