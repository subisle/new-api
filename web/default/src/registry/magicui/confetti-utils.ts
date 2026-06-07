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
export type ConfettiOptions = {
  particleCount?: number
  duration?: number
  spread?: number
}

type ConfettiParticle = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
}

const CONFETTI_COLORS = [
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#eab308',
]

function createConfettiCanvas() {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.zIndex = '9999'
  canvas.style.pointerEvents = 'none'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  return canvas
}

export function fireConfetti(options: ConfettiOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  if (prefersReducedMotion) return

  const canvas = createConfettiCanvas()
  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    return
  }

  const duration = options.duration ?? 1400
  const particleCount = options.particleCount ?? 96
  const spread = options.spread ?? Math.PI * 0.9
  const originX = canvas.width / 2
  const originY = canvas.height * 0.28
  const startTime = performance.now()

  const particles: ConfettiParticle[] = Array.from(
    { length: particleCount },
    () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const speed = 8 + Math.random() * 8

      return {
        x: originX,
        y: originY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 5 + Math.random() * 7,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.28,
        opacity: 1,
      }
    }
  )

  let animationFrame = 0

  const render = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1)
    context.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((particle) => {
      particle.x += particle.velocityX
      particle.y += particle.velocityY
      particle.velocityY += 0.28
      particle.velocityX *= 0.99
      particle.rotation += particle.rotationSpeed
      particle.opacity = 1 - progress

      context.save()
      context.globalAlpha = particle.opacity
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      context.fillStyle = particle.color
      context.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size * 0.55
      )
      context.restore()
    })

    if (progress < 1) {
      animationFrame = requestAnimationFrame(render)
      return
    }

    cancelAnimationFrame(animationFrame)
    canvas.remove()
  }

  animationFrame = requestAnimationFrame(render)
}
