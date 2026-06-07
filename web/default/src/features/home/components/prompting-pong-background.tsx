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
import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/context/theme-provider'

interface Pixel {
  x: number
  y: number
  size: number
  hit: boolean
}

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
}

interface Paddle {
  x: number
  y: number
  width: number
  height: number
  targetY: number
  isVertical: boolean
}

interface CollisionRect {
  x: number
  y: number
  width: number
  height: number
}

type PromptingIsAllYouNeedProps = {
  className?: string
  showPixelText?: boolean
  collisionRootRef?: RefObject<HTMLElement | null>
  collisionSelector?: string
  collisionPadding?: number
  collisionRefreshMs?: number
  startDelayMs?: number
}

function readCssColor(
  styles: CSSStyleDeclaration,
  variableName: string,
  fallback: string
) {
  return styles.getPropertyValue(variableName).trim() || fallback
}

function resolveBallRectCollision(ball: Ball, rect: CollisionRect) {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height))
  const distanceX = ball.x - closestX
  const distanceY = ball.y - closestY
  const distanceSquared = distanceX * distanceX + distanceY * distanceY

  if (distanceSquared > ball.radius * ball.radius) return

  if (distanceSquared === 0) {
    const left = Math.abs(ball.x - rect.x)
    const right = Math.abs(rect.x + rect.width - ball.x)
    const top = Math.abs(ball.y - rect.y)
    const bottom = Math.abs(rect.y + rect.height - ball.y)
    const minDistance = Math.min(left, right, top, bottom)

    if (minDistance === left) {
      ball.x = rect.x - ball.radius
      ball.dx = -Math.abs(ball.dx)
    } else if (minDistance === right) {
      ball.x = rect.x + rect.width + ball.radius
      ball.dx = Math.abs(ball.dx)
    } else if (minDistance === top) {
      ball.y = rect.y - ball.radius
      ball.dy = -Math.abs(ball.dy)
    } else {
      ball.y = rect.y + rect.height + ball.radius
      ball.dy = Math.abs(ball.dy)
    }
    return
  }

  const distance = Math.sqrt(distanceSquared)
  const normalX = distanceX / distance
  const normalY = distanceY / distance
  const isMovingIntoRect = ball.dx * normalX + ball.dy * normalY < 0

  ball.x = closestX + normalX * ball.radius
  ball.y = closestY + normalY * ball.radius

  if (!isMovingIntoRect) return

  if (Math.abs(normalX) > Math.abs(normalY)) {
    ball.dx = normalX > 0 ? Math.abs(ball.dx) : -Math.abs(ball.dx)
  } else {
    ball.dy = normalY > 0 ? Math.abs(ball.dy) : -Math.abs(ball.dy)
  }
}

export function PromptingIsAllYouNeed({
  className,
  showPixelText = true,
  collisionRootRef,
  collisionSelector,
  collisionPadding = 6,
  collisionRefreshMs = 120,
  startDelayMs = 0,
}: PromptingIsAllYouNeedProps = {}) {
  const { t, i18n } = useTranslation()
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelsRef = useRef<Pixel[]>([])
  const ballsRef = useRef<Ball[]>([])
  const paddlesRef = useRef<Paddle[]>([])
  const collisionRectsRef = useRef<CollisionRect[]>([])
  const lastCollisionRefreshRef = useRef(0)
  const scaleRef = useRef(1)
  const fallbackTextRef = useRef<{
    largeFontSize: number
    smallFontSize: number
    largeLetterSpacing: number
    smallLetterSpacing: number
    sansFont: string
    cjkFont: string
    centerY: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let startTimerId = 0
    const lines = showPixelText
      ? [t('SUBISLE'), t('Industry-leading AI relay')]
      : []

    const createTextPixels = (
      text: string,
      options: {
        centerY: number
        fontSize: number
        fontFamily: string
        pixelSize: number
        letterSpacing?: number
      }
    ) => {
      const textCanvas = document.createElement('canvas')
      const textCtx = textCanvas.getContext('2d')
      if (!textCtx) return

      textCanvas.width = canvas.width
      textCanvas.height = canvas.height
      textCtx.fillStyle = readCssColor(
        getComputedStyle(document.documentElement),
        '--foreground',
        '#ffffff'
      )
      textCtx.textAlign = 'center'
      textCtx.textBaseline = 'middle'
      textCtx.font = `900 ${options.fontSize}px ${options.fontFamily}`
      drawTrackingText(
        textCtx,
        text,
        canvas.width / 2,
        options.centerY,
        options.letterSpacing ?? 0
      )

      const imageData = textCtx.getImageData(0, 0, canvas.width, canvas.height)
      const stride = Math.max(2, Math.round(options.pixelSize))
      for (let y = 0; y < canvas.height; y += stride) {
        for (let x = 0; x < canvas.width; x += stride) {
          let hasInk = false
          for (let sy = 0; sy < stride && !hasInk; sy += 2) {
            for (let sx = 0; sx < stride; sx += 2) {
              const sampleX = Math.min(canvas.width - 1, x + sx)
              const sampleY = Math.min(canvas.height - 1, y + sy)
              const index = (sampleY * canvas.width + sampleX) * 4 + 3
              if (imageData.data[index] > 32) {
                hasInk = true
                break
              }
            }
          }
          if (hasInk) {
            pixelsRef.current.push({ x, y, size: stride, hit: false })
          }
        }
      }
    }

    const measureTrackingText = (
      context: CanvasRenderingContext2D,
      text: string,
      letterSpacing: number
    ) =>
      text
        .split('')
        .reduce(
          (width, character, index) =>
            width +
            context.measureText(character).width +
            (index > 0 ? letterSpacing : 0),
          0
        )

    const drawTrackingText = (
      context: CanvasRenderingContext2D,
      text: string,
      centerX: number,
      centerY: number,
      letterSpacing: number
    ) => {
      const characters = text.split('')
      const totalWidth = measureTrackingText(context, text, letterSpacing)
      let x = centerX - totalWidth / 2

      characters.forEach((character, index) => {
        const characterWidth = context.measureText(character).width
        if (index > 0) {
          x += letterSpacing
        }
        context.fillText(character, x + characterWidth / 2, centerY)
        x += characterWidth
      })
    }

    const fitTrackingFontSize = (
      text: string,
      maxWidth: number,
      initialSize: number,
      fontFamily: string,
      spacingRatio: number
    ) => {
      let fontSize = initialSize
      let letterSpacing = fontSize * spacingRatio
      ctx.font = `900 ${fontSize}px ${fontFamily}`
      while (
        measureTrackingText(ctx, text, letterSpacing) > maxWidth &&
        fontSize > 18
      ) {
        fontSize -= 2
        letterSpacing = fontSize * spacingRatio
        ctx.font = `900 ${fontSize}px ${fontFamily}`
      }
      return { fontSize, letterSpacing }
    }

    const initializeGame = () => {
      const scale = scaleRef.current
      const largePixelSize = Math.max(5, 8 * scale)
      const smallPixelSize = Math.max(3, 4 * scale)
      const ballSpeed = 6 * scale
      const sansFont =
        'Public Sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      const cjkFont =
        '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif'

      pixelsRef.current = []
      fallbackTextRef.current = null

      const largeText = lines[0]
        ? fitTrackingFontSize(
            lines[0],
            canvas.width * 0.84,
            Math.min(canvas.width * 0.18, canvas.height * 0.22),
            sansFont,
            0.1
          )
        : {
            fontSize: Math.min(canvas.width * 0.18, canvas.height * 0.22),
            letterSpacing: 0,
          }
      const largeFontSize = largeText.fontSize
      const largeLetterSpacing = largeText.letterSpacing
      const smallText = lines[1]
        ? fitTrackingFontSize(
            lines[1],
            canvas.width * 0.82,
            Math.min(canvas.width * 0.072, canvas.height * 0.095),
            cjkFont,
            0.04
          )
        : {
            fontSize: Math.min(canvas.width * 0.072, canvas.height * 0.095),
            letterSpacing: 0,
          }
      const smallFontSize = smallText.fontSize
      const smallLetterSpacing = smallText.letterSpacing
      const centerY = canvas.height / 2

      if (lines[0]) {
        createTextPixels(lines[0], {
          centerY: centerY - largeFontSize * 0.48,
          fontSize: largeFontSize,
          fontFamily: sansFont,
          pixelSize: largePixelSize,
          letterSpacing: largeLetterSpacing,
        })
      }
      if (lines[1]) {
        createTextPixels(lines[1], {
          centerY: centerY + smallFontSize * 1.1,
          fontSize: smallFontSize,
          fontFamily: cjkFont,
          pixelSize: smallPixelSize,
          letterSpacing: smallLetterSpacing,
        })
      }

      if (showPixelText && pixelsRef.current.length === 0) {
        fallbackTextRef.current = {
          largeFontSize,
          smallFontSize,
          largeLetterSpacing,
          smallLetterSpacing,
          sansFont,
          cjkFont,
          centerY,
        }
      }

      const ballRadius = Math.max(10, largePixelSize * 2.4)
      ballsRef.current = [
        {
          x: canvas.width * 0.9,
          y: canvas.height * 0.12,
          dx: -ballSpeed,
          dy: ballSpeed,
          radius: ballRadius,
        },
        {
          x: canvas.width * 0.12,
          y: canvas.height * 0.82,
          dx: ballSpeed * 0.92,
          dy: -ballSpeed * 0.84,
          radius: ballRadius,
        },
      ]

      const paddleWidth = Math.max(8, largePixelSize * 2)
      const paddleLength = Math.max(80, largePixelSize * 20)

      paddlesRef.current = [
        {
          x: 0,
          y: canvas.height / 2 - paddleLength / 2,
          width: paddleWidth,
          height: paddleLength,
          targetY: canvas.height / 2 - paddleLength / 2,
          isVertical: true,
        },
        {
          x: canvas.width - paddleWidth,
          y: canvas.height / 2 - paddleLength / 2,
          width: paddleWidth,
          height: paddleLength,
          targetY: canvas.height / 2 - paddleLength / 2,
          isVertical: true,
        },
        {
          x: canvas.width / 2 - paddleLength / 2,
          y: 0,
          width: paddleLength,
          height: paddleWidth,
          targetY: canvas.width / 2 - paddleLength / 2,
          isVertical: false,
        },
        {
          x: canvas.width / 2 - paddleLength / 2,
          y: canvas.height - paddleWidth,
          width: paddleLength,
          height: paddleWidth,
          targetY: canvas.width / 2 - paddleLength / 2,
          isVertical: false,
        },
      ]
    }

    const getCollisionRects = () => {
      if (!collisionSelector) return []

      const canvasRect = canvas.getBoundingClientRect()
      if (!canvasRect.width || !canvasRect.height) return []

      const root = collisionRootRef?.current ?? document
      const scaleX = canvas.width / canvasRect.width
      const scaleY = canvas.height / canvasRect.height

      return Array.from(
        root.querySelectorAll<HTMLElement>(collisionSelector)
      ).flatMap<CollisionRect>((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return []

        return [
          {
            x: (rect.left - canvasRect.left - collisionPadding) * scaleX,
            y: (rect.top - canvasRect.top - collisionPadding) * scaleY,
            width: (rect.width + collisionPadding * 2) * scaleX,
            height: (rect.height + collisionPadding * 2) * scaleY,
          },
        ]
      })
    }

    const refreshCollisionRects = () => {
      collisionRectsRef.current = getCollisionRects()
      lastCollisionRefreshRef.current = performance.now()
    }

    const resizeCanvas = () => {
      scaleRef.current = Math.min(
        window.innerWidth / 1000,
        window.innerHeight / 1000
      )
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initializeGame()
      collisionRectsRef.current = getCollisionRects()
    }

    const getCanvasColors = () => {
      const styles = getComputedStyle(document.documentElement)
      return {
        background: readCssColor(styles, '--background', '#000000'),
        foreground: readCssColor(styles, '--foreground', '#ffffff'),
        hit: readCssColor(styles, '--muted-foreground', '#333333'),
        paddle: readCssColor(styles, '--primary', '#ffffff'),
        ball: readCssColor(styles, '--foreground', '#ffffff'),
      }
    }

    const updateGame = () => {
      const balls = ballsRef.current
      const paddles = paddlesRef.current
      const collisionRects = collisionRectsRef.current

      balls.forEach((ball) => {
        ball.x += ball.dx
        ball.y += ball.dy

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius
          ball.dy = Math.abs(ball.dy)
        }
        if (ball.y + ball.radius > canvas.height) {
          ball.y = canvas.height - ball.radius
          ball.dy = -Math.abs(ball.dy)
        }
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius
          ball.dx = Math.abs(ball.dx)
        }
        if (ball.x + ball.radius > canvas.width) {
          ball.x = canvas.width - ball.radius
          ball.dx = -Math.abs(ball.dx)
        }

        paddles.forEach((paddle) => {
          if (paddle.isVertical) {
            if (
              ball.x - ball.radius < paddle.x + paddle.width &&
              ball.x + ball.radius > paddle.x &&
              ball.y > paddle.y &&
              ball.y < paddle.y + paddle.height
            ) {
              ball.dx =
                paddle.x < canvas.width / 2
                  ? Math.abs(ball.dx)
                  : -Math.abs(ball.dx)
            }
          } else if (
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.y + ball.radius > paddle.y &&
            ball.x > paddle.x &&
            ball.x < paddle.x + paddle.width
          ) {
            ball.dy =
              paddle.y < canvas.height / 2
                ? Math.abs(ball.dy)
                : -Math.abs(ball.dy)
          }
        })

        collisionRects.forEach((rect) => {
          resolveBallRectCollision(ball, rect)
        })

        pixelsRef.current.forEach((pixel) => {
          if (
            !pixel.hit &&
            ball.x + ball.radius > pixel.x &&
            ball.x - ball.radius < pixel.x + pixel.size &&
            ball.y + ball.radius > pixel.y &&
            ball.y - ball.radius < pixel.y + pixel.size
          ) {
            pixel.hit = true
            const centerX = pixel.x + pixel.size / 2
            const centerY = pixel.y + pixel.size / 2
            if (Math.abs(ball.x - centerX) > Math.abs(ball.y - centerY)) {
              ball.dx = -ball.dx
            } else {
              ball.dy = -ball.dy
            }
          }
        })
      })

      paddles.forEach((paddle) => {
        const trackingBall = balls.reduce<Ball | null>((closest, ball) => {
          if (!closest) {
            return ball
          }

          const currentDistance = paddle.isVertical
            ? Math.abs(ball.x - paddle.x)
            : Math.abs(ball.y - paddle.y)
          const closestDistance = paddle.isVertical
            ? Math.abs(closest.x - paddle.x)
            : Math.abs(closest.y - paddle.y)

          return currentDistance < closestDistance ? ball : closest
        }, null)

        if (!trackingBall) return

        if (paddle.isVertical) {
          paddle.targetY = trackingBall.y - paddle.height / 2
          paddle.targetY = Math.max(
            0,
            Math.min(canvas.height - paddle.height, paddle.targetY)
          )
          paddle.y += (paddle.targetY - paddle.y) * 0.1
        } else {
          paddle.targetY = trackingBall.x - paddle.width / 2
          paddle.targetY = Math.max(
            0,
            Math.min(canvas.width - paddle.width, paddle.targetY)
          )
          paddle.x += (paddle.targetY - paddle.x) * 0.1
        }
      })
    }

    const drawGame = () => {
      const colors = getCanvasColors()

      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      pixelsRef.current.forEach((pixel) => {
        ctx.fillStyle = pixel.hit ? colors.hit : colors.foreground
        ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size)
      })

      if (fallbackTextRef.current) {
        const {
          largeFontSize,
          smallFontSize,
          largeLetterSpacing,
          smallLetterSpacing,
          sansFont,
          cjkFont,
          centerY,
        } = fallbackTextRef.current
        ctx.fillStyle = colors.foreground
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (lines[0]) {
          ctx.font = `900 ${largeFontSize}px ${sansFont}`
          drawTrackingText(
            ctx,
            lines[0],
            canvas.width / 2,
            centerY - largeFontSize * 0.48,
            largeLetterSpacing
          )
        }
        if (lines[1]) {
          ctx.font = `900 ${smallFontSize}px ${cjkFont}`
          drawTrackingText(
            ctx,
            lines[1],
            canvas.width / 2,
            centerY + smallFontSize * 1.1,
            smallLetterSpacing
          )
        }
      }

      ctx.fillStyle = colors.ball
      ballsRef.current.forEach((ball) => {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = colors.paddle
      paddlesRef.current.forEach((paddle) => {
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
      })
    }

    const gameLoop = () => {
      const now = performance.now()
      if (
        collisionSelector &&
        now - lastCollisionRefreshRef.current >= collisionRefreshMs
      ) {
        refreshCollisionRects()
      }
      updateGame()
      drawGame()
      animationFrameId = requestAnimationFrame(gameLoop)
    }

    const startGame = () => {
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      window.addEventListener('scroll', refreshCollisionRects, true)
      gameLoop()
    }

    if (startDelayMs > 0) {
      startTimerId = window.setTimeout(startGame, startDelayMs)
    } else {
      startGame()
    }

    return () => {
      if (startTimerId) {
        window.clearTimeout(startTimerId)
      }
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('scroll', refreshCollisionRects, true)
      cancelAnimationFrame(animationFrameId)
    }
  }, [
    collisionPadding,
    collisionRefreshMs,
    collisionRootRef,
    collisionSelector,
    i18n.language,
    resolvedTheme,
    showPixelText,
    startDelayMs,
    t,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'absolute inset-0 h-full w-full'}
      aria-label={t('Fullscreen Pong game with pixel text')}
    />
  )
}

export default PromptingIsAllYouNeed
