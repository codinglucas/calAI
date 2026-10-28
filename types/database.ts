// Mirrors supabase/migrations. Regenerate after schema changes with
// `npm run db:types` (requires `npx supabase link` first).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          daily_calorie_goal: number;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          daily_calorie_goal?: number;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          daily_calorie_goal?: number;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          eaten_at: string;
          meal_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          eaten_at?: string;
          meal_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          eaten_at?: string;
          meal_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          name: string;
          grams: number;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          source: string;
          confidence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          name: string;
          grams: number;
          kcal: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          source?: string;
          confidence?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          name?: string;
          grams?: number;
          kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          source?: string;
          confidence?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_meal: {
        Args: { p_meal_type: string; p_eaten_at: string; p_items: Json };
        Returns: string;
      };
      update_meal: {
        Args: { p_meal_id: string; p_meal_type: string; p_eaten_at: string; p_items: Json };
        Returns: undefined;
      };
      is_valid_timezone: {
        Args: { tz: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
