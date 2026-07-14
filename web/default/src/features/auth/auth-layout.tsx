/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { lazy, Suspense, useRef, type ReactNode } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { HomeNavHeader } from '@/features/home/components/home-nav-header'

const PromptingIsAllYouNeed = lazy(() =>
  import('@/features/home/components/prompting-pong-background').then(
    (module) => ({
      default: module.PromptingIsAllYouNeed,
    })
  )
)

type AuthLayoutProps = {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const notifications = useNotifications()

  return (
    <div
      ref={pageRef}
      className='bg-background text-foreground relative min-h-svh overflow-x-hidden'
    >
      <Suspense fallback={null}>
        <PromptingIsAllYouNeed
          showPixelText={false}
          collisionRootRef={pageRef}
          collisionSelector='[data-pong-collider="true"]:not(form)'
          collisionRefreshMs={260}
          startDelayMs={120}
          className='pointer-events-none absolute inset-0 h-full w-full opacity-70'
        />
      </Suspense>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,color-mix(in_oklch,var(--background)_18%,transparent)_42%,color-mix(in_oklch,var(--background)_78%,transparent)_100%)]' />
      <div className='bg-background/20 absolute inset-0' />
      <HomeNavHeader notifications={notifications} />

      <div className='relative z-10 flex min-h-svh min-w-0 items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+10rem)] pb-8 sm:px-6 sm:pt-44 md:pt-52 lg:pt-24'>
        <div className='w-full max-w-[min(430px,calc(100vw-2rem))] min-w-0'>
          {children}
        </div>
      </div>
    </div>
  )
}
