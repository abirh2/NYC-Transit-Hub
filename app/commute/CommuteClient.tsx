"use client";

/**
 * CommuteClient Component
 * 
 * Main client component for the commute page.
 * Shows multiple commutes with tabs and settings management.
 */

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardBody, 
  Tabs, 
  Tab, 
  Chip, 
  Button, 
  Spinner,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { 
  Clock, 
  Settings, 
  Navigation, 
  LogIn, 
  Plus, 
  Trash2, 
  Edit,
  MoreVertical,
  Star,
} from "lucide-react";
import { CommuteSetup, CommuteSummary, type CommuteData } from "@/components/commute";
import { useAuth } from "@/components/auth";
import { AuthModal } from "@/components/auth";

type ViewMode = "view" | "edit" | "add";

export function CommuteClient() {
  const { user, isLoading: authLoading } = useAuth();
  const [commutes, setCommutes] = useState<CommuteData[]>([]);
  const [selectedCommuteId, setSelectedCommuteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("view");
  const [editingCommute, setEditingCommute] = useState<CommuteData | null>(null);
  const [isLoadingCommutes, setIsLoadingCommutes] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch commutes
  const fetchCommutes = useCallback(async () => {
    if (!user) {
      setIsLoadingCommutes(false);
      setCommutes([]);
      return;
    }

    setIsLoadingCommutes(true);
    try {
      const response = await fetch("/api/commute/settings");
      const data = await response.json();

      if (data.success && data.data.commutes) {
        setCommutes(data.data.commutes);
        
        // Select default or first commute
        if (data.data.commutes.length > 0) {
          const defaultCommute = data.data.commutes.find((c: CommuteData) => c.isDefault);
          setSelectedCommuteId(defaultCommute?.id || data.data.commutes[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch commutes:", error);
    } finally {
      setIsLoadingCommutes(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchCommutes();
    }
  }, [authLoading, fetchCommutes]);

  const handleCommuteSaved = (commute: CommuteData) => {
    fetchCommutes();
    setViewMode("view");
    setEditingCommute(null);
    if (commute.id) {
      setSelectedCommuteId(commute.id);
    }
  };

  const handleEditCommute = (commute: CommuteData) => {
    setEditingCommute(commute);
    setViewMode("edit");
  };

  const handleDeleteCommute = async (commuteId: string) => {
    try {
      const response = await fetch(`/api/commute/settings?id=${commuteId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchCommutes();
        if (selectedCommuteId === commuteId) {
          setSelectedCommuteId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete commute:", error);
    }
  };

  const handleAddNewCommute = () => {
    setEditingCommute(null);
    setViewMode("add");
  };

  const selectedCommute = commutes.find(c => c.id === selectedCommuteId);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Clock className="h-7 w-7 text-success" />
              Commute Assistant
            </h1>
            <p className="mt-1 text-foreground/70">
              Get personalized departure suggestions for your daily commutes
            </p>
          </div>
        </div>

        {/* Sign In Prompt */}
        <Card>
          <CardBody className="py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-foreground/60 max-w-md mx-auto mb-6">
              Sign in to save your commute routes and get personalized 
              departure time recommendations based on real-time transit data.
            </p>
            <Button
              color="primary"
              size="lg"
              onPress={() => setShowAuthModal(true)}
              startContent={<LogIn className="h-5 w-5" />}
            >
              Sign In to Get Started
            </Button>
          </CardBody>
        </Card>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // Loading commutes state
  if (isLoadingCommutes) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Clock className="h-7 w-7 text-success" />
            Commute Assistant
          </h1>
          <p className="mt-1 text-foreground/70">
            Get personalized departure suggestions for your daily commutes
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // No commutes - show setup
  if (commutes.length === 0 && viewMode === "view") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Clock className="h-7 w-7 text-success" />
            Commute Assistant
          </h1>
          <p className="mt-1 text-foreground/70">
            Get personalized departure suggestions for your daily commutes
          </p>
        </div>

        <Card>
          <CardBody className="py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
              <Navigation className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Set Up Your Commutes</h2>
            <p className="text-foreground/60 max-w-md mx-auto mb-6">
              Add your regular commute routes (home → work, work → home) to get 
              personalized departure suggestions.
            </p>
            <Button
              color="primary"
              size="lg"
              onPress={handleAddNewCommute}
              startContent={<Plus className="h-5 w-5" />}
            >
              Add Your First Commute
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Add/Edit mode
  if (viewMode === "add" || viewMode === "edit") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Clock className="h-7 w-7 text-success" />
            Commute Assistant
          </h1>
          <p className="mt-1 text-foreground/70">
            {viewMode === "add" ? "Add a new commute route" : "Edit your commute"}
          </p>
        </div>

        <CommuteSetup
          initialData={editingCommute || undefined}
          onSave={handleCommuteSaved}
          onCancel={() => {
            setViewMode("view");
            setEditingCommute(null);
          }}
          isNew={viewMode === "add"}
        />
      </div>
    );
  }

  // Main view with commutes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Clock className="h-7 w-7 text-success" />
            Commute Assistant
          </h1>
          <p className="mt-1 text-foreground/70">
            Get personalized departure suggestions for your daily commutes
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          size="sm"
          onPress={handleAddNewCommute}
          startContent={<Plus className="h-4 w-4" />}
        >
          Add Commute
        </Button>
      </div>

      {/* Commute Tabs */}
      {commutes.length > 1 && (
        <Tabs
          aria-label="Commute selector"
          selectedKey={selectedCommuteId || undefined}
          onSelectionChange={(key) => setSelectedCommuteId(key as string)}
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-4 flex-wrap",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-10",
          }}
        >
          {commutes.map((commute) => (
            <Tab
              key={commute.id}
              title={
                <div className="flex items-center gap-2">
                  {commute.isDefault && <Star className="h-3 w-3 text-warning fill-warning" />}
                  <span>{commute.label}</span>
                </div>
              }
            />
          ))}
        </Tabs>
      )}

      {/* Selected Commute Summary */}
      {selectedCommute && (
        <div className="space-y-4">
          {/* Commute Header with Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedCommute.label}</h2>
              {selectedCommute.isDefault && (
                <Chip size="sm" color="warning" variant="flat">
                  Default
                </Chip>
              )}
            </div>
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Commute actions">
                <DropdownItem
                  key="edit"
                  startContent={<Edit className="h-4 w-4" />}
                  onPress={() => handleEditCommute(selectedCommute)}
                >
                  Edit Commute
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="h-4 w-4" />}
                  onPress={() => selectedCommute.id && handleDeleteCommute(selectedCommute.id)}
                >
                  Delete Commute
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          {/* Commute Summary */}
          <CommuteSummary 
            commuteId={selectedCommute.id} 
            onSetupClick={() => handleEditCommute(selectedCommute)}
          />
        </div>
      )}

      {/* Quick tip for multiple commutes */}
      {commutes.length === 1 && (
        <Card className="bg-default-50">
          <CardBody className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add your return commute</p>
                <p className="text-xs text-foreground/60">
                  Most people have two commutes - add your work → home route too!
                </p>
              </div>
              <Button
                size="sm"
                variant="flat"
                onPress={handleAddNewCommute}
                startContent={<Plus className="h-4 w-4" />}
              >
                Add
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
