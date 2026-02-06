"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Driver {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  pin_password?: string;
}

interface DriverSortableProps {
  drivers: Driver[];
  onReorder: (next: Driver[]) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

const DriverSortable: React.FC<DriverSortableProps> = ({ drivers, onReorder, onEdit, onDelete }) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const next = [...drivers];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    onReorder(next);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-2">
      {drivers.map((driver, index) => (
        <Card
          key={driver.id}
          className={`p-4 flex items-center justify-between transition-shadow ${dragIndex === index ? "ring-2 ring-primary" : ""}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
              {driver.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{driver.name}</p>
                <Badge variant="secondary">#{index + 1}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {driver.email || "No email"} · {driver.phone || "No phone"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(driver)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(driver.id)}>Delete</Button>
          </div>
        </Card>
      ))}
      {drivers.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No drivers yet</Card>
      )}
    </div>
  );
};

export default DriverSortable;