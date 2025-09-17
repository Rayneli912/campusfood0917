import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  href?: string
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function BrandLogo({ href = "/", className, size = "md", showText = true }: BrandLogoProps) {
  const logoSizes = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  }

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  }

  const content = (
    <div className={cn("flex items-center", className)}>
      <div className="relative flex-shrink-0">
        <div className={cn("font-bold text-green-600", textSizes[size])}>🍃 惜食快go</div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="focus:outline-none">
        {content}
      </Link>
    )
  }

  return content
}
