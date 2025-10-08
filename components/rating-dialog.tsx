"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Star } from "lucide-react"

interface RatingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RatingDialog({ open, onOpenChange }: RatingDialogProps) {
  const { toast } = useToast()
  const [restaurantRating, setRestaurantRating] = useState(0)
  const [deliveryRating, setDeliveryRating] = useState(0)
  const [comment, setComment] = useState("")

  const handleSubmit = () => {
    if (restaurantRating === 0 || deliveryRating === 0) {
      toast({
        title: "請評分",
        description: "請為餐廳和外送員評分",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "評分已送出",
      description: "感謝您的評分和意見",
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>評分此訂單</DialogTitle>
          <DialogDescription>請為餐廳和外送員評分，您的意見對我們很重要</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">餐廳評分</h3>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className="p-1" onClick={() => setRestaurantRating(star)}>
                  <Star
                    className={`h-8 w-8 ${
                      star <= restaurantRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                  <span className="sr-only">{star} 星</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">外送員評分</h3>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className="p-1" onClick={() => setDeliveryRating(star)}>
                  <Star
                    className={`h-8 w-8 ${
                      star <= deliveryRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                  <span className="sr-only">{star} 星</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">評論</h3>
            <Textarea
              placeholder="分享您的用餐體驗和外送體驗..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>送出評分</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
