"use client";

/**
 * RailSelector Component
 * 
 * Branch/Line picker for LIRR and Metro-North.
 */

import { useState, useCallback } from "react";
import { 
  Button, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Spinner,
} from "@heroui/react";
import { ChevronDown, Check, X } from "lucide-react";
import { RailBadge } from "@/components/ui/RailBadge";
import type { TransitMode } from "@/types/mta";

interface RailBranch {
  id: string;
  name: string;
}

interface RailSelectorProps {
  /** Transit mode */
  mode: TransitMode;
  /** Currently selected branch/line ID */
  selectedBranch: string | null;
  /** Callback when selection changes */
  onSelectionChange: (branchId: string | null) => void;
  /** Available branches (from API or static fallback) */
  availableBranches?: RailBranch[];
  /** Whether branches are loading */
  isLoading?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function RailSelector({
  mode,
  selectedBranch,
  onSelectionChange,
  availableBranches = [],
  isLoading = false,
  compact = false,
}: RailSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedBranchInfo = availableBranches.find(b => b.id === selectedBranch);
  const modeLabel = mode === "lirr" ? "LIRR Branch" : "Metro-North Line";
  const selectLabel = mode === "lirr" ? "Select Branch" : "Select Line";
  const changeLabel = mode === "lirr" ? "Change Branch" : "Change Line";

  const selectBranch = useCallback((branchId: string) => {
    if (selectedBranch === branchId) {
      onSelectionChange(null);
    } else {
      onSelectionChange(branchId);
    }
    setIsOpen(false);
  }, [selectedBranch, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange(null);
  }, [onSelectionChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selected Branch Display */}
      <div className="flex items-center gap-1.5">
        {selectedBranchInfo ? (
          <div className="flex items-center gap-2">
            <RailBadge 
              branchId={selectedBranchInfo.id}
              branchName={selectedBranchInfo.name}
              mode={mode}
              size="md"
            />
            <span className="text-sm font-medium">{selectedBranchInfo.name}</span>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              className="h-5 w-5 min-w-5"
              onPress={clearSelection}
            >
              <X className="h-3 w-3 text-foreground/50" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-foreground/50">No {modeLabel.toLowerCase()} selected</span>
        )}
      </div>

      {/* Branch Picker Popover */}
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
      >
        <PopoverTrigger>
          <Button
            size={compact ? "sm" : "md"}
            variant="flat"
            endContent={<ChevronDown className="h-4 w-4" />}
            isLoading={isLoading}
          >
            {selectedBranch ? changeLabel : selectLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0">
          <div className="p-3 border-b border-divider">
            <span className="text-sm font-medium">Select a {modeLabel}</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-foreground/60">Loading...</span>
              </div>
            ) : availableBranches.length === 0 ? (
              <div className="text-center py-8 text-foreground/50 text-sm">
                No branches available
              </div>
            ) : (
              <div className="space-y-1">
                {availableBranches.map((branch) => {
                  const isSelected = selectedBranch === branch.id;
                  
                  return (
                    <button
                      key={branch.id}
                      onClick={() => selectBranch(branch.id)}
                      className={`
                        w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left
                        ${isSelected 
                          ? "bg-primary/10 ring-1 ring-primary" 
                          : "hover:bg-default-100"
                        }
                      `}
                    >
                      <RailBadge 
                        branchId={branch.id}
                        branchName={branch.name}
                        mode={mode}
                        size="sm"
                        abbreviated
                      />
                      <span className="flex-1 text-sm font-medium">
                        {branch.name}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

