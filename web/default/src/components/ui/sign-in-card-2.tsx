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
import type { ReactNode } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from 'motion/react'
import { cn } from '@/lib/utils'

export type SignInCard2Mode = 'sign-in' | 'sign-up'

type SignInCard2Props = {
  children: ReactNode
  className?: string
  contentClassName?: string
  logo: ReactNode
  mode: SignInCard2Mode
  onModeChange: (mode: SignInCard2Mode) => void
  signInLabel: string
  signUpLabel: string
  title: ReactNode
}

function TravelingBeam({
  className,
  animate,
}: {
  className: string
  animate: TargetAndTransition
}) {
  return (
    <motion.div
      className={cn(
        'via-primary/70 absolute from-transparent to-transparent opacity-70',
        className
      )}
      animate={animate}
      transition={{
        duration: 2.6,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 1,
      }}
    />
  )
}

export function SignInCard2({
  children,
  className,
  contentClassName,
  logo,
  mode,
  onModeChange,
  signInLabel,
  signUpLabel,
  title,
}: SignInCard2Props) {
  const shouldReduce = useReducedMotion()

  return (
    <div
      className={cn(
        'group border-border/80 bg-card/55 ring-foreground/10 relative isolate flex h-[min(720px,calc(100svh-12rem))] min-h-[420px] w-full flex-col overflow-hidden rounded-lg border p-[2px] shadow-[0_24px_70px_color-mix(in_oklch,var(--foreground)_16%,transparent)] ring-1 sm:h-[min(720px,calc(100svh-10rem))] md:h-[min(720px,calc(100svh-8rem))]',
        className
      )}
    >
      <div className='from-primary/45 via-border/90 to-foreground/20 absolute inset-0 rounded-lg bg-gradient-to-br opacity-95' />
      <div className='bg-primary/15 absolute -inset-1 rounded-lg opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70' />

      <div className='pointer-events-none absolute inset-0 overflow-hidden rounded-lg'>
        <TravelingBeam
          className='top-0 left-0 h-px w-1/2 bg-gradient-to-r'
          animate={{ left: ['-50%', '100%'] }}
        />
        <TravelingBeam
          className='top-0 right-0 h-1/2 w-px bg-gradient-to-b'
          animate={{ top: ['-50%', '100%'] }}
        />
        <TravelingBeam
          className='right-0 bottom-0 h-px w-1/2 bg-gradient-to-r'
          animate={{ right: ['-50%', '100%'] }}
        />
        <TravelingBeam
          className='bottom-0 left-0 h-1/2 w-px bg-gradient-to-b'
          animate={{ bottom: ['-50%', '100%'] }}
        />
      </div>

      <div className='bg-card/96 text-card-foreground border-border/85 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border p-6 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--background)_88%,transparent),0_18px_44px_color-mix(in_oklch,var(--foreground)_12%,transparent)] backdrop-blur-xl'>
        <div className='pointer-events-none absolute inset-0 [background-image:linear-gradient(135deg,currentColor_0.5px,transparent_0.5px),linear-gradient(45deg,currentColor_0.5px,transparent_0.5px)] [background-size:30px_30px] opacity-[0.035]' />

        <div className='relative mb-4 flex w-full shrink-0 flex-col items-center gap-2 text-center'>
          <div
            data-pong-collider='true'
            className='relative flex size-20 items-center justify-center overflow-hidden bg-transparent sm:size-24'
          >
            {logo}
          </div>
          <h1
            data-pong-collider='true'
            className='text-foreground text-2xl font-bold tracking-tight'
          >
            {title}
          </h1>
          <div
            data-pong-collider='true'
            className='bg-muted/45 border-border grid h-10 w-full max-w-64 grid-cols-2 rounded-full border p-1 text-sm font-semibold'
          >
            <button
              type='button'
              aria-pressed={mode === 'sign-in'}
              onClick={() => onModeChange('sign-in')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-full',
                mode === 'sign-in'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LogIn className='size-4' aria-hidden='true' />
              <span>{signInLabel}</span>
            </button>
            <button
              type='button'
              aria-pressed={mode === 'sign-up'}
              onClick={() => onModeChange('sign-up')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-full',
                mode === 'sign-up'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <UserPlus className='size-4' aria-hidden='true' />
              <span>{signUpLabel}</span>
            </button>
          </div>
        </div>

        <div className='relative min-h-0 flex-1 overflow-hidden'>
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: [0.33, 1, 0.68, 1] }}
            className={cn(
              'no-scrollbar h-full overflow-y-auto',
              contentClassName
            )}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
