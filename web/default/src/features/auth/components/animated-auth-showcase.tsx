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
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import {
  BrainCircuit,
  Cloud,
  Code2,
  Fingerprint,
  Gauge,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type OrbitItem = {
  label: string
  icon: ReactNode
  radius: number
  duration: number
  delay?: number
  reverse?: boolean
  className?: string
}

const ORBIT_ITEMS: OrbitItem[] = [
  {
    label: 'OpenAI',
    icon: <BrainCircuit className='size-5' />,
    radius: 88,
    duration: 18,
    className: 'bg-blue-500 text-white',
  },
  {
    label: 'Claude',
    icon: <Sparkles className='size-5' />,
    radius: 88,
    duration: 18,
    delay: 9,
    className: 'bg-amber-400 text-black',
  },
  {
    label: 'Gemini',
    icon: <Zap className='size-5' />,
    radius: 138,
    duration: 24,
    reverse: true,
    className: 'bg-cyan-500 text-black',
  },
  {
    label: 'Passkey',
    icon: <Fingerprint className='size-5' />,
    radius: 138,
    duration: 24,
    delay: 12,
    reverse: true,
    className: 'bg-emerald-500 text-black',
  },
  {
    label: 'Gateway',
    icon: <Network className='size-5' />,
    radius: 194,
    duration: 30,
    className: 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950',
  },
  {
    label: 'Secure',
    icon: <LockKeyhole className='size-5' />,
    radius: 194,
    duration: 30,
    delay: 15,
    className: 'bg-rose-500 text-white',
  },
]

function RippleField() {
  return (
    <div
      aria-hidden
      className='absolute inset-0 flex items-center justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]'
    >
      {Array.from({ length: 8 }, (_, index) => {
        const size = 190 + index * 88
        return (
          <motion.span
            key={index}
            className='absolute rounded-full border border-zinc-950/10 bg-zinc-950/[0.03] dark:border-white/10 dark:bg-white/[0.04]'
            style={{ width: size, height: size }}
            animate={{ scale: [0.98, 1.05, 0.98], opacity: [0.18, 0.34, 0.18] }}
            transition={{
              duration: 4.4,
              delay: index * 0.16,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

function OrbitingIcon(props: OrbitItem) {
  return (
    <>
      <div
        aria-hidden
        className='absolute left-1/2 top-1/2 rounded-full border border-zinc-950/10 dark:border-white/10'
        style={{
          width: props.radius * 2,
          height: props.radius * 2,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <motion.div
        className='absolute left-1/2 top-1/2'
        style={{ width: props.radius * 2, height: props.radius * 2 }}
        initial={{
          x: '-50%',
          y: '-50%',
          rotate: props.delay ? (props.delay / props.duration) * 360 : 0,
        }}
        animate={{ rotate: props.reverse ? -360 : 360 }}
        transition={{
          duration: props.duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <motion.div
          className={cn(
            'absolute left-1/2 top-0 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/25 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur',
            props.className
          )}
          title={props.label}
          animate={{ rotate: props.reverse ? 360 : -360 }}
          transition={{
            duration: props.duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {props.icon}
        </motion.div>
      </motion.div>
    </>
  )
}

export function AnimatedAuthShowcase() {
  const { t } = useTranslation()

  return (
    <section className='relative flex min-h-svh overflow-hidden bg-[#f5f5f2] text-zinc-950 dark:bg-zinc-950 dark:text-white'>
      <div className='absolute inset-0 bg-[linear-gradient(to_right,rgba(24,24,27,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.08)_1px,transparent_1px)] bg-[size:42px_42px] opacity-50 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)]' />
      <RippleField />

      <div className='relative z-10 flex w-full flex-col justify-between p-10 xl:p-14'>
        <div className='flex items-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase text-zinc-500 dark:text-zinc-400'>
          <ShieldCheck className='size-4' />
          {t('Unified AI Gateway')}
        </div>

        <div className='relative mx-auto flex aspect-square w-full max-w-[34rem] items-center justify-center'>
          <div className='absolute inset-12 rounded-full bg-white/65 blur-3xl dark:bg-white/10' />
          {ORBIT_ITEMS.map((item) => (
            <OrbitingIcon key={item.label} {...item} />
          ))}

          <motion.div
            className='relative z-10 flex size-44 flex-col items-center justify-center rounded-[2rem] border border-zinc-950/10 bg-white/80 text-center shadow-[0_28px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10'
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <KeyRound className='mb-3 size-8 text-blue-500' />
            <span className='text-4xl font-black tracking-tight'>API</span>
            <span className='mt-1 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400'>
              {t('Access Hub')}
            </span>
          </motion.div>
        </div>

        <div className='grid gap-3 text-sm text-zinc-600 dark:text-zinc-300'>
          <div className='flex items-center gap-2'>
            <Cloud className='size-4 text-blue-500' />
            {t('Multi-provider routing with controlled account access')}
          </div>
          <div className='flex items-center gap-2'>
            <Gauge className='size-4 text-emerald-500' />
            {t('Usage, billing, and verification remain enforced')}
          </div>
          <div className='flex items-center gap-2'>
            <Code2 className='size-4 text-amber-500' />
            {t('Compatible with existing OAuth, Passkey, and Turnstile flows')}
          </div>
        </div>
      </div>
    </section>
  )
}
