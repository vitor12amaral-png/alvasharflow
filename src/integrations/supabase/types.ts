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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_library: {
        Row: {
          category: Database["public"]["Enums"]["library_category"]
          client_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["library_category"]
          client_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: Database["public"]["Enums"]["library_category"]
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_library_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          payment_day: number | null
          price: number
          size: Database["public"]["Enums"]["package_size"]
          start_date: string
          status: Database["public"]["Enums"]["package_status"]
          total_videos: number
          updated_at: string
          videos_used: number
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          price?: number
          size?: Database["public"]["Enums"]["package_size"]
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_videos?: number
          updated_at?: string
          videos_used?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          price?: number
          size?: Database["public"]["Enums"]["package_size"]
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_videos?: number
          updated_at?: string
          videos_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand_colors: Json | null
          brand_fonts: Json | null
          brand_references: Json | null
          company: string | null
          created_at: string
          delivery_link: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_references?: Json | null
          company?: string | null
          created_at?: string
          delivery_link?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_references?: Json | null
          company?: string | null
          created_at?: string
          delivery_link?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["delivery_method"]
            | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_files: {
        Row: {
          created_at: string
          file_type: string | null
          id: string
          name: string
          size_bytes: number | null
          url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          id?: string
          name: string
          size_bytes?: number | null
          url: string
          video_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          id?: string
          name?: string
          size_bytes?: number | null
          url?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_files_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          checklist: Json
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          editor_id: string | null
          estimated_hours: number | null
          final_file_link: string | null
          id: string
          package_id: string | null
          position: number
          priority: Database["public"]["Enums"]["video_priority"]
          raw_files_link: string | null
          status: Database["public"]["Enums"]["video_status"]
          title: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          editor_id?: string | null
          estimated_hours?: number | null
          final_file_link?: string | null
          id?: string
          package_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["video_priority"]
          raw_files_link?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          title: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          editor_id?: string | null
          estimated_hours?: number | null
          final_file_link?: string | null
          id?: string
          package_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["video_priority"]
          raw_files_link?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "editor"
      delivery_method: "drive" | "dropbox" | "wetransfer" | "upload_interno"
      invoice_status: "pending" | "paid" | "overdue"
      library_category:
        | "bruto"
        | "exportado"
        | "logo"
        | "fonte"
        | "musica"
        | "lut"
        | "documento"
      package_size: "p10" | "p20" | "p30" | "custom"
      package_status: "ativo" | "expirado" | "renovado" | "cancelado"
      video_priority: "baixa" | "media" | "alta" | "urgente"
      video_status:
        | "recebido"
        | "briefing"
        | "organizacao"
        | "fila"
        | "editando"
        | "revisao"
        | "aguardando_cliente"
        | "alteracoes"
        | "aprovado"
        | "entregue"
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
      app_role: ["admin", "client", "editor"],
      delivery_method: ["drive", "dropbox", "wetransfer", "upload_interno"],
      invoice_status: ["pending", "paid", "overdue"],
      library_category: [
        "bruto",
        "exportado",
        "logo",
        "fonte",
        "musica",
        "lut",
        "documento",
      ],
      package_size: ["p10", "p20", "p30", "custom"],
      package_status: ["ativo", "expirado", "renovado", "cancelado"],
      video_priority: ["baixa", "media", "alta", "urgente"],
      video_status: [
        "recebido",
        "briefing",
        "organizacao",
        "fila",
        "editando",
        "revisao",
        "aguardando_cliente",
        "alteracoes",
        "aprovado",
        "entregue",
      ],
    },
  },
} as const
