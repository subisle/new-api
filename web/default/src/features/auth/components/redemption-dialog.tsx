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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface RedemptionDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess: () => void
  /** Custom endpoint for completing registration. Defaults to /api/oauth/complete */
  endpoint?: string
  /** Custom title for the dialog */
  title?: string
  /** Custom description for the dialog */
  description?: string
}

export function RedemptionDialog({
  open,
  onOpenChange,
  onSuccess,
  endpoint = '/api/oauth/complete',
  title,
  description,
}: RedemptionDialogProps) {
  const { t } = useTranslation()
  const [redemptionCode, setRedemptionCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen)
    }
    if (!nextOpen) {
      setRedemptionCode('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!redemptionCode.trim()) {
      toast.error(t('Please enter a redemption code'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redemption_code: redemptionCode.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          data.message || t('Registration completed successfully!')
        )
        setRedemptionCode('')
        onSuccess()
      } else {
        toast.error(data.message || t('Invalid or expired redemption code'))
      }
    } catch (error) {
      toast.error(t('An error occurred. Please try again'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange ? handleChange : () => {}}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {title || t('Enter Redemption Code')}
          </DialogTitle>
          <DialogDescription>
            {description ||
              t(
                'Please enter the redemption code provided by the administrator to complete your registration'
              )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="redemption-code">{t('Redemption Code')}</Label>
              <Input
                id="redemption-code"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value)}
                placeholder={t('Enter your redemption code')}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            {onOpenChange && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleChange(false)}
                disabled={isSubmitting}
              >
                {t('Cancel')}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Complete Registration')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
