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
import { GradientMesh } from '@/components/ui/gradient-mesh'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh overflow-x-hidden bg-background lg:grid-cols-2'>
      <div className='flex min-h-svh min-w-0 flex-col gap-4 px-4 py-6 md:p-10'>
        <div className='flex min-w-0 flex-1 items-center justify-center py-6'>
          <div className='w-full min-w-0 max-w-[min(420px,calc(100vw-2rem))]'>
            {children}
          </div>
        </div>
      </div>

      <div className='relative hidden min-h-svh overflow-hidden bg-muted lg:block'>
        <GradientMesh
          colors={['#bcecf6', '#00aaff', '#ffd447']}
          distortion={8}
          swirl={0.2}
          speed={1}
          rotation={90}
          waveAmp={0.2}
          waveFreq={20}
          waveSpeed={0.2}
          grain={0.06}
        />
      </div>
    </div>
  )
}
