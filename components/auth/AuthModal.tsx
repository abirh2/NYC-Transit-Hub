"use client";

/**
 * AuthModal Component
 * 
 * Login/signup modal with tabs for switching between forms.
 * Uses Supabase Auth for email/password authentication.
 */

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tabs,
  Tab,
  Divider,
} from "@heroui/react";
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = "login" | "signup";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as AuthTab);
    resetForm();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Success - close modal
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Show success message - user needs to verify email
      setSuccess("Check your email for a confirmation link to complete signup.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "login") {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      backdrop="blur"
      classNames={{
        base: "bg-content1",
        header: "border-b border-divider",
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-xl font-semibold">Welcome</span>
            <span className="text-sm font-normal text-foreground/60">
              Sign in to save your commute settings
            </span>
          </ModalHeader>
          <ModalBody>
            <Tabs
              fullWidth
              size="md"
              aria-label="Auth options"
              selectedKey={activeTab}
              onSelectionChange={handleTabChange}
              classNames={{
                tabList: "gap-4 w-full",
                cursor: "w-full bg-primary",
                tab: "max-w-fit px-4 h-10",
                tabContent: "group-data-[selected=true]:text-primary-foreground",
              }}
            >
              <Tab key="login" title="Sign In" />
              <Tab key="signup" title="Sign Up" />
            </Tabs>

            <Divider className="my-2" />

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onValueChange={setEmail}
                startContent={<Mail className="h-4 w-4 text-foreground/50" />}
                isRequired
                isDisabled={isLoading}
              />

              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onValueChange={setPassword}
                startContent={<Lock className="h-4 w-4 text-foreground/50" />}
                isRequired
                isDisabled={isLoading}
              />

              {activeTab === "signup" && (
                <Input
                  type="password"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  startContent={<Lock className="h-4 w-4 text-foreground/50" />}
                  isRequired
                  isDisabled={isLoading}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={onClose}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              startContent={!isLoading && <User className="h-4 w-4" />}
            >
              {activeTab === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

