/**
 * أنواع TypeScript المطابقة لـ supabase/migrations/001_init.sql.
 * بصيغة `supabase gen types typescript` — أعِد توليدها بهذا الأمر بعد أي
 * تعديل على المخطط بدل تحريرها يدويًا:
 *   supabase gen types typescript --local > types/db.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          teacher_id: string;
          name: string;
          subject: string;
          join_code: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          name: string;
          subject: string;
          join_code?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          name?: string;
          subject?: string;
          join_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      misconceptions: {
        Row: {
          id: string;
          subject: string;
          outcome_code: string;
          label: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          subject: string;
          outcome_code: string;
          label: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          subject?: string;
          outcome_code?: string;
          label?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      exams: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          title?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          image_url: string;
          status: Database["public"]["Enums"]["submission_status"];
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          image_url: string;
          status?: Database["public"]["Enums"]["submission_status"];
        };
        Update: {
          id?: string;
          exam_id?: string;
          student_id?: string;
          image_url?: string;
          status?: Database["public"]["Enums"]["submission_status"];
        };
        Relationships: [
          {
            foreignKeyName: "submissions_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      diagnoses: {
        Row: {
          id: string;
          submission_id: string;
          student_id: string;
          question_no: number;
          extracted_text: string | null;
          is_correct: boolean;
          misconception_id: string | null;
          confidence: number | null;
          teacher_approved: boolean;
        };
        Insert: {
          id?: string;
          submission_id: string;
          student_id: string;
          question_no: number;
          extracted_text?: string | null;
          is_correct: boolean;
          misconception_id?: string | null;
          confidence?: number | null;
          teacher_approved?: boolean;
        };
        Update: {
          id?: string;
          submission_id?: string;
          student_id?: string;
          question_no?: number;
          extracted_text?: string | null;
          is_correct?: boolean;
          misconception_id?: string | null;
          confidence?: number | null;
          teacher_approved?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "diagnoses_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnoses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diagnoses_misconception_id_fkey";
            columns: ["misconception_id"];
            isOneToOne: false;
            referencedRelation: "misconceptions";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          id: string;
          student_id: string;
          filename: string;
          file_url: string;
          status: Database["public"]["Enums"]["source_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          filename: string;
          file_url: string;
          status?: Database["public"]["Enums"]["source_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          filename?: string;
          file_url?: string;
          status?: Database["public"]["Enums"]["source_status"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          id: string;
          source_id: string;
          order_no: number;
          title: string;
          content_md: string | null;
          is_locked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          order_no: number;
          title: string;
          content_md?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          order_no?: number;
          title?: string;
          content_md?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          id: string;
          section_id: string;
          mode: Database["public"]["Enums"]["quiz_mode"];
          questions_json: Json;
        };
        Insert: {
          id?: string;
          section_id: string;
          mode?: Database["public"]["Enums"]["quiz_mode"];
          questions_json?: Json;
        };
        Update: {
          id?: string;
          section_id?: string;
          mode?: Database["public"]["Enums"]["quiz_mode"];
          questions_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          answers_json: Json;
          score: number;
          misconception_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          answers_json?: Json;
          score: number;
          misconception_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          answers_json?: Json;
          score?: number;
          misconception_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_misconception_id_fkey";
            columns: ["misconception_id"];
            isOneToOne: false;
            referencedRelation: "misconceptions";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          student_id: string;
          current: number;
          longest: number;
          last_active_date: string | null;
        };
        Insert: {
          student_id: string;
          current?: number;
          longest?: number;
          last_active_date?: string | null;
        };
        Update: {
          student_id?: string;
          current?: number;
          longest?: number;
          last_active_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      student_activity: {
        Row: {
          id: string;
          student_id: string;
          kind: Database["public"]["Enums"]["activity_kind"];
          file_ref: string | null;
          section_ref: string | null;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          kind: Database["public"]["Enums"]["activity_kind"];
          file_ref?: string | null;
          section_ref?: string | null;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          kind?: Database["public"]["Enums"]["activity_kind"];
          file_ref?: string | null;
          section_ref?: string | null;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_activity_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          student_id: string;
          section_id: string | null;
          sent_at: string;
          sent_on: string;
          type: Database["public"]["Enums"]["reminder_type"];
          context: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          section_id?: string | null;
          sent_at?: string;
          sent_on?: string;
          type: Database["public"]["Enums"]["reminder_type"];
          context?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          section_id?: string | null;
          sent_at?: string;
          sent_on?: string;
          type?: Database["public"]["Enums"]["reminder_type"];
          context?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_join_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_teacher: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      teaches_class: {
        Args: { p_class_id: string };
        Returns: boolean;
      };
      enrolled_in_class: {
        Args: { p_class_id: string };
        Returns: boolean;
      };
      join_class_by_code: {
        Args: { p_join_code: string };
        Returns: Database["public"]["Tables"]["classes"]["Row"];
      };
    };
    Enums: {
      user_role: "teacher" | "student";
      submission_status: "pending" | "processing" | "completed" | "failed";
      source_status: "pending" | "processing" | "ready" | "failed";
      quiz_mode: "auto" | "custom";
      reminder_type: "not_started" | "incomplete" | "streak_at_risk" | "gap_unresolved";
      activity_kind:
        | "source_uploaded"
        | "section_opened"
        | "question_answered"
        | "quiz_completed";
    };
    CompositeTypes: Record<string, never>;
  };
}
