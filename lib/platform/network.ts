import { Network } from "@capacitor/network";
import type { ConnectionStatus, NetworkPlugin } from "@capacitor/network";
import type { PluginListenerHandle } from "@capacitor/core";

import { platformRuntime } from "./runtime";

export interface NetworkAdapter {
  getStatus: () => Promise<ConnectionStatus>;
  subscribe: (listener: (status: ConnectionStatus) => void) => () => void;
}

const serverNetworkTarget = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
} as unknown as Window;

export function createWebNetworkAdapter(
  browserNavigator: Pick<Navigator, "onLine"> = typeof navigator === "undefined"
    ? { onLine: true }
    : navigator,
  browserWindow: Window = typeof window === "undefined" ? serverNetworkTarget : window,
): NetworkAdapter {
  return {
    async getStatus() {
      return {
        connected: browserNavigator.onLine,
        connectionType: browserNavigator.onLine ? "unknown" : "none",
      };
    },
    subscribe(listener) {
      const online = () => listener({ connected: true, connectionType: "unknown" });
      const offline = () => listener({ connected: false, connectionType: "none" });
      browserWindow.addEventListener("online", online);
      browserWindow.addEventListener("offline", offline);
      return () => {
        browserWindow.removeEventListener("online", online);
        browserWindow.removeEventListener("offline", offline);
      };
    },
  };
}

type NativeNetwork = Pick<NetworkPlugin, "getStatus" | "addListener">;

export function createNativeNetworkAdapter(plugin: NativeNetwork = Network): NetworkAdapter {
  return {
    getStatus: () => plugin.getStatus(),
    subscribe(listener) {
      let handle: PluginListenerHandle | undefined;
      let disposed = false;
      void plugin.addListener("networkStatusChange", listener)
        .then((nextHandle) => {
          if (disposed) void nextHandle.remove();
          else handle = nextHandle;
        })
        .catch(() => undefined);
      return () => {
        disposed = true;
        void handle?.remove();
      };
    },
  };
}

export class NetworkService {
  private status: ConnectionStatus = { connected: true, connectionType: "unknown" };
  private readonly listeners = new Set<() => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly adapter: NetworkAdapter,
    private readonly fallback: NetworkAdapter,
  ) {}

  getSnapshot = () => this.status;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.unsubscribe) {
      this.unsubscribe = this.adapter.subscribe((status) => this.update(status));
      void this.adapter.getStatus().then((status) => this.update(status)).catch(async () => {
        this.update(await this.fallback.getStatus());
      });
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribe?.();
        this.unsubscribe = null;
      }
    };
  };

  private update(status: ConnectionStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
}

let sharedNetworkService: NetworkService | null = null;

export function getNetworkService(): NetworkService {
  if (!sharedNetworkService) {
    const webNetwork = createWebNetworkAdapter();
    sharedNetworkService = new NetworkService(
      platformRuntime.isNative ? createNativeNetworkAdapter() : webNetwork,
      webNetwork,
    );
  }
  return sharedNetworkService;
}
