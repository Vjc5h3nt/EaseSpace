
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import type { Cafeteria, TableLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

// A more descriptive icon for a cafeteria table
function TableWithChairsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
            <path d="M2 12h20" />
            <path d="M6 12v8" />
            <path d="M18 12v8" />
        </svg>
    );
}

interface CafeteriaLayoutEditorProps {
    cafeteria: Omit<Cafeteria, 'org_id'> & { org_id?: string };
    onLayoutChange: (layout: TableLayout[]) => void;
}

export function CafeteriaLayoutEditor({ cafeteria, onLayoutChange }: CafeteriaLayoutEditorProps) {
    const { toast } = useToast();
    const [layout, setLayout] = useState<TableLayout[]>([]);
    const [draggingTable, setDraggingTable] = useState<{ tableIndex: number, offsetX: number, offsetY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize layout state when the component mounts or cafeteria prop changes
        setLayout(cafeteria.layout || []);
    }, [cafeteria.id, cafeteria.layout]);

    // This effect now correctly calls the parent updater function.
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

        // Ensure the table stays within the canvas boundaries
        const tableWidth = 40; // as defined in styles
        const tableHeight = 40;
        x = Math.max(0, Math.min(x, canvasRect.width - tableWidth));
        y = Math.max(0, Math.min(y, canvasRect.height - tableHeight));

        const newLayout = [...layout];
        newLayout[draggingTable.tableIndex] = { ...newLayout[draggingTable.tableIndex], x, y };
        setLayout(newLayout);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (draggingTable && e.currentTarget) {
             const target = e.currentTarget as HTMLDivElement;
             const child = target.querySelector('[style*="cursor: grabbing"]');
             if(child) (child as HTMLElement).style.cursor = 'grab';
        }
        setDraggingTable(null);
    };
    
    return (
        <div className="space-y-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
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
                className={cn("relative w-full h-96 rounded-md border bg-slate-50", draggingTable ? 'cursor-grabbing' : 'cursor-default')}
            >
                {layout.map((table, tableIndex) => (
                    <div
                        key={table.id}
                        onMouseDown={(e) => handleMouseDown(e, tableIndex)}
                        className="absolute w-10 h-10 flex items-center justify-center rounded-md bg-primary text-primary-foreground select-none group cursor-grab"
                        style={{ left: table.x, top: table.y, userSelect: 'none' }}
                    >
                        <TableWithChairsIcon className="w-6 h-6" />
                        <button onClick={(e) => { e.stopPropagation(); removeTable(table.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
