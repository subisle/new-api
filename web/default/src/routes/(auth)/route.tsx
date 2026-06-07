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
import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import {
  SignInCard2,
  type SignInCard2Mode,
} from '@/components/ui/sign-in-card-2'
import { SignupLogo } from '@/components/ui/signup'
import { AuthLayout } from '@/features/auth/auth-layout'
import { TermsFooter } from '@/features/auth/components/terms-footer'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { SignUpForm } from '@/features/auth/sign-up/components/sign-up-form'

type AuthMode = SignInCard2Mode

function AuthRouteLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isEntryPage = pathname === '/sign-in' || pathname === '/sign-up'
  const initialMode: AuthMode = pathname === '/sign-up' ? 'sign-up' : 'sign-in'

  return (
    <AuthLayout>
      {isEntryPage ? <AuthEntryPage initialMode={initialMode} /> : <Outlet />}
    </AuthLayout>
  )
}

function AuthEntryPage({ initialMode }: { initialMode: AuthMode }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { logo, systemName } = useSystemConfig()
  const [modeState, setModeState] = useState({
    routeMode: initialMode,
    selectedMode: initialMode,
  })
  const search = useRouterState({
    select: (state) => state.location.search as { redirect?: string },
  })
  const redirectTo =
    typeof search.redirect === 'string' ? search.redirect : undefined
  const mode =
    modeState.routeMode === initialMode ? modeState.selectedMode : initialMode

  return (
    <div className='flex w-full flex-col items-center'>
      <SignInCard2
        logo={
          <SignupLogo
            src={logo}
            className='size-full object-contain'
            aria-hidden='true'
          />
        }
        mode={mode}
        onModeChange={(nextMode) =>
          setModeState({ routeMode: initialMode, selectedMode: nextMode })
        }
        signInLabel={t('Sign in')}
        signUpLabel={t('Sign up')}
        title={systemName}
      >
        {mode === 'sign-in' ? (
          <div className='w-full'>
            <UserAuthForm redirectTo={redirectTo} />
            <TermsFooter
              variant='sign-in'
              status={status}
              className='text-muted-foreground [&_a]:text-primary mt-6 text-center [&_a]:underline'
            />
          </div>
        ) : (
          <div className='w-full space-y-6'>
            <SignUpForm />
            <TermsFooter
              variant='sign-up'
              status={status}
              className='text-center'
            />
          </div>
        )}
      </SignInCard2>
    </div>
  )
}

export const Route = createFileRoute('/(auth)')({
  component: AuthRouteLayout,
})
