"use client"

import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange: (avatarData: string) => void
  name?: string
}

export function AvatarUpload({ currentAvatar, onAvatarChange, name }: AvatarUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentAvatar)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // 處理文件上傳
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreviewUrl(result)
        onAvatarChange(result)
        setIsDialogOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }

  // 開始攝像頭捕捉
  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCapturing(true)
    } catch (error) {
      console.error("無法訪問攝像頭:", error)
    }
  }

  // 停止攝像頭捕捉
  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }

  // 拍照
  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg")
        setPreviewUrl(imageData)
        onAvatarChange(imageData)
        stopCapture()
        setIsDialogOpen(false)
      }
    }
  }

  // 清理資源
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="flex flex-col items-center gap-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div className="relative cursor-pointer group">
            <Avatar className="h-24 w-24">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="頭像" />
              ) : (
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更換頭像</DialogTitle>
            <DialogDescription>
              選擇一張照片或使用攝像頭拍攝新的頭像照片
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isCapturing ? (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="flex justify-center gap-2">
                  <Button onClick={takePhoto}>
                    拍照
                  </Button>
                  <Button variant="outline" onClick={stopCapture}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Button onClick={startCapture}>
                  <Camera className="mr-2 h-4 w-4" />
                  開啟攝像頭
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    上傳照片
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {name && <p className="text-sm font-medium">{name}</p>}
    </div>
  )
} 