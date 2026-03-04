"use client";

import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit, Trash2 } from "lucide-react";

type Destination = {
  id: string;
  name: string;
  address?: string | null;
};

type Props = {
  destinations: Destination[];
  onReorder: (next: Destination[]) => void;
  onEdit: (destination: Destination) => void;
  onDelete: (destinationId: string) => void;
};

const DestinationSortable: React.FC<Props> = ({ destinations, onReorder, onEdit, onDelete }) => {
  const dragSourceId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    dragSourceId.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    const sourceId = dragSourceId.current;
    setDraggingId(null);
    dragSourceId.current = null;
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = destinations.findIndex((d) => d.id === sourceId);
    const targetIndex = destinations.findIndex((d) => d.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const next = [...destinations];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
  }

  return (
    <div className="space-y-3">
      {destinations.map((destination) => {
        const isDragging = draggingId === destination.id;
        return (
          <Card
            key={destination.id}
            className={`p-4 transition-all ${isDragging ? "ring-2 ring-primary shadow-lg" : ""}`}
            draggable
            onDragStart={(e) => handleDragStart(e, destination.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, destination.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <GripVertical className="mt-1 h-5 w-5 text-muted-foreground cursor-grab" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{destination.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {destination.address || "No address"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => onEdit(destination)}
                  aria-label={`Edit ${destination.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(destination.id)}
                  aria-label={`Delete ${destination.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
      {destinations.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          No destinations yet. Use "Add Destination" to create one.
        </Card>
      )}
    </div>
  );
};

export default DestinationSortable;