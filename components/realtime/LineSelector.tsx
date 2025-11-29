"use client";

/**
 * LineSelector Component
 * 
 * Single-select line picker organized by color families.
 * Allows users to select one subway line to view on the tracker.
 * 
 * TODO: Add multi-select mode when multi-line view is implemented
 */

import { useState, useCallback } from "react";
import { Button, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { ChevronDown, Check } from "lucide-react";
import { SubwayBullet } from "@/components/ui";
import { LINE_GROUPS, type LineId } from "@/lib/gtfs/line-stations";

interface LineSelectorProps {
  /** Currently selected line ID */
  selectedLine: LineId | null;
  /** Callback when selection changes */
  onSelectionChange: (line: LineId | null) => void;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function LineSelector({
  selectedLine,
  onSelectionChange,
  compact = false,
}: LineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectLine = useCallback((lineId: LineId) => {
    if (selectedLine === lineId) {
      // Deselect if clicking the same line
      onSelectionChange(null);
    } else {
      onSelectionChange(lineId);
    }
    setIsOpen(false);
  }, [selectedLine, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange(null);
  }, [onSelectionChange]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selected Line Display */}
      <div className="flex items-center gap-1.5">
        {selectedLine ? (
          <div className="flex items-center gap-2">
            <SubwayBullet line={selectedLine} size="md" />
            <span className="text-sm font-medium">{selectedLine} Train</span>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              className="h-5 w-5 min-w-5"
              onPress={clearSelection}
            >
              <span className="text-foreground/50">&times;</span>
            </Button>
          </div>
        ) : (
          <span className="text-sm text-foreground/50">No line selected</span>
        )}
      </div>

      {/* Line Picker Popover */}
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
          >
            {selectedLine ? "Change Line" : "Select Line"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="p-3 border-b border-divider">
            <span className="text-sm font-medium">Select a Subway Line</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {Object.entries(LINE_GROUPS).map(([groupId, group]) => {
              const groupLines = group.lines as readonly LineId[];
              
              return (
                <div key={groupId} className="mb-3 last:mb-0">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-xs font-medium text-foreground/70">
                      {group.name}
                    </span>
                  </div>
                  
                  {/* Lines in Group */}
                  <div className="flex flex-wrap gap-1.5 px-2 mt-1">
                    {groupLines.map((lineId) => {
                      const isSelected = selectedLine === lineId;
                      
                      return (
                        <button
                          key={lineId}
                          onClick={() => selectLine(lineId)}
                          className={`
                            relative flex items-center justify-center p-1 rounded-lg transition-all
                            ${isSelected 
                              ? "ring-2 ring-primary ring-offset-1 ring-offset-background" 
                              : "hover:bg-default-100"
                            }
                            cursor-pointer
                          `}
                        >
                          <SubwayBullet line={lineId} size="md" />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
