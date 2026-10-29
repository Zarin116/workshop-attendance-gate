'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/firestore'
import { cn } from '@/lib/utils'
import { getPrimaryNavItems, isActive } from './navItems'

// email comes from the server session so it is there on first paint
export function Navbar({ role, email }: { role: UserRole; email: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/signin')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* The sidebar is hidden below lg, so small screens get the main links here.
          Profile is the avatar on the right. */}
      <nav aria-label="Main" className="flex min-w-0 flex-1 gap-1 lg:hidden">
        {getPrimaryNavItems(role).map(({ href, label }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium',
                active
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="hidden flex-1 lg:block" />
      <div className="flex shrink-0 items-center gap-3 pl-2">
        {email && <span className="hidden text-sm text-zinc-500 sm:block">{email}</span>}
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
