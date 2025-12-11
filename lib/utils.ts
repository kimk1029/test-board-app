import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < day) {
    if (diff < minute) return '방금 전'
    if (diff < hour) return `${Math.floor(diff / minute)}분 전`
    return `${Math.floor(diff / hour)}시간 전`
  }
  
  return date.toLocaleDateString('ko-KR')
}
