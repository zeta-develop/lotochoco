import { beforeEach, describe, expect, it } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'
import { getNativeOAuthCode } from '../lib/supabase/oauth-callback'
import { clearPendingSaleRecovery } from '../store/pending-sale-recovery'
import { useAuthStore } from '../store/auth-store'
import { useSalesStore } from '../features/sales/store/sales.store'
import { useSettingsStore } from '../features/settings/store/settings.store'
import { usePOSStore } from '../store/pos-store'

const user = (id: string) => ({ id } as User)
const session = (id: string) => ({ user: user(id), access_token: 'test' } as Session)

beforeEach(() => {
  useAuthStore.getState().signOut()
  clearPendingSaleRecovery('a')
  clearPendingSaleRecovery('b')
})

describe('native OAuth trust boundary', () => {
  it('accepts only a code at the registered callback', () => {
    expect(getNativeOAuthCode('lotochoco://login?code=bound-code')).toBe('bound-code')
  })
  it.each([
    'lotochoco://login#access_token=attacker&refresh_token=attacker',
    'https://attacker.example/lotochoco://login?code=x',
    'https://project.supabase.co?code=x',
    'lotochoco://login.evil?code=x',
    'lotochoco://login/path?code=x',
    'lotochoco://attacker@login?code=x',
    'lotochoco://login?code=x&code=y',
    'lotochoco://login?code=x&error=denied',
    'lotochoco://login?code=',
    'invalid URL',
  ])('rejects untrusted or ambiguous callback %s', (url) => {
    expect(getNativeOAuthCode(url)).toBeNull()
  })
})

describe('account isolation', () => {
  function seedPrivateState() {
    useSalesStore.getState().setCart([{ id: 'private', amount: 9 } as never])
    useSettingsStore.getState().updateSetting('businessName', 'Private company')
    usePOSStore.getState().setGames([{ id: 'private' } as never])
  }
  function expectCleared() {
    expect(useSalesStore.getState().cart).toEqual([])
    expect(useSettingsStore.getState().settings.businessName).not.toBe('Private company')
    expect(usePOSStore.getState().games).toEqual([])
  }
  it('clears private state when a different account signs in', () => {
    useAuthStore.getState().setSession(session('a'))
    useAuthStore.getState().setCompanyId('company-a')
    seedPrivateState()
    useAuthStore.getState().setSession(session('b'))
    expectCleared()
    expect(useAuthStore.getState().selectedCompanyId).toBeNull()
    expect(useAuthStore.getState().user?.id).toBe('b')
  })
  it('preserves the current account cart during token refresh', () => {
    useAuthStore.getState().setSession(session('a'))
    useAuthStore.getState().setCompanyId('company-a')
    seedPrivateState()
    useAuthStore.getState().setSession(session('a'))
    expect(useSalesStore.getState().cart).toHaveLength(1)
    expect(useAuthStore.getState().selectedCompanyId).toBe('company-a')
  })
  it('blocks company switches while a sale is pending', () => {
    useAuthStore.getState().setSession(session('a'))
    useAuthStore.getState().setCompanyId('company-a')
    useSalesStore.setState({ pendingSale: { companyId: 'company-a', requestId: 'retry-id', items: [], client: '' } })
    useAuthStore.getState().setCompanyId('company-b')
    expect(useAuthStore.getState().selectedCompanyId).toBe('company-a')
    expect(useSalesStore.getState().pendingSale?.requestId).toBe('retry-id')
    useAuthStore.getState().signOut()
    expect(useSalesStore.getState().pendingSale).toBeNull()
  })
  it('recovers an uncertain sale only for the original authenticated account after session loss', () => {
    useAuthStore.getState().setSession(session('a'))
    useAuthStore.getState().setCompanyId('company-a')
    useSalesStore.setState({ pendingSale: { companyId: 'company-a', requestId: 'original-key', items: [], client: '' } })
    useAuthStore.getState().setSession(null)
    expect(useSalesStore.getState().pendingSale).toBeNull()
    useAuthStore.getState().setSession(session('b'))
    expect(useSalesStore.getState().pendingSale).toBeNull()
    useAuthStore.getState().setSession(session('a'))
    expect(useSalesStore.getState().pendingSale?.requestId).toBe('original-key')
    expect(useAuthStore.getState().selectedCompanyId).toBe('company-a')
  })
  it('clears on sign-out and company switch', () => {
    useAuthStore.getState().setSession(session('a'))
    useAuthStore.getState().setCompanyId('company-a')
    seedPrivateState()
    useAuthStore.getState().setCompanyId('company-b')
    expectCleared()
    seedPrivateState()
    useAuthStore.getState().setSession(null)
    expectCleared()
    expect(useAuthStore.getState().selectedCompanyId).toBeNull()
  })
})
