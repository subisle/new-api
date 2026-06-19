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
import { useEffect, useMemo, useState } from 'react'
import type { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fireConfetti } from '@/registry/magicui/confetti-utils'
import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/dialog'
import { PasswordInput } from '@/components/password-input'
import { Turnstile } from '@/components/turnstile'
import { register, wechatLoginByCode } from '@/features/auth/api'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { RedemptionDialog } from '@/features/auth/components/redemption-dialog'
import { registerFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [wechatCode, setWeChatCode] = useState('')
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const [isRedemptionDialogOpen, setIsRedemptionDialogOpen] = useState(false)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')

  const { status } = useStatus()
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const { redirectToLogin, handleLoginSuccess } = useAuthRedirect()
  const {
    isSending: isSendingCode,
    secondsLeft,
    isActive,
    sendCode,
  } = useEmailVerification({
    turnstileToken,
    validateTurnstile,
  })

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const emailValue = form.watch('email')
  const passwordValue = form.watch('password')
  const emailVerificationRequired = !!status?.email_verification
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const oauthRegisterEnabled =
    status?.oauth_register_enabled ??
    status?.data?.oauth_register_enabled ??
    true
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const requireRedemption = Boolean(
    status?.require_redemption_for_oauth ??
      status?.data?.require_redemption_for_oauth
  )
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)

  const wechatQrCodeUrl = useMemo(() => {
    return (
      status?.wechat_qrcode ||
      status?.wechat_qr_code ||
      status?.wechat_qrcode_image_url ||
      status?.wechat_qr_code_image_url ||
      status?.wechat_account_qrcode_image_url ||
      status?.WeChatAccountQRCodeImageURL ||
      status?.data?.wechat_qrcode ||
      status?.data?.WeChatAccountQRCodeImageURL ||
      ''
    )
  }, [status])

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get('aff')?.trim()
    if (aff) {
      saveAffiliateCode(aff)
    }
  }, [])

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    // Validate email verification if required
    if (emailVerificationRequired) {
      if (!data.email) {
        toast.error(t('Please enter your email'))
        return
      }
      if (!verificationCode) {
        toast.error(t('Please enter the verification code'))
        return
      }
    }

    if (!validateTurnstile()) return

    setIsLoading(true)
    try {
      const res = await register({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        verification_code: verificationCode || undefined,
        aff_code: getAffiliateCode(),
        turnstile: turnstileToken,
      })

      if (res?.success) {
        // 如果后端返回 pending_redemption，弹出兑换码窗口
        if ((res as unknown as { pending_redemption?: boolean }).pending_redemption) {
          setIsRedemptionDialogOpen(true)
          return
        }
        fireConfetti()
        toast.success(t('Account created! Please sign in'))
        redirectToLogin()
      } else {
        toast.error(res?.message || t('Failed to create account'))
      }
    } catch (_error) {
      // Errors are handled by global interceptor
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendVerificationCode() {
    await sendCode(emailValue || '')
  }

  const handleOpenWeChatDialog = () => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    setIsWeChatDialogOpen(true)
  }

  const handleWeChatDialogChange = (open: boolean) => {
    setIsWeChatDialogOpen(open)
    if (!open) {
      setWeChatCode('')
      setIsWeChatSubmitting(false)
    }
  }

  async function handleWeChatLogin() {
    if (!wechatCode.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(wechatCode)
      if (res?.success) {
        fireConfetti()
        await handleLoginSuccess(res.data as { id?: number } | null)
        toast.success(t('Signed in via WeChat'))
        handleWeChatDialogChange(false)
      } else {
        toast.error(res?.message || t('Login failed'))
      }
    } catch (_error) {
      toast.error(t('Login failed'))
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        {/* Username Field */}
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-foreground text-sm font-medium'>
                {t('Username')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('Enter your username')}
                  data-pong-collider='true'
                  className='bg-background/80 mt-1.5 h-10 rounded-md px-3 shadow-xs'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-foreground text-sm font-medium'>
                {t('Password')}
              </FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t('Enter password (8-20 characters)')}
                  data-pong-collider='true'
                  className='[&_input]:bg-background/80 mt-1.5 [&_input]:h-10 [&_input]:rounded-md [&_input]:px-3 [&_input]:shadow-xs'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-foreground text-sm font-medium'>
                {t('Confirm password')}
              </FormLabel>
              <FormControl>
                <AssistedPasswordConfirmation
                  password={passwordValue}
                  placeholder={t('Confirm password')}
                  data-pong-collider='true'
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Verification Section */}
        {emailVerificationRequired && (
          <>
            {/* Email Field */}
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-foreground text-sm font-medium'>
                    {t('Email (required for verification)')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('name@example.com')}
                      type='email'
                      data-pong-collider='true'
                      className='bg-background/80 mt-1.5 h-10 rounded-md px-3 shadow-xs'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Code Field */}
            <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'>
              <div className='min-w-0'>
                <Input
                  placeholder={t('Verification code')}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  data-pong-collider='true'
                  className='bg-background/80 h-10 rounded-md px-3 shadow-xs'
                />
              </div>
              <Button
                variant='outline'
                type='button'
                data-pong-collider='true'
                className='h-10 w-full justify-center rounded-md px-3 whitespace-nowrap shadow-xs sm:w-auto'
                disabled={
                  isLoading ||
                  isSendingCode ||
                  isActive ||
                  !emailValue ||
                  !turnstileReady
                }
                onClick={handleSendVerificationCode}
              >
                {isActive ? (
                  t('Resend ({{seconds}}s)', { seconds: secondsLeft })
                ) : isSendingCode ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  t('Send code')
                )}
              </Button>
            </div>
          </>
        )}

        {/* Turnstile */}
        {isTurnstileEnabled && (
          <div data-pong-collider='true' className='mt-2 flex justify-center'>
            <Turnstile
              key={resolvedTheme}
              siteKey={turnstileSiteKey}
              onVerify={setTurnstileToken}
              theme={resolvedTheme}
            />
          </div>
        )}

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          data-pong-collider='true'
          className='bg-muted/45 mt-0 rounded-md'
        />

        {/* Submit Button */}
        <Button
          type='submit'
          data-pong-collider='true'
          className='mt-1 h-10 w-full justify-center gap-2 rounded-md shadow-xs'
          disabled={
            isLoading ||
            (requiresLegalConsent && !agreedToLegal) ||
            !turnstileReady
          }
        >
          {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          {t('Create account')}
        </Button>

        {oauthRegisterEnabled && (
          <OAuthProviders
            status={status}
            disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
            onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
            isWeChatLoading={isWeChatSubmitting}
            withPongCollider
            className='mt-3'
            buttonClassName='h-10 rounded-md shadow-xs'
          />
        )}
      </form>

      {hasWeChatLogin && (
        <Dialog
          open={isWeChatDialogOpen}
          onOpenChange={handleWeChatDialogChange}
          title={t('WeChat sign in')}
          description={t(
            'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
          )}
          contentClassName='max-w-sm'
          headerClassName='text-left'
          contentHeight='auto'
          bodyClassName='space-y-4'
          footer={
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleWeChatDialogChange(false)}
                disabled={isWeChatSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleWeChatLogin}
                disabled={
                  isWeChatSubmitting ||
                  !wechatCode.trim() ||
                  (requiresLegalConsent && !agreedToLegal)
                }
                className='gap-2'
              >
                {isWeChatSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {t('Confirm')}
              </Button>
            </>
          }
        >
          {wechatQrCodeUrl ? (
            <div className='flex justify-center'>
              <img
                src={wechatQrCodeUrl}
                alt={t('WeChat login QR code')}
                className='h-40 w-40 rounded-md border object-contain'
              />
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('QR code is not configured. Please contact support.')}
            </p>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
            <Input
              id='wechat-code'
              placeholder={t('Enter the verification code')}
              value={wechatCode}
              onChange={(event) => setWeChatCode(event.target.value)}
              autoComplete='one-time-code'
            />
          </div>
        </Dialog>
      )}

      {/* Redemption code dialog for new user registration */}
      <RedemptionDialog
        open={isRedemptionDialogOpen}
        onOpenChange={setIsRedemptionDialogOpen}
        title={t('Enter Redemption Code')}
        description={t(
          'Please enter the redemption code provided by the administrator to complete your registration'
        )}
        onSuccess={() => {
          setIsRedemptionDialogOpen(false)
          fireConfetti()
          toast.success(t('Account created! Please sign in'))
          redirectToLogin()
        }}
      />
    </Form>
  )
}

function AssistedPasswordConfirmation({
  password,
  placeholder,
  value,
  onChange,
  onBlur,
  name,
  'data-pong-collider': dataPongCollider,
}: {
  password: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  'data-pong-collider'?: string
}) {
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (!shake) return

    const timer = window.setTimeout(() => setShake(false), 500)
    return () => window.clearTimeout(timer)
  }, [shake])

  const handleConfirmPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      password &&
      value.length >= password.length &&
      event.target.value.length > value.length
    ) {
      setShake(true)
      return
    }

    onChange(event.target.value)
  }

  const getLetterStatus = (letter: string, index: number) => {
    if (!value[index]) return ''
    return value[index] === letter ? 'bg-primary/20' : 'bg-destructive/20'
  }

  const passwordsMatch = Boolean(password) && password === value
  const passwordSlots = password || value

  return (
    <motion.div
      data-pong-collider={dataPongCollider}
      className='bg-background/80 relative mt-1.5 rounded-md'
      animate={{
        x: shake ? [-10, 10, -10, 10, 0] : 0,
      }}
      transition={{ duration: 0.3 }}
    >
      <div className='pointer-events-none absolute inset-px z-0 overflow-hidden rounded-[calc(var(--radius-md)-1px)]'>
        <div className='absolute inset-y-0 left-3 flex h-full items-center justify-start'>
          {passwordSlots.split('').map((letter, index) => (
            <motion.div
              key={`${letter}-${index}`}
              className={cn(
                'absolute h-full w-4 transition-all duration-300',
                getLetterStatus(letter, index)
              )}
              style={{
                left: `${index * 16}px`,
                scaleX: value[index] ? 1 : 0,
                transformOrigin: 'left',
              }}
            />
          ))}
        </div>
      </div>

      <Input
        name={name}
        type='password'
        placeholder={placeholder}
        value={value}
        onChange={handleConfirmPasswordChange}
        onBlur={onBlur}
        className={cn(
          'relative z-10 h-10 rounded-md bg-transparent px-3 shadow-xs',
          passwordsMatch && 'border-primary focus-visible:border-primary'
        )}
      />
    </motion.div>
  )
}
