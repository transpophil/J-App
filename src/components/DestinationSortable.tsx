"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Destination {
  id: string;
  name: string;
  address?: string | null;
}

interface DestinationSortableProps {
  destinations: Destination[];
  onReorder: (next: Destination[]) => void;
  onEdit: (destination: Destination) => void;
  onDelete: (id: string) => void;
}

const DestinationSortable: React.FC<DestinationSortableProps> = ({ destinations, onReorder, onEdit, onDelete }) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const next = [...destinations];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    onReorder(next);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-2">
      {destinations.map((destination, index) => (
        <Card
          key={destination.id}
          className={`p-4 flex items-center justify-between transition-shadow ${dragIndex === index ? "ring-2 ring-primary" : ""}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary-foreground font-bold flex items-center justify-center">
              {(destination.name?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{destination.name}</p>
                <Badge variant="secondary">#{index + 1}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {destination.address || "No address"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(destination)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(destination.id)}>Delete</Button>
          </div>
        </Card>
      ))}
      {destinations.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No destinations yet</Card>
      )}
    </div>
  );
};

export default DestinationSortable;