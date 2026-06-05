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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { animate } from 'motion'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

type PersonalHomeProps = {
  isAuthenticated: boolean
}

const COLOR = '#FFFFFF'
const HIT_COLOR = '#333333'
const BACKGROUND_COLOR = '#000000'
const BALL_COLOR = '#FFFFFF'
const PADDLE_COLOR = '#FFFFFF'

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

interface PricingPlan {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  isPopular?: boolean
  accent: string
}

const ACCOUNT_COMPARISON = [
  {
    metric: '价格',
    pro: '$200/月，适合重度个人使用',
    plus: '$20/月，适合基础对话与轻量使用',
    relay: '日卡 1 元起，按套餐灵活体验',
  },
  {
    metric: '门槛',
    pro: '账号、环境、验证都要自己维护',
    plus: '能力更轻，部分高阶模型额度有限',
    relay: '网页登录即可用，不需要维护海外账号',
  },
  {
    metric: '场景',
    pro: '高频深度推理、长任务、个人工作流',
    plus: '日常问答、写作、轻量模型体验',
    relay: '项目测试、多模型切换、临时体验',
  },
]

const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    name: 'Day Pass',
    monthlyPrice: 1,
    yearlyPrice: 30,
    features: ['日卡体验', '多模型中转', '无需维护账号', '用量记录可查'],
    accent: 'bg-rose-500',
  },
  {
    name: 'Pro Relay',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ['适合项目测试', '优先线路', '热门模型支持', '预算更可控'],
    isPopular: true,
    accent: 'bg-blue-500',
  },
  {
    name: 'Team',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: ['多人共享', '更高额度', '专属配置', '人工支持'],
    accent: 'bg-purple-500',
  },
]

export function PersonalHome({ isAuthenticated }: PersonalHomeProps) {
  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'

  return (
    <main className='min-h-screen overflow-x-hidden bg-black'>
      <NavHeader />

      <section className='relative h-screen min-h-[560px] overflow-hidden bg-black'>
        <PromptingIsAllYouNeed />
        <ScrollDownIndicator />
      </section>

      <section
        id='pricing-section'
        className='relative min-h-screen overflow-hidden bg-[#f0f0f0]'
      >
        <PricingContainer plans={SUBSCRIPTION_PLANS} primaryHref={primaryHref} />
      </section>
    </main>
  )
}

function ScrollDownIndicator() {
  return (
    <a
      href='#pricing-section'
      aria-label='下滑查看套餐'
      className='group absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 rounded-full px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70'
    >
      <motion.span
        className='relative flex h-12 w-7 justify-center rounded-full border border-white/55 bg-white/[0.03] shadow-[0_0_30px_rgba(255,255,255,0.12)] backdrop-blur-sm transition-colors group-hover:border-white'
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          className='mt-2 h-2 w-1 rounded-full bg-white'
          animate={{ y: [0, 15, 0], opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.span>
      <span className='relative h-8 w-5'>
        <motion.span
          className='absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-white/80'
          animate={{ y: [0, 8, 0], opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className='absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-white/45'
          animate={{ y: [0, 8, 0], opacity: [0.15, 0.75, 0.15] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.18,
          }}
        />
      </span>
    </a>
  )
}

export function PromptingIsAllYouNeed() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelsRef = useRef<Pixel[]>([])
  const ballsRef = useRef<Ball[]>([])
  const paddlesRef = useRef<Paddle[]>([])
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
    const lines = ['SUBISLE', '行业领先AI中转站']

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
      textCtx.fillStyle = COLOR
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

      const largeText = fitTrackingFontSize(
        lines[0],
        canvas.width * 0.84,
        Math.min(canvas.width * 0.18, canvas.height * 0.22),
        sansFont,
        0.1
      )
      const largeFontSize = largeText.fontSize
      const largeLetterSpacing = largeText.letterSpacing
      const smallText = fitTrackingFontSize(
        lines[1],
        canvas.width * 0.82,
        Math.min(canvas.width * 0.072, canvas.height * 0.095),
        cjkFont,
        0.04
      )
      const smallFontSize = smallText.fontSize
      const smallLetterSpacing = smallText.letterSpacing
      const centerY = canvas.height / 2

      createTextPixels(lines[0], {
        centerY: centerY - largeFontSize * 0.48,
        fontSize: largeFontSize,
        fontFamily: sansFont,
        pixelSize: largePixelSize,
        letterSpacing: largeLetterSpacing,
      })
      createTextPixels(lines[1], {
        centerY: centerY + smallFontSize * 1.1,
        fontSize: smallFontSize,
        fontFamily: cjkFont,
        pixelSize: smallPixelSize,
        letterSpacing: smallLetterSpacing,
      })

      if (pixelsRef.current.length === 0) {
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

    const resizeCanvas = () => {
      scaleRef.current = Math.min(
        window.innerWidth / 1000,
        window.innerHeight / 1000
      )
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initializeGame()
    }

    const updateGame = () => {
      const balls = ballsRef.current
      const paddles = paddlesRef.current

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
      ctx.fillStyle = BACKGROUND_COLOR
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      pixelsRef.current.forEach((pixel) => {
        ctx.fillStyle = pixel.hit ? HIT_COLOR : COLOR
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
        ctx.fillStyle = COLOR
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `900 ${largeFontSize}px ${sansFont}`
        drawTrackingText(
          ctx,
          lines[0],
          canvas.width / 2,
          centerY - largeFontSize * 0.48,
          largeLetterSpacing
        )
        ctx.font = `900 ${smallFontSize}px ${cjkFont}`
        drawTrackingText(
          ctx,
          lines[1],
          canvas.width / 2,
          centerY + smallFontSize * 1.1,
          smallLetterSpacing
        )
      }

      ctx.fillStyle = BALL_COLOR
      ballsRef.current.forEach((ball) => {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = PADDLE_COLOR
      paddlesRef.current.forEach((paddle) => {
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
      })
    }

    const gameLoop = () => {
      updateGame()
      drawGame()
      animationFrameId = requestAnimationFrame(gameLoop)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    gameLoop()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='absolute inset-0 h-full w-full'
      aria-label='Prompting Is All You Need: Fullscreen Pong game with pixel text'
    />
  )
}

const Counter = ({ from, to }: { from: number; to: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const controls = animate(from, to, {
      duration: 1,
      onUpdate(value) {
        node.textContent = value.toFixed(0)
      },
    })

    return () => controls.stop()
  }, [from, to])

  return <span ref={nodeRef} />
}

type NavCursorPosition = {
  left: number
  width: number
  opacity: number
}

function NavHeader() {
  const { t } = useTranslation()
  const links = useTopNavLinks()
  const { auth } = useAuthStore()
  const notifications = useNotifications()
  const [position, setPosition] = useState<NavCursorPosition>({
    left: 0,
    width: 0,
    opacity: 0,
  })

  const showLinks = links.length > 0
  const isAuthenticated = !!auth.user

  return (
    <nav className='pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-3 sm:top-5'>
      <ul
        className='pointer-events-auto no-scrollbar relative mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-full border-2 border-black bg-white p-1 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.9)]'
        onMouseLeave={() =>
          setPosition((current) => ({ ...current, opacity: 0 }))
        }
      >
        {showLinks ? (
          <>
            {links.map((link) => (
              <Tab key={link.href} link={link} setPosition={setPosition}>
                {link.title}
              </Tab>
            ))}

            <Cursor position={position} />
            <li className='mx-1 h-7 w-px shrink-0 bg-black/15 md:h-9' />
          </>
        ) : null}

        <li className='relative z-10 flex shrink-0 items-center gap-0.5 px-1'>
          <NotificationPopover
            open={notifications.popoverOpen}
            onOpenChange={notifications.setPopoverOpen}
            unreadCount={notifications.unreadCount}
            activeTab={notifications.activeTab}
            onTabChange={notifications.setActiveTab}
            notice={notifications.notice}
            announcements={notifications.announcements}
            loading={notifications.loading}
            className='text-black hover:bg-black/10'
          />
          <LanguageSwitcher />
          <ThemeSwitch />
          {isAuthenticated ? (
            <ProfileDropdown />
          ) : (
            <Button
              size='sm'
              className='h-8 rounded-full bg-black px-3 text-xs font-black text-white hover:bg-black/80 md:h-10 md:px-4'
              render={<Link to='/sign-in' />}
            >
              {t('Sign in')}
            </Button>
          )}
        </li>
      </ul>
    </nav>
  )
}

const Tab = ({
  children,
  link,
  setPosition,
}: {
  children: React.ReactNode
  link: ReturnType<typeof useTopNavLinks>[number]
  setPosition: React.Dispatch<React.SetStateAction<NavCursorPosition>>
}) => {
  const ref = useRef<HTMLLIElement>(null)

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return

        const { width } = ref.current.getBoundingClientRect()
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        })
      }}
      className='relative z-10 block cursor-pointer px-3 py-1.5 text-xs font-black uppercase text-white mix-blend-difference md:px-5 md:py-3 md:text-base'
    >
      {link.external ? (
        <a href={link.href} target='_blank' rel='noopener noreferrer'>
          {children}
        </a>
      ) : (
        <Link to={link.href}>{children}</Link>
      )}
    </li>
  )
}

const Cursor = ({ position }: { position: NavCursorPosition }) => (
  <motion.li
    animate={position}
    className='absolute z-0 h-7 rounded-full bg-black md:h-12'
  />
)

const PricingToggle = ({
  isYearly,
  onToggle,
}: {
  isYearly: boolean
  onToggle: () => void
}) => (
  <div className='relative z-10 mb-8 flex items-center justify-center gap-4'>
    <span className={cn('font-medium text-gray-600', !isYearly && 'text-black')}>
      Monthly
    </span>
    <motion.button
      type='button'
      className='flex h-8 w-16 items-center rounded-full border-2 border-black bg-gray-200 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]'
      onClick={onToggle}
    >
      <motion.div
        className='h-6 w-6 rounded-full border-2 border-black bg-white'
        animate={{ x: isYearly ? 32 : 0 }}
      />
    </motion.button>
    <span className={cn('font-medium text-gray-600', isYearly && 'text-black')}>
      Yearly
    </span>
    {isYearly && (
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className='text-sm font-medium text-green-500'
      >
        Save 20%
      </motion.span>
    )}
  </div>
)

const BackgroundEffects = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        x: Math.random() * 20 - 10,
        duration: 3 + Math.random() * 2,
      })),
    []
  )

  return (
    <>
      <div className='absolute inset-0'>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className='absolute h-2 w-2 rounded-full bg-black/5'
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, particle.x, 0],
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <div
        className='absolute inset-0'
        style={{
          backgroundImage:
            'linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
    </>
  )
}

function AccountComparison() {
  return (
    <section className='relative z-10 mx-auto mb-8 w-full max-w-5xl overflow-hidden rounded-xl border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]'>
      <div className='hidden grid-cols-4 border-b-[3px] border-black bg-black text-xs font-black text-white sm:grid sm:text-sm'>
        <div className='px-3 py-3'>项目</div>
        <div className='border-l-[3px] border-white/20 px-3 py-3'>Pro</div>
        <div className='border-l-[3px] border-white/20 px-3 py-3'>Plus</div>
        <div className='border-l-[3px] border-white/20 px-3 py-3'>本站</div>
      </div>
      {ACCOUNT_COMPARISON.map((row) => (
        <div
          key={row.metric}
          className='grid grid-cols-1 border-b-[3px] border-black last:border-b-0 sm:grid-cols-4'
        >
          <div className='bg-yellow-200 px-3 py-3 text-sm font-black text-black sm:border-r-[3px] sm:border-black'>
            {row.metric}
          </div>
          <p className='border-t-[3px] border-black px-3 py-3 text-sm font-bold text-black sm:border-t-0 sm:border-r-[3px]'>
            <span className='mr-2 font-black sm:hidden'>Pro</span>
            {row.pro}
          </p>
          <p className='border-t-[3px] border-black px-3 py-3 text-sm font-bold text-black sm:border-t-0 sm:border-r-[3px]'>
            <span className='mr-2 font-black sm:hidden'>Plus</span>
            {row.plus}
          </p>
          <p className='border-t-[3px] border-black bg-green-100 px-3 py-3 text-sm font-bold text-black sm:border-t-0'>
            <span className='mr-2 font-black sm:hidden'>本站</span>
            {row.relay}
          </p>
        </div>
      ))}
    </section>
  )
}

const PricingCard = ({
  plan,
  isYearly,
  index,
  primaryHref,
}: {
  plan: PricingPlan
  isYearly: boolean
  index: number
  primaryHref: string
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 15, stiffness: 150 }
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [7, -7]),
    springConfig
  )
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-7, 7]),
    springConfig
  )

  const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice
  const previousPrice = !isYearly ? plan.yearlyPrice : plan.monthlyPrice

  return (
    <motion.div
      ref={cardRef}
      key={plan.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 }}
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
      }}
      onMouseMove={(e) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const centerX = rect.x + rect.width / 2
        const centerY = rect.y + rect.height / 2
        mouseX.set((e.clientX - centerX) / rect.width)
        mouseY.set((e.clientY - centerY) / rect.height)
      }}
      onMouseLeave={() => {
        mouseX.set(0)
        mouseY.set(0)
      }}
      className='relative w-full rounded-xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]'
    >
      <motion.div
        className={cn(
          'absolute -top-4 -right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]',
          plan.accent
        )}
        animate={{
          rotate: [0, 10, 0, -10, 0],
          scale: [1, 1.1, 0.9, 1.1, 1],
          y: [0, -5, 5, -3, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: [0.76, 0, 0.24, 1],
        }}
      >
        <div className='text-center text-white'>
          <div className='text-lg font-black'>
            ¥
            <Counter from={previousPrice} to={currentPrice} />
          </div>
          <div className='text-[10px] font-bold'>
            /{isYearly ? 'yr' : 'mo'}
          </div>
        </div>
      </motion.div>

      <div className='mb-4'>
        <h3 className='mb-2 text-xl font-black text-black'>{plan.name}</h3>
        {plan.isPopular && (
          <motion.span
            className={cn(
              'inline-block rounded-md border-2 border-black px-3 py-1 text-xs font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]',
              plan.accent
            )}
            animate={{
              y: [0, -3, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            POPULAR
          </motion.span>
        )}
      </div>

      <div className='mb-4 space-y-2'>
        {plan.features.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{
              x: 5,
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400 },
            }}
            className='flex items-center gap-2 rounded-md border-2 border-black bg-gray-50 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]'
          >
            <motion.span
              whileHover={{ scale: 1.2, rotate: 360 }}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border border-black text-xs font-bold text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.9)]',
                plan.accent
              )}
            >
              ✓
            </motion.span>
            <span className='text-sm font-bold text-black'>{feature}</span>
          </motion.div>
        ))}
      </div>

      <Button
        className={cn(
          'w-full rounded-lg border-2 border-black py-2 text-sm font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]',
          plan.accent
        )}
        render={<Link to={primaryHref} />}
      >
        GET STARTED →
      </Button>
    </motion.div>
  )
}

export const PricingContainer = ({
  plans,
  primaryHref,
}: {
  plans: PricingPlan[]
  primaryHref: string
}) => {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#f0f0f0] p-4 pt-28 sm:p-6 sm:pt-32 lg:p-8 lg:pt-32'>
      <BackgroundEffects />
      <AccountComparison />
      <PricingToggle
        isYearly={isYearly}
        onToggle={() => setIsYearly(!isYearly)}
      />

      <div className='relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            isYearly={isYearly}
            index={index}
            primaryHref={primaryHref}
          />
        ))}
      </div>
    </div>
  )
}

export default PromptingIsAllYouNeed
