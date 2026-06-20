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
import { api } from '@/lib/api'

interface PreOAuthRedemptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (redemptionCode: string) => void
  providerName: string
}

export function PreOAuthRedemptionDialog({
  open,
  onOpenChange,
  onSuccess,
  providerName,
}: PreOAuthRedemptionDialogProps) {
  const { t } = useTranslation()
  const [redemptionCode, setRedemptionCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setRedemptionCode('')
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!redemptionCode.trim()) {
      toast.error(t('Please enter redemption code'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/api/redemption/validate', {
        redemption_code: redemptionCode.trim(),
      })

      if (response.data?.success) {
        toast.success(t('Redemption code verified'))
        onSuccess(redemptionCode.trim())
        setRedemptionCode('')
      } else {
        toast.error(response.data?.message || t('Invalid redemption code'))
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('Validation failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Please enter redemption code')}</DialogTitle>
          <DialogDescription>
            {t('New user registration requires a redemption code. Please enter the code provided by the administrator to continue {{provider}} login.', {
              provider: providerName,
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pre-oauth-redemption-code">{t('Redemption Code')}</Label>
              <Input
                id="pre-oauth-redemption-code"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value)}
                placeholder={t('Please enter redemption code')}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('Close')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Verify and continue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
