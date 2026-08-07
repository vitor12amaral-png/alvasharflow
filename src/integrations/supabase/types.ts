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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
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
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          nps: number
          submitted_via: string
          video_id: string | null
          workspace_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          nps: number
          submitted_via?: string
          video_id?: string | null
          workspace_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          nps?: number
          submitted_via?: string
          video_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          author_id: string | null
          client_id: string
          created_at: string
          happened_at: string
          id: string
          kind: string
          notes: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          client_id: string
          created_at?: string
          happened_at?: string
          id?: string
          kind?: string
          notes: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          client_id?: string
          created_at?: string
          happened_at?: string
          id?: string
          kind?: string
          notes?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          is_favorite: boolean
          kind: string
          link_category: string | null
          name: string
          notes: string | null
          thumbnail_url: string | null
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["library_category"]
          client_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          link_category?: string | null
          name: string
          notes?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["library_category"]
          client_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          link_category?: string | null
          name?: string
          notes?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_library_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_library_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          revoked_at: string | null
          token: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand_colors: Json | null
          brand_fonts: Json | null
          brand_references: Json | null
          color: string | null
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
          parent_client_id: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_references?: Json | null
          color?: string | null
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
          parent_client_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          workspace_id: string
        }
        Update: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_references?: Json | null
          color?: string | null
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
          parent_client_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_parent_client_id_fkey"
            columns: ["parent_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          objective: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          objective?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content: {
        Row: {
          client_id: string | null
          content_type: Database["public"]["Enums"]["marketing_content_type"]
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          platform: string | null
          scheduled_for: string | null
          script_id: string | null
          status: Database["public"]["Enums"]["marketing_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          content_type?: Database["public"]["Enums"]["marketing_content_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          scheduled_for?: string | null
          script_id?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          content_type?: Database["public"]["Enums"]["marketing_content_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          scheduled_for?: string | null
          script_id?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "marketing_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_references: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          note: string | null
          title: string
          url: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          title: string
          url: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          title?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_references_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_scripts: {
        Row: {
          author_id: string | null
          body: string | null
          channel: Database["public"]["Enums"]["marketing_channel"]
          client_id: string | null
          content_type: Database["public"]["Enums"]["marketing_content_type"]
          created_at: string
          cta: string | null
          development: string | null
          hook: string | null
          id: string
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["marketing_status"]
          technical_notes: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["marketing_channel"]
          client_id?: string | null
          content_type?: Database["public"]["Enums"]["marketing_content_type"]
          created_at?: string
          cta?: string | null
          development?: string | null
          hook?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          technical_notes?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["marketing_channel"]
          client_id?: string | null
          content_type?: Database["public"]["Enums"]["marketing_content_type"]
          created_at?: string
          cta?: string | null
          development?: string | null
          hook?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["marketing_status"]
          technical_notes?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_scripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_scripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_workspace_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_workspace_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_workspace_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_workspace_id_fkey"
            columns: ["current_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          category: Database["public"]["Enums"]["task_category"]
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["video_priority"]
          recurrence: Database["public"]["Enums"]["task_recurrence"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["video_priority"]
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["video_priority"]
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          task_id: string | null
          updated_at: string
          user_id: string
          video_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          video_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          id?: string
          name: string
          size_bytes?: number | null
          url: string
          video_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          id?: string
          name?: string
          size_bytes?: number | null
          url?: string
          video_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_files_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          checklist: Json
          client_id: string
          color: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
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
          workspace_id: string
        }
        Insert: {
          checklist?: Json
          client_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
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
          workspace_id: string
        }
        Update: {
          checklist?: Json
          client_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
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
          workspace_id?: string
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
          {
            foreignKeyName: "videos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: { Args: { _token: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_min_role: {
        Args: {
          _min: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      invite_info: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          email: string
          expires_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
      is_workspace_active: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      portal_approve_video: {
        Args: { _comment: string; _token: string; _video_id: string }
        Returns: undefined
      }
      portal_list_videos: {
        Args: { _token: string }
        Returns: {
          description: string
          due_date: string
          id: string
          status: Database["public"]["Enums"]["video_status"]
          title: string
          updated_at: string
        }[]
      }
      portal_request_changes: {
        Args: { _comment: string; _token: string; _video_id: string }
        Returns: undefined
      }
      portal_resolve_token: {
        Args: { _token: string }
        Returns: {
          client_company: string
          client_id: string
          client_name: string
          workspace_id: string
        }[]
      }
      portal_submit_feedback: {
        Args: {
          _comment: string
          _nps: number
          _token: string
          _video_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "client" | "editor"
      campaign_status:
        | "planejada"
        | "em_andamento"
        | "concluida"
        | "pausada"
        | "cancelada"
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
      marketing_channel:
        | "instagram"
        | "tiktok"
        | "youtube"
        | "linkedin"
        | "outro"
      marketing_content_type:
        | "reels"
        | "post"
        | "story"
        | "carousel"
        | "video_longo"
        | "shorts"
        | "artigo"
        | "outro"
      marketing_status: "ideia" | "roteiro" | "gravado" | "publicado"
      package_size: "p10" | "p20" | "p30" | "custom"
      package_status:
        | "ativo"
        | "expirado"
        | "renovado"
        | "cancelado"
        | "concluido"
      task_category:
        | "financeiro"
        | "atendimento"
        | "marketing"
        | "edicao"
        | "administrativo"
        | "geral"
      task_recurrence: "none" | "daily" | "weekly" | "monthly"
      task_status: "aberta" | "concluida"
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
      workspace_plan: "trial" | "active" | "suspended"
      workspace_role: "owner" | "admin" | "editor"
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
      campaign_status: [
        "planejada",
        "em_andamento",
        "concluida",
        "pausada",
        "cancelada",
      ],
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
      marketing_channel: [
        "instagram",
        "tiktok",
        "youtube",
        "linkedin",
        "outro",
      ],
      marketing_content_type: [
        "reels",
        "post",
        "story",
        "carousel",
        "video_longo",
        "shorts",
        "artigo",
        "outro",
      ],
      marketing_status: ["ideia", "roteiro", "gravado", "publicado"],
      package_size: ["p10", "p20", "p30", "custom"],
      package_status: [
        "ativo",
        "expirado",
        "renovado",
        "cancelado",
        "concluido",
      ],
      task_category: [
        "financeiro",
        "atendimento",
        "marketing",
        "edicao",
        "administrativo",
        "geral",
      ],
      task_recurrence: ["none", "daily", "weekly", "monthly"],
      task_status: ["aberta", "concluida"],
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
      workspace_plan: ["trial", "active", "suspended"],
      workspace_role: ["owner", "admin", "editor"],
    },
  },
} as const
