import { ReactNode, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
  isDragging?: boolean;
  isCustomizeMode?: boolean;
}

const SortableWidget = ({ id, children, isDragging, isCustomizeMode }: SortableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        (isDragging || isSorting) && "z-50",
        isSorting && "opacity-50"
      )}
    >
      {/* Drag Handle - only visible in customize mode */}
      {isCustomizeMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 p-1.5 rounded-lg bg-primary text-primary-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {children}
    </div>
  );
};

interface DraggableWidgetGridProps {
  widgetOrder: string[];
  onReorder: (newOrder: string[]) => void;
  isCustomizeMode: boolean;
  children: (widgetId: string) => ReactNode | null;
}

export const DraggableWidgetGrid = ({
  widgetOrder,
  onReorder,
  isCustomizeMode,
  children,
}: DraggableWidgetGridProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as string);
      const newIndex = widgetOrder.indexOf(over.id as string);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Filter only widgets that have content
  const activeWidgets = widgetOrder.filter(id => children(id) !== null);

  if (!isCustomizeMode) {
    // Non-draggable mode - just render normally
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
        {activeWidgets.map((widgetId) => (
          <div key={widgetId} className="h-full">{children(widgetId)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
          {activeWidgets.map((widgetId) => (
            <SortableWidget
              key={widgetId}
              id={widgetId}
              isDragging={activeId === widgetId}
              isCustomizeMode={isCustomizeMode}
            >
              {children(widgetId)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay for smooth dragging visual */}
      <DragOverlay>
        {activeId ? (
          <div className="opacity-90 shadow-2xl rounded-xl scale-105">
            {children(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableWidgetGrid;
