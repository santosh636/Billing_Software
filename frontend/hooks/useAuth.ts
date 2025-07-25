// frontend/hooks/useAuth.ts

import { useState, useEffect } from 'react'
import { supabase } from '../services/SupabaseClient'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  user:    User | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser]     = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // 1) load initial session
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!isMounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    }
    loadSession()

    // 2) subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setUser((session as Session | null)?.user ?? null)
      setLoading(false)
    })

    // cleanup
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
