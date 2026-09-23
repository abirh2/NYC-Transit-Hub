/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from "serwist";
import {
  classifyTransitRequest,
  TRANSIT_RUNTIME_CACHE,
} from "@/lib/transit/cache-policy";

// This declares the value of `injectionPoint` to TypeScript.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        classifyTransitRequest(url.href) === "realtime",
      handler: new NetworkFirst({
        cacheName: "transit-realtime-v1",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: TRANSIT_RUNTIME_CACHE.realtime.maxAgeSeconds,
          }),
        ],
        networkTimeoutSeconds: 5,
      }),
    },
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        classifyTransitRequest(url.href) === "slow-changing",
      handler: new NetworkFirst({
        cacheName: "transit-slow-changing-v1",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds:
              TRANSIT_RUNTIME_CACHE["slow-changing"].maxAgeSeconds,
          }),
        ],
        networkTimeoutSeconds: 8,
      }),
    },
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        classifyTransitRequest(url.href) === "static",
      handler: new StaleWhileRevalidate({
        cacheName: "transit-static-v1",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: TRANSIT_RUNTIME_CACHE.static.maxAgeSeconds,
          }),
        ],
      }),
    },
    // Unknown API responses, mutations, and direct MTA requests are never
    // reused by the service worker. Route handlers own their server caching.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") || url.hostname.includes(".mta.info"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
