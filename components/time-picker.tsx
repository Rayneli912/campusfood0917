"use client"
import { Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="time">時間</Label>
      </div>
      <Input type="time" id="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// For backward compatibility
export const TimePickerDemo = TimePicker
