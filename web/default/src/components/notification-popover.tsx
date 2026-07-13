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
import type { TFunction } from 'i18next'
import { Bell, Megaphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { RichContent } from '@/components/rich-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnnouncementColorClass } from '@/lib/colors'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'

interface AnnouncementItem {
  id?: number | string
  type?: string
  content?: string
  extra?: string
  publishDate?: string | Date
}

type NotificationPopoverSize = 'default' | 'large'
type NotificationPopoverLayout = 'default' | 'horizontal'

interface NotificationPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unreadCount: number
  activeTab: 'notice' | 'announcements'
  onTabChange: (tab: 'notice' | 'announcements') => void
  notice: string
  announcements: AnnouncementItem[]
  loading: boolean
  className?: string
  size?: NotificationPopoverSize
  layout?: NotificationPopoverLayout
}

/**
 * Get relative time string from a date
 */
function getRelativeTime(publishDate: string | Date, t: TFunction): string {
  if (!publishDate) return ''

  const now = new Date()
  const pubDate = new Date(publishDate)

  // If invalid date, return original string
  if (Number.isNaN(pubDate.getTime())) {
    return typeof publishDate === 'string' ? publishDate : ''
  }

  const diffMs = now.getTime() - pubDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  // If future time, show specific date
  if (diffMs < 0) return formatDateTimeObject(pubDate)

  // Return relative time based on difference
  if (diffSeconds < 60) return t('Just now')
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('1 minute ago')
      : t('{{count}} minutes ago', { count: diffMinutes })
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? t('1 hour ago')
      : t('{{count}} hours ago', { count: diffHours })
  }
  if (diffDays < 7) {
    return diffDays === 1
      ? t('1 day ago')
      : t('{{count}} days ago', { count: diffDays })
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? t('1 week ago')
      : t('{{count}} weeks ago', { count: diffWeeks })
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('1 month ago')
      : t('{{count}} months ago', { count: diffMonths })
  }
  if (diffYears < 2) return t('1 year ago')

  // Over 2 years, show specific date
  return formatDateTimeObject(pubDate)
}

/**
 * Announcement status dot indicator
 */
function AnnouncementDot({ type }: { type?: string }) {
  return (
    <span
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        getAnnouncementColorClass(type)
      )}
    />
  )
}

function getAnnouncementRenderKey(announcement: AnnouncementItem): string {
  if (announcement.id !== undefined && announcement.id !== null) {
    return `id:${announcement.id}`
  }

  return JSON.stringify({
    content: announcement.content ?? '',
    extra: announcement.extra ?? '',
    publishDate: announcement.publishDate ?? '',
    type: announcement.type ?? '',
  })
}

/**
 * Empty state component
 */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <Empty className='min-h-48 border-0 p-4'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  )
}

function NotificationContentArea({
  children,
  size = 'default',
}: {
  children: React.ReactNode
  size?: NotificationPopoverSize
}) {
  return (
    <div
      className={cn(
        'overflow-y-auto pr-2',
        size === 'large' ? 'max-h-[min(46vh,24rem)]' : 'max-h-[min(42vh,22rem)]'
      )}
    >
      {children}
    </div>
  )
}

function NotificationItem({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className='py-2.5'>
      <div className='flex items-start gap-2.5'>
        {icon}
        <div className='flex min-w-0 flex-1 flex-col gap-1.5 text-sm leading-5'>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Notice tab content
 */
function NoticeContent({
  notice,
  loading,
  t,
  size = 'default',
}: {
  notice: string
  loading: boolean
  t: TFunction
  size?: NotificationPopoverSize
}) {
  if (loading) {
    return (
      <EmptyState
        icon={<Bell />}
        title={t('Loading...')}
        description={t('Latest platform updates and notices')}
      />
    )
  }

  if (!notice) {
    return (
      <EmptyState icon={<Bell />} title={t('No announcements at this time')} />
    )
  }

  return (
    <ScrollArea className='h-[min(52vh,28rem)] pr-3'>
      <RichContent breaks content={notice} />
    </ScrollArea>
  )
}

/**
 * Announcements tab content
 */
function AnnouncementsContent({
  announcements,
  loading,
  t,
  size = 'default',
}: {
  announcements: AnnouncementItem[]
  loading: boolean
  t: TFunction
  size?: NotificationPopoverSize
}) {
  if (loading) {
    return (
      <EmptyState
        icon={<Megaphone />}
        title={t('Loading...')}
        description={t('Latest platform updates and notices')}
      />
    )
  }

  if (announcements.length === 0) {
    return (
      <EmptyState icon={<Megaphone />} title={t('No system announcements')} />
    )
  }

  return (
    <NotificationContentArea size={size}>
      <div className='flex flex-col'>
        {announcements.map((item, idx) => {
          const announcementKey = getAnnouncementRenderKey(item)
          const publishDate = item.publishDate
            ? new Date(item.publishDate)
            : null
          const relativeTime = publishDate
            ? getRelativeTime(publishDate, t)
            : ''
          const absoluteTime = publishDate
            ? formatDateTimeObject(publishDate)
            : ''

          return (
            <div key={announcementKey}>
              <div className='py-3'>
                <div className='flex items-start gap-3'>
                  <AnnouncementDot type={item.type} />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <div className='text-sm'>
                      <RichContent breaks content={item.content || ''} />
                    </div>

                    {item.extra ? (
                      <div className='text-muted-foreground text-xs'>
                        <RichContent breaks content={item.extra} />
                      </div>
                    ) : null}

                    {absoluteTime ? (
                      <div className='text-muted-foreground text-xs'>
                        {relativeTime ? `${relativeTime} • ` : null}
                        {absoluteTime}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {absoluteTime ? (
                  <div className='text-muted-foreground text-xs leading-5'>
                    {relativeTime ? `${relativeTime} • ` : null}
                    {absoluteTime}
                  </div>
                ) : null}
              </NotificationItem>
              {idx < announcements.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </NotificationContentArea>
  )
}

/**
 * Notification popover with Notice and Announcements tabs
 */
export function NotificationPopover({
  open,
  onOpenChange,
  unreadCount,
  activeTab,
  onTabChange,
  notice,
  announcements,
  loading,
  className,
  size = 'default',
  layout = 'default',
}: NotificationPopoverProps) {
  const { t } = useTranslation()
  const isLarge = size === 'large'
  const isHorizontal = layout === 'horizontal'

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className={cn('relative size-9', className)}
            aria-label={t('Notifications')}
          />
        }
      >
        <Bell className='size-[1.2rem]' />
        {unreadCount > 0 ? (
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-semibold tabular-nums'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align={isHorizontal ? 'center' : 'end'}
        sideOffset={isHorizontal ? 12 : 8}
        positionerClassName={
          isHorizontal
            ? '!fixed !inset-x-0 !top-32 !transform-none flex justify-center px-3'
            : undefined
        }
        className={cn(
          'gap-2.5 p-2.5 shadow-xl',
          isHorizontal && 'sm:gap-3 sm:p-3',
          isLarge
            ? isHorizontal
              ? 'w-[min(40rem,calc(100vw-1.5rem))]'
              : 'w-[min(34rem,calc(100vw-1rem))]'
            : 'w-[min(24rem,calc(100vw-1rem))]'
        )}
      >
        <div className='flex items-start justify-between gap-3 px-1'>
          <PopoverHeader className='min-w-0 gap-1'>
            <PopoverTitle>{t('System Announcements')}</PopoverTitle>
            <p className='text-muted-foreground text-xs'>
              {t('Latest platform updates and notices')}
            </p>
          </PopoverHeader>
          <Button
            type='button'
            size='icon-sm'
            variant='ghost'
            className='-me-1 -mt-1'
            onClick={() => onOpenChange(false)}
            aria-label={t('Close')}
          >
            <X className='size-4' aria-hidden='true' />
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onTabChange as (value: string) => void}
          className={cn(
            isHorizontal &&
              'sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-start sm:gap-3'
          )}
        >
          <TabsList
            className={cn(
              'grid w-full grid-cols-2',
              isHorizontal &&
                'sm:flex sm:h-auto sm:flex-col sm:items-stretch sm:justify-start'
            )}
          >
            <TabsTrigger
              value='notice'
              className={cn(
                'gap-1.5',
                isHorizontal && 'sm:h-8 sm:flex-none sm:justify-start sm:px-2.5'
              )}
            >
              <Bell className='size-3.5' />
              {t('Notice')}
            </TabsTrigger>
            <TabsTrigger
              value='announcements'
              className={cn(
                'gap-1.5',
                isHorizontal && 'sm:h-8 sm:flex-none sm:justify-start sm:px-2.5'
              )}
            >
              <Megaphone className='size-3.5' />
              {t('Timeline')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='notice'
            className={cn('mt-2', isHorizontal && 'sm:mt-0 sm:min-w-0')}
          >
            <NoticeContent
              notice={notice}
              loading={loading}
              t={t}
              size={size}
            />
          </TabsContent>

          <TabsContent
            value='announcements'
            className={cn('mt-2', isHorizontal && 'sm:mt-0 sm:min-w-0')}
          >
            <AnnouncementsContent
              announcements={announcements}
              loading={loading}
              t={t}
              size={size}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
