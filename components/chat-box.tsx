"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"

export function ChatBox() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "other",
      content: "您好，我是您的外送員，我已經在路上了",
      time: "14:30",
    },
    {
      id: 2,
      sender: "self",
      content: "好的，謝謝您",
      time: "14:31",
    },
    {
      id: 3,
      sender: "other",
      content: "請問您的大門密碼是多少？",
      time: "14:35",
    },
  ])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) return

    const newMessage = {
      id: messages.length + 1,
      sender: "self",
      content: message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages([...messages, newMessage])
    setMessage("")

    // 模擬回覆
    setTimeout(() => {
      const replyMessage = {
        id: messages.length + 2,
        sender: "other",
        content: "好的，我已收到您的訊息",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, replyMessage])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === "self" ? "flex-row-reverse" : ""}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  msg.sender === "self" ? "/placeholder.svg?height=32&width=32" : "/placeholder.svg?height=32&width=32"
                }
                alt={msg.sender === "self" ? "您" : "對方"}
              />
              <AvatarFallback>{msg.sender === "self" ? "您" : "對方"}</AvatarFallback>
            </Avatar>
            <div
              className={`rounded-lg px-3 py-2 max-w-[80%] ${
                msg.sender === "self" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <p>{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender === "self" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input placeholder="輸入訊息..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">發送</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
