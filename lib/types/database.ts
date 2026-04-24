import type { OrderStatus, OrderType, PaymentMethod, PickupType, Role } from "@/lib/types/domain";

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
      profiles: {
        Row: {
          id: string;
          role: Role;
          name: string | null;
          phone: string | null;
          reward_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Role;
          name?: string | null;
          phone?: string | null;
          reward_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: Role;
          name?: string | null;
          phone?: string | null;
          reward_points?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_verification_tokens: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          token: string;
          token_type: string;
          used: boolean;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          token: string;
          token_type: string;
          used?: boolean;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          email?: string;
          token?: string;
          token_type?: string;
          used?: boolean;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          track_stock: boolean;
          stock_quantity: number | null;
          low_stock_alert: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          track_stock?: boolean;
          stock_quantity?: number | null;
          low_stock_alert?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          track_stock?: boolean;
          stock_quantity?: number | null;
          low_stock_alert?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      item_modifiers: {
        Row: {
          id: string;
          item_id: string;
          name: string;
          options: Json;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          name: string;
          options: Json;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          item_id?: string;
          name?: string;
          options?: Json;
          is_required?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_modifiers_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: OrderStatus;
          type: OrderType;
          pickup_type: PickupType;
          payment_method: PaymentMethod;
          pickup_time: string | null;
          notes: string | null;
          shift_id: string | null;
          discount_amount: number;
          discount_code_id: string | null;
          points_redeemed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: OrderStatus;
          type?: OrderType;
          pickup_type?: PickupType;
          payment_method?: PaymentMethod;
          pickup_time?: string | null;
          notes?: string | null;
          shift_id?: string | null;
          discount_amount?: number;
          discount_code_id?: string | null;
          points_redeemed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          status?: OrderStatus;
          type?: OrderType;
          pickup_type?: PickupType;
          payment_method?: PaymentMethod;
          pickup_time?: string | null;
          notes?: string | null;
          shift_id?: string | null;
          discount_amount?: number;
          discount_code_id?: string | null;
          points_redeemed?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey";
            columns: ["discount_code_id"];
            isOneToOne: false;
            referencedRelation: "discount_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          item_id: string;
          quantity: number;
          modifiers: Json;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          item_id: string;
          quantity?: number;
          modifiers?: Json;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          item_id?: string;
          quantity?: number;
          modifiers?: Json;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_log: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          changed_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          changed_at?: string;
        };
        Update: {
          status?: OrderStatus;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_log_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          id: string;
          opened_by: string | null;
          closed_by: string | null;
          opening_cash: number;
          closing_cash: number | null;
          status: "open" | "closed";
          notes: string | null;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          opened_by?: string | null;
          closed_by?: string | null;
          opening_cash?: number;
          closing_cash?: number | null;
          status?: "open" | "closed";
          notes?: string | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          closed_by?: string | null;
          closing_cash?: number | null;
          status?: "open" | "closed";
          notes?: string | null;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          id: string;
          code: string;
          type: "percent" | "fixed";
          value: number;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: "percent" | "fixed";
          value: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          code?: string;
          type?: "percent" | "fixed";
          value?: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          unit: string;
          current_stock: number;
          minimum_stock: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit?: string;
          current_stock?: number;
          minimum_stock?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          unit?: string;
          current_stock?: number;
          minimum_stock?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_item_ingredients: {
        Row: {
          id: string;
          menu_item_id: string;
          inventory_item_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          inventory_item_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: {
          menu_item_id?: string;
          inventory_item_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_item_ingredients_inventory_item_id_fkey";
            columns: ["inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      decrement_inventory_stock: {
        Args: { p_item_id: string; p_amount: number };
        Returns: void;
      };
    };
    Enums: {
      role: Role;
      order_status: OrderStatus;
      order_type: OrderType;
      pickup_type: PickupType;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};
