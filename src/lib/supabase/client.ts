import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  const supabaseUrl = 'https://fnppgjtxmzcigtgnfrbn.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucHBnanR4bXpjaWd0Z25mcmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjMwNjUsImV4cCI6MjA5MjQzOTA2NX0.tWKJTsQz9mfq5P8neNc2M65i_YsDY65GXDhJvZNV_js'

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}
