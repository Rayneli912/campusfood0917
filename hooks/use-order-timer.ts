"use client"

import { useState, useEffect } from "react"

export function useOrderTimer(orderId: string) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  // Start the timer with a given duration in seconds
  const startTimer = (duration: number) => {
    // Check if timer is already running
    if (isRunning) {
      return
    }

    // Store timer state in localStorage
    const now = new Date().toISOString()
    const timerKey = `orderTimer_${orderId}`
    localStorage.setItem(
      timerKey,
      JSON.stringify({
        timeLeft: duration,
        preparedAt: now,
        initialTime: duration,
      }),
    )

    setTimeLeft(duration)
    setIsRunning(true)

    // Start countdown
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        const newTimeLeft = prev - 1

        // Update localStorage
        const timerData = JSON.parse(localStorage.getItem(timerKey) || "{}")
        localStorage.setItem(
          timerKey,
          JSON.stringify({
            ...timerData,
            timeLeft: newTimeLeft,
          }),
        )

        // If time is up
        if (newTimeLeft <= 0) {
          clearInterval(id)
          setIsRunning(false)

          // Auto-cancel the order when timer expires
          const autoCancel = async () => {
            try {
              // Import sync service
              const { syncOrderStatus } = await import("@/lib/sync-service")
              const success = await syncOrderStatus(orderId, "cancelled", "system", "逾時未取")
              
              if (success) {
                // Trigger order expiry event for UI updates
                const expiredEvent = new CustomEvent("orderExpired", {
                  detail: { orderId, reason: "逾時未取" },
                })
                window.dispatchEvent(expiredEvent)

                // Also trigger order status updated event for store sync
                const statusEvent = new CustomEvent("orderStatusUpdated", {
                  detail: { orderId, status: "cancelled", reason: "逾時未取" },
                })
                window.dispatchEvent(statusEvent)
              }
            } catch (error) {
              console.error("Failed to auto-cancel order:", error)
            }
          }

          autoCancel()
          return 0
        }

        return newTimeLeft
      })
    }, 1000)

    setIntervalId(id)
  }

  // Resume timer from localStorage if it exists
  const resumeTimer = () => {
    const timerKey = `orderTimer_${orderId}`
    const savedTimerState = localStorage.getItem(timerKey)

    if (savedTimerState) {
      try {
        const { timeLeft, preparedAt, initialTime } = JSON.parse(savedTimerState)

        // Calculate remaining time
        const now = new Date().getTime()
        const preparedTime = new Date(preparedAt).getTime()
        const elapsedSeconds = Math.floor((now - preparedTime) / 1000)
        const remainingSeconds = Math.max(0, initialTime - elapsedSeconds)

        console.log(`[OrderTimer] Resuming timer for order ${orderId}, remaining time: ${remainingSeconds}s`)

        // If time is up
        if (remainingSeconds <= 0) {
          // Auto-cancel the order when timer expires
          const autoCancel = async () => {
            try {
              // Import sync service
              const { syncOrderStatus } = await import("@/lib/sync-service")
              const success = await syncOrderStatus(orderId, "cancelled", "system", "逾時未取")
              
              if (success) {
                // Trigger order expiry event for UI updates
                const expiredEvent = new CustomEvent("orderExpired", {
                  detail: { orderId, reason: "逾時未取" },
                })
                window.dispatchEvent(expiredEvent)

                // Also trigger order status updated event for store sync
                const statusEvent = new CustomEvent("orderStatusUpdated", {
                  detail: { orderId, status: "cancelled", reason: "逾時未取" },
                })
                window.dispatchEvent(statusEvent)
              }
            } catch (error) {
              console.error("Failed to auto-cancel order:", error)
            }
          }

          autoCancel()
          return false
        }

        // Start timer with remaining time
        startTimer(remainingSeconds)
        return true
      } catch (error) {
        console.error("[OrderTimer] Error resuming timer:", error)
        return false
      }
    }

    return false
  }

  // Stop the timer
  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }

    setIsRunning(false)

    // Remove timer from localStorage
    const timerKey = `orderTimer_${orderId}`
    localStorage.removeItem(timerKey)
  }

  // Check for existing timer on mount
  useEffect(() => {
    resumeTimer()

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [orderId])

  return {
    timeLeft,
    isRunning,
    startTimer,
    stopTimer,
    resumeTimer,
  }
}
