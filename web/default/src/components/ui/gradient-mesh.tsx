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
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type GradientMeshProps = {
  colors?: [string, string, string] | string[]
  distortion?: number
  swirl?: number
  speed?: number
  rotation?: number
  waveAmp?: number
  waveFreq?: number
  waveSpeed?: number
  grain?: number
  className?: string
}

export function GradientMesh({
  colors = ['#bcecf6', '#00aaff', '#ffd447'],
  distortion = 8,
  swirl = 0.2,
  speed = 1,
  rotation = 90,
  waveAmp = 0.2,
  waveFreq = 20,
  waveSpeed = 0.2,
  grain = 0.06,
  className,
}: GradientMeshProps) {
  const [first, second, third] = colors
  const duration = Math.max(10, 28 / Math.max(speed, 0.2))
  const meshScale = 1 + distortion / 48 + swirl / 8

  return (
    <div
      className={cn(
        'absolute inset-0 isolate overflow-hidden bg-black',
        className
      )}
      style={{
        '--mesh-first': first,
        '--mesh-second': second,
        '--mesh-third': third,
        '--mesh-duration': `${duration}s`,
        '--mesh-rotation': `${rotation}deg`,
        '--mesh-scale': meshScale,
        '--mesh-wave-x': `${Math.round(waveFreq * waveAmp * 3)}%`,
        '--mesh-wave-y': `${Math.round(waveFreq * waveSpeed * 2)}%`,
        '--mesh-grain-opacity': grain,
      } as CSSProperties}
      aria-hidden='true'
    >
      <div className='animate-[gradient-mesh-drift_var(--mesh-duration)_ease-in-out_infinite_alternate] absolute -inset-[16%] rotate-[var(--mesh-rotation)] scale-[var(--mesh-scale)] bg-[radial-gradient(circle_at_18%_20%,var(--mesh-first)_0,transparent_34%),radial-gradient(circle_at_82%_22%,var(--mesh-second)_0,transparent_30%),radial-gradient(circle_at_50%_82%,var(--mesh-third)_0,transparent_38%),linear-gradient(135deg,#06121d_0%,#0f172a_48%,#111827_100%)] blur-2xl' />
      <div className='absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.22),transparent_38%,rgba(255,255,255,0.12)_68%,transparent)] mix-blend-soft-light' />
      <div className='absolute inset-0 opacity-[var(--mesh-grain-opacity)] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0_0.5px,transparent_0.8px)] [background-size:3px_3px]' />
      <style>
        {`@keyframes gradient-mesh-drift {
          0% { transform: translate3d(calc(var(--mesh-wave-x) * -1), calc(var(--mesh-wave-y) * -1), 0) rotate(0deg); }
          50% { transform: translate3d(var(--mesh-wave-y), var(--mesh-wave-x), 0) rotate(8deg); }
          100% { transform: translate3d(var(--mesh-wave-x), calc(var(--mesh-wave-y) * -1), 0) rotate(-6deg); }
        }`}
      </style>
    </div>
  )
}
