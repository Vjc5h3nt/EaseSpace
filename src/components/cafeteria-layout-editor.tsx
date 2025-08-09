
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table as TableIcon, PlusCircle, Trash2 } from "lucide-react";
import type { Cafeteria, TableLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface CafeteriaLayoutEditorProps {
    cafeteria: Omit<Cafeteria, 'org_id'> & { org_id?: string };
    onLayoutChange: (layout: TableLayout[]) => void;
}

export function CafeteriaLayoutEditor({ cafeteria, onLayoutChange }: CafeteriaLayoutEditorProps) {
    const { toast } = useToast();
    const [layout, setLayout] = useState<TableLayout[]>(cafeteria.layout || []);
    const [draggingTable, setDraggingTable] = useState<{ tableIndex: number, offsetX: number, offsetY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLayout(cafeteria.layout || []);
    }, [cafeteria.id, cafeteria.layout]);
    
    useEffect(() => {
        onLayoutChange(layout);
    }, [layout, onLayoutChange]);


    const addTable = () => {
        const newTable: TableLayout = { id: `table-${Date.now()}`, x: 20, y: 20 };
        setLayout([...layout, newTable]);
    };

    const removeTable = (tableId: string) => {
        setLayout(layout.filter(table => table.id !== tableId));
    };

    const handleMouseDown = (e: React.MouseEvent, tableIndex: number) => {
        if (!canvasRef.current) return;
        const tableElement = e.currentTarget as HTMLDivElement;
        const tableRect = tableElement.getBoundingClientRect();
        const offsetX = e.clientX - tableRect.left;
        const offsetY = e.clientY - tableRect.top;
        setDraggingTable({ tableIndex, offsetX, offsetY });
        e.currentTarget.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingTable || !canvasRef.current) return;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        let x = e.clientX - canvasRect.left - draggingTable.offsetX;
        let y = e.clientY - canvasRect.top - draggingTable.offsetY;

        x = Math.max(0, Math.min(x, canvasRect.width - 40)); // 40 is table width
        y = Math.max(0, Math.min(y, canvasRect.height - 40)); // 40 is table height

        const newLayout = [...layout];
        newLayout[draggingTable.tableIndex] = { ...newLayout[draggingTable.tableIndex], x, y };
        setLayout(newLayout);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (draggingTable) {
            (e.currentTarget as HTMLDivElement).style.cursor = 'grab';
        }
        setDraggingTable(null);
    };
    
    return (
        <div className="space-y-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <div className="flex justify-between items-center">
                <div className='space-y-1'>
                    <p className="text-sm text-muted-foreground">
                        Drag & drop tables to arrange the layout. Each table seats 4.
                    </p>
                    <p className="font-medium">
                        Total Capacity: {layout.length * 4} seats
                    </p>
                </div>
                <Button onClick={addTable}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Table
                </Button>
            </div>
            <div
                ref={canvasRef}
                className={cn("relative w-full h-96 rounded-md border bg-slate-50", draggingTable ? 'cursor-grabbing' : 'cursor-grab')}
            >
                {layout.map((table, tableIndex) => (
                    <div
                        key={table.id}
                        onMouseDown={(e) => handleMouseDown(e, tableIndex)}
                        className="absolute w-10 h-10 flex items-center justify-center rounded-md bg-primary text-primary-foreground select-none group"
                        style={{ left: table.x, top: table.y, userSelect: 'none' }}
                    >
                        <TableIcon className="w-6 h-6" />
                        <button onClick={() => removeTable(table.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
