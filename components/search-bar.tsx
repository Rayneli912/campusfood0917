"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  initialValue?: string
}

export function SearchBar({ onSearch, placeholder = "搜尋店家或商品...", initialValue = "" }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const clearSearch = () => {
    setSearchQuery("")
    onSearch("")
  }

  return (
    <form onSubmit={handleSearch} className="relative flex w-full max-w-lg items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-12"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">清除搜尋</span>
          </Button>
        )}
      </div>
      <Button type="submit" size="sm" className="ml-2 h-10 shrink-0">
        搜尋
      </Button>
    </form>
  )
}
