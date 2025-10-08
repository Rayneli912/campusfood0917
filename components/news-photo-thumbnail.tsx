'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PhotoViewerDialog } from './photo-viewer-dialog'

interface NewsPhotoThumbnailProps {
  images: string[]
  className?: string
}

/**
 * 列表縮圖：固定 120x90（4:3），確保所有卡片高度一致
 * 點縮圖可開圖片檢視器；用 stopPropagation 避免觸發外層卡片 onClick
 */
export function NewsPhotoThumbnail({ images, className = '' }: NewsPhotoThumbnailProps) {
  const [isOpen, setIsOpen] = useState(false)

  const first = images && images.length > 0 ? images[0] : null
  if (!first) return null

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-md cursor-pointer ${className}`}
        style={{ width: 120, height: 90 }} // 固定寬高，列表比例一致
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        title="點擊放大"
      >
        <Image
          src={first}
          alt="縮圖"
          fill
          className="object-cover"
          sizes="120px"
          priority={false}
        />
      </div>

      <PhotoViewerDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        images={[first]}
        initialIndex={0}
      />
    </>
  )
}
