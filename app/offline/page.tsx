"use client";

import { useEffect } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { WifiOff, RefreshCw, Train } from "lucide-react";

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  // Auto-refresh when back online
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardBody className="text-center space-y-6 py-12">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Train className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-danger flex items-center justify-center">
                <WifiOff className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
            <p className="text-foreground/70">
              It looks like you&apos;ve lost your internet connection. 
              Some features may be unavailable until you&apos;re back online.
            </p>
          </div>

          {/* What works offline */}
          <div className="bg-content2 rounded-lg p-4 text-left">
            <p className="text-sm font-medium mb-2">While offline, you can still:</p>
            <ul className="text-sm text-foreground/70 space-y-1">
              <li>• View previously cached pages</li>
              <li>• Access saved station preferences</li>
              <li>• Browse static content</li>
            </ul>
          </div>

          {/* Retry button */}
          <Button
            color="primary"
            size="lg"
            startContent={<RefreshCw className="h-4 w-4" />}
            onPress={handleRefresh}
          >
            Try Again
          </Button>

          {/* Status indicator */}
          <p className="text-xs text-foreground/50">
            This page will automatically refresh when you&apos;re back online.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

