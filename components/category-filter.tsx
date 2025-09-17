"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 p-1">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className={cn(
              "cursor-pointer px-3 py-1 text-sm transition-colors",
              selectedCategory === null ? "bg-primary hover:bg-primary/90" : "hover:bg-muted",
            )}
            onClick={() => onSelectCategory(null)}
          >
            全部
          </Badge>

          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1 text-sm transition-colors",
                selectedCategory === category ? "bg-primary hover:bg-primary/90" : "hover:bg-muted",
              )}
              onClick={() => onSelectCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
