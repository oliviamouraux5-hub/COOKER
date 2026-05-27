'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FridgeItem {
  id: string
  user_id?: string
  name: string
  quantity: string
  category: string // Produce, Proteins, Dairy, Pantry
  needs_restock: boolean
  created_at?: string
}

export interface FridgeSnapshot {
  user_id?: string
  photo_base64: string
  updated_at?: string
}

/**
 * Fetches all custom fridge items saved in Supabase for the current user.
 */
export async function getFridgeItems(): Promise<{ items: FridgeItem[], error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { items: [], error: 'Not authenticated' }
    }
    
    const { data, error } = await supabase
      .from('fridge_items')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { items: [], migrationNeeded: true }
      }
      throw error
    }
    
    return { items: data || [] }
  } catch (err: any) {
    console.error('Error fetching fridge items:', err)
    return { items: [], error: err.message }
  }
}

/**
 * Saves a new custom ingredient to the user's permanent fridge inventory.
 */
export async function addFridgeItem(name: string, category: string, quantity: string = 'to taste'): Promise<{ item: FridgeItem | null, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { item: null, error: 'Not authenticated' }
    }
    
    const { data, error } = await supabase
      .from('fridge_items')
      .insert([{ user_id: user.id, name, category, quantity, needs_restock: false }])
      .select()
      .single()
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { item: null, migrationNeeded: true }
      }
      throw error
    }
    
    return { item: data }
  } catch (err: any) {
    console.error('Error adding fridge item:', err)
    return { item: null, error: err.message }
  }
}

/**
 * Toggles the needs_restock status of a custom fridge ingredient.
 */
export async function toggleRestockItem(id: string, needsRestock: boolean): Promise<{ success: boolean, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { error } = await supabase
      .from('fridge_items')
      .update({ needs_restock: needsRestock })
      .eq('id', id)
      .eq('user_id', user.id)
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { success: false, migrationNeeded: true }
      }
      throw error
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Error toggling restock item:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Removes a custom ingredient from the user's permanent fridge inventory.
 */
export async function deleteFridgeItem(id: string): Promise<{ success: boolean, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { error } = await supabase
      .from('fridge_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { success: false, migrationNeeded: true }
      }
      throw error
    }
    
    revalidatePath('/dashboard')
    revalidatePath('/recipes')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting fridge item:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Fetches the user's latest physical weekly fridge snapshot photo (base64).
 */
export async function getFridgeSnapshot(): Promise<{ snapshot: FridgeSnapshot | null, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { snapshot: null, error: 'Not authenticated' }
    }
    
    const { data, error } = await supabase
      .from('fridge_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { snapshot: null, migrationNeeded: true }
      }
      throw error
    }
    
    return { snapshot: data }
  } catch (err: any) {
    console.error('Error fetching fridge snapshot:', err)
    return { snapshot: null, error: err.message }
  }
}

/**
 * Saves a weekly base64 snapshot of the user's real-world fridge interior.
 */
export async function saveFridgeSnapshot(photoBase64: string): Promise<{ success: boolean, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { error } = await supabase
      .from('fridge_snapshots')
      .upsert({
        user_id: user.id,
        photo_base64: photoBase64,
        updated_at: new Date().toISOString()
      })
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { success: false, migrationNeeded: true }
      }
      throw error
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Error saving fridge snapshot:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Removes all custom ingredients from the user's fridge inventory.
 */
export async function clearAllFridgeItems(): Promise<{ success: boolean, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { error } = await supabase
      .from('fridge_items')
      .delete()
      .eq('user_id', user.id)
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { success: false, migrationNeeded: true }
      }
      throw error
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Error clearing fridge items:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Removes only cold cabinet ingredients (Produce, Proteins, Dairy) from the user's fridge inventory,
 * leaving their dry Pantry closet staples completely untouched.
 */
export async function clearColdFridgeCategories(): Promise<{ success: boolean, error?: string, migrationNeeded?: boolean }> {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { error } = await supabase
      .from('fridge_items')
      .delete()
      .eq('user_id', user.id)
      .in('category', ['Produce', 'Proteins', 'Dairy'])
      
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { success: false, migrationNeeded: true }
      }
      throw error
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Error clearing cold fridge items:', err)
    return { success: false, error: err.message }
  }
}
