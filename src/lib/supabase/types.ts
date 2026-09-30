export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          amount: number
          autopay: boolean
          category: string | null
          created_at: string
          created_by: string | null
          due_date: string
          household_id: string
          id: string
          name: string
          notes: string | null
          paid_at: string | null
          payee: string | null
          repeat_every: number | null
          repeat_unit: string | null
        }
        Insert: {
          amount: number
          autopay?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          household_id: string
          id?: string
          name: string
          notes?: string | null
          paid_at?: string | null
          payee?: string | null
          repeat_every?: number | null
          repeat_unit?: string | null
        }
        Update: {
          amount?: number
          autopay?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          paid_at?: string | null
          payee?: string | null
          repeat_every?: number | null
          repeat_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          household_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          expense_id: string
          household_id: string
          share: number
          user_id: string
        }
        Insert: {
          expense_id: string
          household_id: string
          share: number
          user_id: string
        }
        Update: {
          expense_id?: string
          household_id?: string
          share?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_household_id_expense_id_fkey"
            columns: ["household_id", "expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bill_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          household_id: string
          id: string
          paid_by: string
          spent_on: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          household_id: string
          id?: string
          paid_by: string
          spent_on: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          household_id?: string
          id?: string
          paid_by?: string
          spent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_household_id_bill_id_fkey"
            columns: ["household_id", "bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: string | null
          created_at: string
          expires_on: string | null
          household_id: string
          id: string
          item_id: string | null
          kind: string
          mime: string
          name: string
          size: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          household_id: string
          id?: string
          item_id?: string | null
          kind: string
          mime: string
          name: string
          size: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_on?: string | null
          household_id?: string
          id?: string
          item_id?: string | null
          kind?: string
          mime?: string
          name?: string
          size?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_household_id_item_id_fkey"
            columns: ["household_id", "item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          household_id: string
          id: string
          is_private: boolean
          name: string
          next_date: string
          notes: string | null
          received_by: string
          repeat_every: number
          repeat_unit: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_private?: boolean
          name: string
          next_date: string
          notes?: string | null
          received_by?: string
          repeat_every: number
          repeat_unit: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_private?: boolean
          name?: string
          next_date?: string
          notes?: string | null
          received_by?: string
          repeat_every?: number
          repeat_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          household_id: string
          id: string
          is_private: boolean
          received_by: string
          received_on: string
          source_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          household_id: string
          id?: string
          is_private?: boolean
          received_by?: string
          received_on: string
          source_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          household_id?: string
          id?: string
          is_private?: boolean
          received_by?: string
          received_on?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_household_id_source_id_fkey"
            columns: ["household_id", "source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      items: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          price: number | null
          purchased_on: string | null
          serial_number: string | null
          warranty_expires_on: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          price?: number | null
          purchased_on?: string | null
          serial_number?: string | null
          warranty_expires_on?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          purchased_on?: string | null
          serial_number?: string | null
          warranty_expires_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          from_user: string
          household_id: string
          id: string
          settled_on: string
          to_user: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          from_user: string
          household_id: string
          id?: string
          settled_on: string
          to_user: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          from_user?: string
          household_id?: string
          id?: string
          settled_on?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          due_date: string
          household_id: string
          id: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          due_date: string
          household_id: string
          id?: string
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          due_date?: string
          household_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string
          household_id: string
          id: string
          item_id: string | null
          notes: string | null
          repeat_every: number | null
          repeat_unit: string | null
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          household_id: string
          id?: string
          item_id?: string | null
          notes?: string | null
          repeat_every?: number | null
          repeat_unit?: string | null
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          household_id?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          repeat_every?: number | null
          repeat_unit?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_household_id_assignee_id_fkey"
            columns: ["household_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["household_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_item_id_fkey"
            columns: ["household_id", "item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
    }
    Views: {
      member_balances: {
        Row: {
          balance: number | null
          household_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: {
        Args: { invite_token: string; member_name: string }
        Returns: string
      }
      complete_task: { Args: { task: string }; Returns: undefined }
      create_household: {
        Args: {
          household_currency?: string
          household_name: string
          member_name: string
        }
        Returns: string
      }
      delete_category: {
        Args: { p_id: string; p_move_to?: string }
        Returns: undefined
      }
      is_household_user: {
        Args: { hid: string; uid: string }
        Returns: boolean
      }
      is_member: { Args: { hid: string }; Returns: boolean }
      is_member_of_path: { Args: { path: string }; Returns: boolean }
      is_owner: { Args: { hid: string }; Returns: boolean }
      is_sole_member: { Args: { hid: string }; Returns: boolean }
      next_due: {
        Args: { due: string; every: number; today: string; unit: string }
        Returns: string
      }
      pay_bill: {
        Args: { p_amount?: number; p_bill: string; p_paid_by: string }
        Returns: string
      }
      receive_income: {
        Args: { p_amount?: number; p_source: string }
        Returns: string
      }
      rename_category: {
        Args: { p_id: string; p_name: string }
        Returns: undefined
      }
      save_expense: {
        Args: {
          p_amount: number
          p_bill?: string
          p_category: string
          p_description: string
          p_household: string
          p_id: string
          p_paid_by: string
          p_spent_on: string
          p_splits: Json
        }
        Returns: string
      }
      seed_default_categories: { Args: { hid: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
