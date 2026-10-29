import { ClipboardCheck, FileLock, Settings, TrendingUp, User } from 'lucide-react'
import type { UserRole } from '@/types/firestore'

const featureItems = {
  facilitator: [
    { href: '/workshops', label: 'Workshops', icon: ClipboardCheck },
    { href: '/assessment', label: 'Final assessment', icon: FileLock },
  ],
  user: [
    { href: '/progress', label: 'My progress', icon: TrendingUp },
    { href: '/assessment', label: 'Final assessment', icon: FileLock },
  ],
}

/** The pages for this role's job. Small screens only show these. */
export function getPrimaryNavItems(role: UserRole) {
  return featureItems[role]
}

export function getNavItems(role: UserRole) {
  return [
    ...featureItems[role],
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
