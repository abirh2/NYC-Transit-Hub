"use client";

/**
 * AuthButton Component
 * 
 * Displays login button or user avatar with dropdown menu.
 * Used in the Navbar for authentication actions.
 */

import { useState } from "react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Spinner,
} from "@heroui/react";
import { User, LogOut, Settings } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";

export function AuthButton() {
  const { user, isLoading, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Button isIconOnly variant="light" isDisabled>
        <Spinner size="sm" />
      </Button>
    );
  }

  // Not logged in - show sign in button
  if (!user) {
    return (
      <>
        <Button
          variant="flat"
          color="primary"
          size="sm"
          onPress={() => setIsModalOpen(true)}
          startContent={<User className="h-4 w-4" />}
        >
          Sign In
        </Button>
        <AuthModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // Logged in - show user dropdown
  const userInitial = user.email?.charAt(0).toUpperCase() || "U";
  const userEmail = user.email || "User";

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          className="overflow-hidden rounded-full"
          aria-label="User menu"
        >
          <Avatar
            name={userInitial}
            size="sm"
            classNames={{
              base: "bg-primary text-primary-foreground",
              name: "text-sm font-semibold",
            }}
          />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="User actions"
        disabledKeys={isSigningOut ? ["signout"] : []}
      >
        <DropdownItem
          key="profile"
          className="h-14 gap-2"
          textValue={userEmail}
          isReadOnly
        >
          <p className="text-xs text-foreground/50">Signed in as</p>
          <p className="font-medium text-foreground truncate max-w-[200px]">
            {userEmail}
          </p>
        </DropdownItem>
        <DropdownItem
          key="commute"
          href="/commute"
          startContent={<Settings className="h-4 w-4" />}
        >
          Commute Settings
        </DropdownItem>
        <DropdownItem
          key="signout"
          color="danger"
          startContent={isSigningOut ? <Spinner size="sm" /> : <LogOut className="h-4 w-4" />}
          onPress={handleSignOut}
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

