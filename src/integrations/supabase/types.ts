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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      books: {
        Row: {
          contact_id: string
          created_at: string | null
          created_by: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_lists: {
        Row: {
          campaign_id: string
          list_id: string
        }
        Insert: {
          campaign_id: string
          list_id: string
        }
        Update: {
          campaign_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          blocks_json: Json | null
          created_at: string | null
          created_by: string | null
          from_email: string
          from_name: string
          html_content: string
          id: string
          name: string
          reply_to_email: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          blocks_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          from_email: string
          from_name: string
          html_content: string
          id?: string
          name: string
          reply_to_email?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          blocks_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          name?: string
          reply_to_email?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subject?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          created_at: string
          id: string
          max_amount: number | null
          milestone_bonus: number | null
          min_amount: number
          percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_amount?: number | null
          milestone_bonus?: number | null
          min_amount: number
          percentage: number
        }
        Update: {
          created_at?: string
          id?: string
          max_amount?: number | null
          milestone_bonus?: number | null
          min_amount?: number
          percentage?: number
        }
        Relationships: []
      }
      contact_activity: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_communications: {
        Row: {
          body: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          direction: string
          duration_seconds: number | null
          external_id: string | null
          id: string
          notes: string | null
          outcome: string | null
          status: string | null
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          direction: string
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          status?: string | null
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          duration_seconds?: number | null
          external_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          status?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_links: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          label: string | null
          link_type: string
          url: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          label?: string | null
          link_type: string
          url: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          label?: string | null
          link_type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          added_at: string | null
          contact_id: string
          list_id: string
        }
        Insert: {
          added_at?: string | null
          contact_id: string
          list_id: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          added_at: string | null
          contact_id: string
          tag_id: string
        }
        Insert: {
          added_at?: string | null
          contact_id: string
          tag_id: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          assigned_ae: string | null
          assigned_ae_text: string | null
          assigned_asc: string | null
          assigned_asc_text: string | null
          contact_type: string | null
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string | null
          id: string
          imprint_id: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_ae?: string | null
          assigned_ae_text?: string | null
          assigned_asc?: string | null
          assigned_asc_text?: string | null
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name?: string | null
          id?: string
          imprint_id?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_ae?: string | null
          assigned_ae_text?: string | null
          assigned_asc?: string | null
          assigned_asc_text?: string | null
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string | null
          id?: string
          imprint_id?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_ae_fkey"
            columns: ["assigned_ae"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_asc_fkey"
            columns: ["assigned_asc"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_imprint_id_fkey"
            columns: ["imprint_id"]
            isOneToOne: false
            referencedRelation: "imprints"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_asc: string | null
          closed_at: string | null
          commission_amount: number | null
          commission_locked: boolean
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          outreach_count: number
          stage: Database["public"]["Enums"]["deal_stage"]
          total_value: number | null
          updated_at: string
        }
        Insert: {
          assigned_asc?: string | null
          closed_at?: string | null
          commission_amount?: number | null
          commission_locked?: boolean
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          outreach_count?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          assigned_asc?: string | null
          closed_at?: string | null
          commission_amount?: number | null
          commission_locked?: boolean
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          outreach_count?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          email: string
          event_type: string
          id: string
          ip_address: string | null
          is_bot: boolean | null
          link_url: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          event_type: string
          id?: string
          ip_address?: string | null
          is_bot?: boolean | null
          link_url?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          is_bot?: boolean | null
          link_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_events_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_events_contact"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          campaign_id: string | null
          contact_first_name: string | null
          contact_id: string | null
          contact_last_name: string | null
          created_at: string | null
          email: string
          from_email: string | null
          from_name: string | null
          html_content: string | null
          id: string
          last_error: string | null
          processed_at: string | null
          reply_to_email: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id?: string | null
          contact_first_name?: string | null
          contact_id?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          email: string
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          reply_to_email?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string | null
          contact_first_name?: string | null
          contact_id?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          email?: string
          from_email?: string | null
          from_name?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          reply_to_email?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          column_mapping: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          errors: Json | null
          failed_rows: number | null
          file_data: string | null
          file_name: string
          file_path: string | null
          id: string
          processed_rows: number | null
          started_at: string | null
          status: string
          successful_rows: number | null
          total_rows: number | null
          warnings: Json | null
        }
        Insert: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          errors?: Json | null
          failed_rows?: number | null
          file_data?: string | null
          file_name: string
          file_path?: string | null
          id?: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          successful_rows?: number | null
          total_rows?: number | null
          warnings?: Json | null
        }
        Update: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          errors?: Json | null
          failed_rows?: number | null
          file_data?: string | null
          file_name?: string
          file_path?: string | null
          id?: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          successful_rows?: number | null
          total_rows?: number | null
          warnings?: Json | null
        }
        Relationships: []
      }
      imprints: {
        Row: {
          accent_color: string | null
          background_color: string | null
          body_font: string | null
          brand_voice: string | null
          created_at: string | null
          created_by: string | null
          footer_image_url: string | null
          from_email: string
          from_name: string
          header_image_url: string | null
          heading_font: string | null
          icon_url: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          reply_to_email: string | null
          secondary_color: string | null
          slug: string
          tagline: string | null
          text_color: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          body_font?: string | null
          brand_voice?: string | null
          created_at?: string | null
          created_by?: string | null
          footer_image_url?: string | null
          from_email: string
          from_name: string
          header_image_url?: string | null
          heading_font?: string | null
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          reply_to_email?: string | null
          secondary_color?: string | null
          slug: string
          tagline?: string | null
          text_color?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          body_font?: string | null
          brand_voice?: string | null
          created_at?: string | null
          created_by?: string | null
          footer_image_url?: string | null
          from_email?: string
          from_name?: string
          header_image_url?: string | null
          heading_font?: string | null
          icon_url?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          reply_to_email?: string | null
          secondary_color?: string | null
          slug?: string
          tagline?: string | null
          text_color?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      package_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          package_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          package_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          package_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_package: boolean
          min_price: number | null
          name: string
          retail_price: number | null
          sku: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_package?: boolean
          min_price?: number | null
          name: string
          retail_price?: number | null
          sku: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_package?: boolean
          min_price?: number | null
          name?: string
          retail_price?: number | null
          sku?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_content: string
          id: string
          name: string
          preview_text: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string
          id?: string
          name: string
          preview_text?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string
          id?: string
          name?: string
          preview_text?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_email_connections: {
        Row: {
          access_token: string
          created_at: string
          email: string
          id: string
          last_inbox_sync_at: string | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email: string
          id?: string
          last_inbox_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          id?: string
          last_inbox_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commission: {
        Args: { cumulative_sales: number; sale_amount: number }
        Returns: {
          commission: number
          milestone_bonus: number
          tier_percentage: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "super_admin" | "asc" | "ae"
      campaign_status: "draft" | "scheduled" | "sending" | "sent" | "failed"
      deal_stage:
        | "new"
        | "outreach"
        | "contacted"
        | "qualified"
        | "nurturing"
        | "proposal_sent"
        | "won"
        | "lost"
        | "not_interested"
      product_category: "format" | "bundle" | "package" | "service" | "add_on"
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
      app_role: ["admin", "member", "super_admin", "asc", "ae"],
      campaign_status: ["draft", "scheduled", "sending", "sent", "failed"],
      deal_stage: [
        "new",
        "outreach",
        "contacted",
        "qualified",
        "nurturing",
        "proposal_sent",
        "won",
        "lost",
        "not_interested",
      ],
      product_category: ["format", "bundle", "package", "service", "add_on"],
    },
  },
} as const
