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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import type { useNotifications } from '@/hooks/use-notifications'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

type NavCursorPosition = {
  left: number
  width: number
  opacity: number
}

type HomeNavHeaderProps = {
  notifications: ReturnType<typeof useNotifications>
  consoleScrollEffect?: boolean
}

const CONSOLE_NAV_SCROLL_THRESHOLD = 18
const CONSOLE_SCROLL_CONTAINER_SELECTOR =
  '[data-app-scroll-container="true"], [data-slot="sidebar-inset"]'

export function HomeNavHeader({
  notifications,
  consoleScrollEffect = false,
}: HomeNavHeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const links = useTopNavLinks()
  const { auth } = useAuthStore()
  const [position, setPosition] = useState<NavCursorPosition>({
    left: 0,
    width: 0,
    opacity: 0,
  })

  const showLinks = links.length > 0
  const isAuthenticated = !!auth.user
  const pathname = routerState.location.pathname
  const hasConsoleScrollEffect =
    consoleScrollEffect && isConsoleNavScrollRoute(pathname)
  const shouldExpandByDefault =
    isDashboardNavRoute(pathname) ||
    isPricingNavRoute(pathname) ||
    isRankingsNavRoute(pathname)
  const consoleNavScrolled = useConsoleNavExpanded(
    hasConsoleScrollEffect && !shouldExpandByDefault,
    pathname
  )
  const consoleNavExpanded =
    hasConsoleScrollEffect && (shouldExpandByDefault || consoleNavScrolled)

  const handleNavLinkClick = useCallback(
    (
      event: MouseEvent<HTMLAnchorElement>,
      link: ReturnType<typeof useTopNavLinks>[number]
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth && !isAuthenticated) {
        event.preventDefault()
        navigate({ to: '/sign-in', search: { redirect: link.href } })
      }
    },
    [isAuthenticated, navigate]
  )

  return (
    <>
      <HomeBrand />
      <nav
        className={cn(
          'pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-3 transition-[top,padding] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] lg:top-5',
          consoleNavExpanded && 'px-2 lg:pr-5 lg:pl-[25rem]'
        )}
      >
        <ul
          data-pong-collider='true'
          data-console-nav-expanded={consoleNavExpanded ? 'true' : undefined}
          className={cn(
            'no-scrollbar border-foreground bg-card pointer-events-auto relative mx-auto flex flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-full border-2 p-1 shadow-[5px_5px_0px_0px_color-mix(in_oklch,var(--foreground)_86%,transparent)] transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]',
            consoleNavExpanded
              ? 'w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] lg:w-full lg:max-w-none'
              : 'w-fit max-w-[calc(100vw-1rem)]'
          )}
          onMouseLeave={() =>
            setPosition((current) => ({ ...current, opacity: 0 }))
          }
        >
          {showLinks ? (
            <>
              {links.map((link) => (
                <Tab
                  key={link.href}
                  link={link}
                  isActive={isNavLinkActive(pathname, link.href)}
                  onClick={handleNavLinkClick}
                  setPosition={setPosition}
                >
                  {link.title}
                </Tab>
              ))}

              <Cursor position={position} />
            </>
          ) : null}

          <li
            aria-hidden='true'
            className={cn(
              'order-5 hidden min-w-4 transition-[flex-basis] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] lg:order-none',
              consoleNavExpanded && 'block flex-1'
            )}
          />
          {showLinks ? (
            <li className='bg-foreground/15 order-2 mx-1 h-7 w-px shrink-0 md:h-9 lg:order-none' />
          ) : null}

          <li className='relative z-10 order-3 flex shrink-0 items-center gap-0.5 px-1 lg:order-none'>
            <NotificationPopover
              open={notifications.popoverOpen}
              onOpenChange={notifications.setPopoverOpen}
              unreadCount={notifications.unreadCount}
              activeTab={notifications.activeTab}
              onTabChange={notifications.setActiveTab}
              notice={notifications.notice}
              announcements={notifications.announcements}
              loading={notifications.loading}
              className='text-foreground hover:bg-foreground/10'
              size='large'
              layout={pathname === '/' ? 'horizontal' : 'default'}
            />
            <LanguageSwitcher />
            <ThemeSwitch />
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <Button
                size='sm'
                className='h-8 rounded-full px-3 text-xs font-black md:h-10 md:px-4'
                render={<Link to='/sign-in' preload='intent' />}
              >
                {t('Sign in')}
              </Button>
            )}
          </li>
        </ul>
      </nav>
    </>
  )
}

function useConsoleNavExpanded(enabled: boolean, pathname: string) {
  const [scrollState, setScrollState] = useState({
    pathname: '',
    expanded: false,
  })

  useEffect(() => {
    if (!enabled) return

    const updateExpanded = (target?: EventTarget | null) => {
      const next = hasConsoleScrollOffset(target)
      setScrollState((current) =>
        current.pathname === pathname && current.expanded === next
          ? current
          : { pathname, expanded: next }
      )
    }

    const handleScroll = (event: Event) => {
      updateExpanded(event.target)
    }

    updateExpanded()
    const frameId = window.requestAnimationFrame(() => updateExpanded())

    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [enabled, pathname])

  return enabled && scrollState.pathname === pathname && scrollState.expanded
}

function hasConsoleScrollOffset(target?: EventTarget | null) {
  if (
    window.scrollY > CONSOLE_NAV_SCROLL_THRESHOLD ||
    document.documentElement.scrollTop > CONSOLE_NAV_SCROLL_THRESHOLD ||
    document.body.scrollTop > CONSOLE_NAV_SCROLL_THRESHOLD
  ) {
    return true
  }

  if (
    target instanceof HTMLElement &&
    target.scrollTop > CONSOLE_NAV_SCROLL_THRESHOLD
  ) {
    return true
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>(CONSOLE_SCROLL_CONTAINER_SELECTOR)
  ).some((element) => element.scrollTop > CONSOLE_NAV_SCROLL_THRESHOLD)
}

function isConsoleNavScrollRoute(pathname: string) {
  return (
    isDashboardNavRoute(pathname) ||
    isPricingNavRoute(pathname) ||
    isRankingsNavRoute(pathname) ||
    pathname === '/system-settings' ||
    pathname.startsWith('/system-settings/')
  )
}

function isDashboardNavRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
}

function isPricingNavRoute(pathname: string) {
  return pathname === '/pricing' || pathname.startsWith('/pricing/')
}

function isRankingsNavRoute(pathname: string) {
  return pathname === '/rankings' || pathname.startsWith('/rankings/')
}

function HomeBrand() {
  const { t } = useTranslation()
  const { logo, systemName } = useSystemConfig()

  return (
    <Link
      to='/'
      aria-label={t('Go to home')}
      data-pong-collider='true'
      className='text-foreground pointer-events-auto fixed top-4 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-3.5 bg-transparent transition-transform hover:-translate-y-0.5 sm:top-5 sm:left-5 sm:max-w-[24rem] sm:gap-4'
    >
      <span className='flex size-16 shrink-0 items-center justify-center bg-transparent sm:size-20'>
        <img
          src={logo}
          alt={t('Logo')}
          className='size-full object-contain'
          draggable={false}
        />
      </span>
      <span className='truncate text-2xl font-black tracking-normal drop-shadow-[0_1px_8px_color-mix(in_oklch,var(--background)_65%,transparent)] sm:text-3xl'>
        {systemName}
      </span>
    </Link>
  )
}

const Tab = ({
  children,
  link,
  isActive,
  onClick,
  setPosition,
}: {
  children: ReactNode
  link: ReturnType<typeof useTopNavLinks>[number]
  isActive: boolean
  onClick: (
    event: MouseEvent<HTMLAnchorElement>,
    link: ReturnType<typeof useTopNavLinks>[number]
  ) => void
  setPosition: Dispatch<SetStateAction<NavCursorPosition>>
}) => {
  const ref = useRef<HTMLLIElement>(null)

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (link.disabled) return
        if (!ref.current) return

        const { width } = ref.current.getBoundingClientRect()
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        })
      }}
      className={cn(
        'text-foreground relative z-10 block shrink-0 rounded-full px-3 py-1.5 text-xs font-black whitespace-nowrap uppercase transition-colors md:mx-1 md:px-5 md:py-3 md:text-base lg:order-none',
        isActive ? 'order-1' : 'order-4',
        isActive &&
          'bg-foreground text-background hover:text-background shadow-sm',
        !isActive &&
          !link.disabled &&
          'hover:bg-foreground/10 hover:text-foreground dark:hover:bg-foreground/15',
        link.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      )}
    >
      {link.external ? (
        <a
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          aria-disabled={link.disabled}
          tabIndex={link.disabled ? -1 : undefined}
          onClick={(event) => onClick(event, link)}
        >
          {children}
        </a>
      ) : (
        <Link
          to={link.href}
          disabled={link.disabled}
          aria-current={isActive ? 'page' : undefined}
          onClick={(event) => onClick(event, link)}
        >
          {children}
        </Link>
      )}
    </li>
  )
}

function isNavLinkActive(pathname: string, href: string) {
  if (!href.startsWith('/')) return false

  const linkPath = href.split(/[?#]/)[0] || '/'
  if (linkPath === '/') return pathname === '/'

  return pathname === linkPath || pathname.startsWith(`${linkPath}/`)
}

const Cursor = ({ position }: { position: NavCursorPosition }) => (
  <motion.li
    animate={position}
    className='bg-foreground/10 ring-foreground/10 dark:bg-foreground/18 dark:ring-foreground/15 absolute z-0 h-7 rounded-full ring-1 md:h-12'
  />
)
