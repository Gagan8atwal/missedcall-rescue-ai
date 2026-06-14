/**
 * Supabase Database Types
 *
 * Hand-crafted to match supabase/migrations/001_initial_schema.sql
 * Includes the required `Relationships` field on each table so that
 * the supabase-js GenericTable constraint is satisfied and TypeScript
 * can infer proper row types instead of `never`.
 *
 * Run `npx supabase gen types typescript --local > src/types/supabase.ts`
 * after linking to a real project to auto-generate this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          twilio_phone_number: string | null;
          twilio_account_sid: string | null;
          twilio_auth_token: string | null;
          openai_api_key: string | null;
          auto_reply_enabled: boolean | null;
          auto_reply_message: string | null;
          ai_qualification_enabled: boolean | null;
          ai_prompt: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          twilio_phone_number?: string | null;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          openai_api_key?: string | null;
          auto_reply_enabled?: boolean | null;
          auto_reply_message?: string | null;
          ai_qualification_enabled?: boolean | null;
          ai_prompt?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          twilio_phone_number?: string | null;
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          openai_api_key?: string | null;
          auto_reply_enabled?: boolean | null;
          auto_reply_message?: string | null;
          ai_qualification_enabled?: boolean | null;
          ai_prompt?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          business_id: string | null;
          phone_number: string;
          name: string | null;
          status: string | null;
          summary: string | null;
          last_contacted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          phone_number: string;
          name?: string | null;
          status?: string | null;
          summary?: string | null;
          last_contacted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          phone_number?: string;
          name?: string | null;
          status?: string | null;
          summary?: string | null;
          last_contacted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          lead_id: string | null;
          business_id: string | null;
          direction: string;
          content: string;
          twilio_message_sid: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          business_id?: string | null;
          direction: string;
          content: string;
          twilio_message_sid?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          business_id?: string | null;
          direction?: string;
          content?: string;
          twilio_message_sid?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      calls: {
        Row: {
          id: string;
          business_id: string | null;
          lead_id: string | null;
          twilio_call_sid: string | null;
          duration: number | null;
          recording_url: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          lead_id?: string | null;
          twilio_call_sid?: string | null;
          duration?: number | null;
          recording_url?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          lead_id?: string | null;
          twilio_call_sid?: string | null;
          duration?: number | null;
          recording_url?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calls_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: Record<string, never>;
  };
};
