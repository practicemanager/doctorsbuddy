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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          provider_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          provider_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_type"]
          created_at: string
          error_message: string | null
          id: string
          patient_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          patient_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          campaign_id?: string
          channel?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          error_message?: string | null
          id?: string
          patient_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_filter: Json | null
          clinic_id: string
          content: string | null
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          clinic_id: string
          content?: string | null
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          clinic_id?: string
          content?: string | null
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          google_maps_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          clinic_id: string
          created_at: string
          description: string
          expense_date: string
          gst_amount: number | null
          gst_rate: number
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          category?: string
          clinic_id: string
          created_at?: string
          description: string
          expense_date?: string
          gst_amount?: number | null
          gst_rate?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          clinic_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          gst_amount?: number | null
          gst_rate?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          clinic_id: string
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          id: string
          min_stock_level: number
          name: string
          notes: string | null
          quantity: number
          sku: string | null
          supplier_name: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          clinic_id: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          min_stock_level?: number
          name: string
          notes?: string | null
          quantity?: number
          sku?: string | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          clinic_id?: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          min_stock_level?: number
          name?: string
          notes?: string | null
          quantity?: number
          sku?: string | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          performed_by: string | null
          quantity_changed: number
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          treatment_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          performed_by?: string | null
          quantity_changed: number
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          treatment_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          performed_by?: string | null
          quantity_changed?: number
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "tooth_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          appointment_id: string | null
          clinic_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          clinic_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          clinic_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          clinic_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clinic_id: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tokens: {
        Row: {
          called_at: string | null
          clinic_id: string
          completed_at: string | null
          counter_number: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["queue_priority"]
          provider_id: string | null
          queue_date: string
          status: Database["public"]["Enums"]["queue_status"]
          token_number: number
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          clinic_id: string
          completed_at?: string | null
          counter_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["queue_priority"]
          provider_id?: string | null
          queue_date?: string
          status?: Database["public"]["Enums"]["queue_status"]
          token_number: number
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          counter_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["queue_priority"]
          provider_id?: string | null
          queue_date?: string
          status?: Database["public"]["Enums"]["queue_status"]
          token_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_tokens_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_conditions: {
        Row: {
          condition_name: string
          created_at: string
          diagnosed_at: string | null
          id: string
          notes: string | null
          severity: string | null
          tooth_record_id: string
        }
        Insert: {
          condition_name: string
          created_at?: string
          diagnosed_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          tooth_record_id: string
        }
        Update: {
          condition_name?: string
          created_at?: string
          diagnosed_at?: string | null
          id?: string
          notes?: string | null
          severity?: string | null
          tooth_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_conditions_tooth_record_id_fkey"
            columns: ["tooth_record_id"]
            isOneToOne: false
            referencedRelation: "tooth_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_records: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["tooth_status"]
          tooth_number: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_number: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_treatments: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          status: Database["public"]["Enums"]["treatment_status"]
          tooth_record_id: string
          treatment_name: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          status?: Database["public"]["Enums"]["treatment_status"]
          tooth_record_id: string
          treatment_name: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          status?: Database["public"]["Enums"]["treatment_status"]
          tooth_record_id?: string
          treatment_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_treatments_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_treatments_tooth_record_id_fkey"
            columns: ["tooth_record_id"]
            isOneToOne: false
            referencedRelation: "tooth_records"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_material_mappings: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          inventory_item_id: string
          quantity_needed: number
          treatment_name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity_needed?: number
          treatment_name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity_needed?: number
          treatment_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_material_mappings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_material_mappings_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_pricing: {
        Row: {
          base_price: number
          clinic_id: string
          created_at: string
          doctor_fee: number
          id: string
          lab_cost: number
          material_cost: number
          notes: string | null
          other_cost: number
          treatment_name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          clinic_id: string
          created_at?: string
          doctor_fee?: number
          id?: string
          lab_cost?: number
          material_cost?: number
          notes?: string | null
          other_cost?: number
          treatment_name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          clinic_id?: string
          created_at?: string
          doctor_fee?: number
          id?: string
          lab_cost?: number
          material_cost?: number
          notes?: string | null
          other_cost?: number
          treatment_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_pricing_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          clinic_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          clinic_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          clinic_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_clinic_and_link: {
        Args: { p_address?: string; p_name: string; p_phone?: string }
        Returns: string
      }
      deduct_inventory: {
        Args: {
          p_item_id: string
          p_performed_by?: string
          p_quantity: number
          p_treatment_id?: string
        }
        Returns: undefined
      }
      get_next_token_number: {
        Args: { p_clinic_id: string; p_date?: string }
        Returns: number
      }
      get_user_clinic_id: { Args: never; Returns: string }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      campaign_status: "draft" | "scheduled" | "sending" | "sent" | "cancelled"
      campaign_type: "email" | "whatsapp" | "sms"
      inventory_transaction_type:
        | "restock"
        | "usage"
        | "adjustment"
        | "expired"
        | "treatment_deduction"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      message_status: "pending" | "sent" | "delivered" | "failed"
      queue_priority: "normal" | "urgent" | "emergency"
      queue_status:
        | "waiting"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      tooth_status:
        | "healthy"
        | "decayed"
        | "missing"
        | "treated"
        | "needs_treatment"
        | "under_observation"
        | "restored"
      treatment_status: "planned" | "in_progress" | "completed" | "cancelled"
      user_role:
        | "owner"
        | "dentist"
        | "hygienist"
        | "receptionist"
        | "assistant"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      campaign_status: ["draft", "scheduled", "sending", "sent", "cancelled"],
      campaign_type: ["email", "whatsapp", "sms"],
      inventory_transaction_type: [
        "restock",
        "usage",
        "adjustment",
        "expired",
        "treatment_deduction",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      message_status: ["pending", "sent", "delivered", "failed"],
      queue_priority: ["normal", "urgent", "emergency"],
      queue_status: [
        "waiting",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      tooth_status: [
        "healthy",
        "decayed",
        "missing",
        "treated",
        "needs_treatment",
        "under_observation",
        "restored",
      ],
      treatment_status: ["planned", "in_progress", "completed", "cancelled"],
      user_role: ["owner", "dentist", "hygienist", "receptionist", "assistant"],
    },
  },
} as const
