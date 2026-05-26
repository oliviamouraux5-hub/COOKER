export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          dietary_preferences: Json | null
          allergies: string[] | null
          created_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          dietary_preferences?: Json | null
          allergies?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          dietary_preferences?: Json | null
          allergies?: string[] | null
          created_at?: string | null
        }
      }
      recipes: {
        Row: {
          id: string
          user_id: string | null
          title: string
          ingredients: Json
          instructions: string[]
          image_url: string | null
          is_public: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          ingredients: Json
          instructions: string[]
          image_url?: string | null
          is_public?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          ingredients?: Json
          instructions?: string[]
          image_url?: string | null
          is_public?: boolean | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
