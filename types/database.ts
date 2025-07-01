export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string | null;
          role: 'admin' | 'user';
          created_at: string;
        };
        Insert: {
          id?: string;
          username?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          status: 'New' | 'Contacted' | 'Converted' | 'Lost';
          tags: string[] | null;
          source: string | null;
          company: 'Favale' | 'Pink' | 'Favale&Pink' | null;
          created_at: string;
          updated_at: string;
          user_id: string;
          is_student?: boolean; // Campo virtual para indicar se é aluno
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          status?: 'New' | 'Contacted' | 'Converted' | 'Lost';
          tags?: string[] | null;
          source?: string | null;
          company?: 'Favale' | 'Pink' | 'Favale&Pink' | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          status?: 'New' | 'Contacted' | 'Converted' | 'Lost';
          tags?: string[] | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      trainers: {
        Row: {
          id: string;
          name: string;
          email: string;
          specialties: string[] | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          specialties?: string[] | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          specialties?: string[] | null;
          created_at?: string;
          user_id?: string;
        };
      };
      students: {
        Row: {
          id: string;
          lead_id: string;
          trainer_id: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          trainer_id?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          trainer_id?: string | null;
          created_at?: string;
          user_id?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          start_time: string;
          end_time: string | null;
          student_id: string;
          trainer_id: string;
          status: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          start_time: string;
          end_time?: string | null;
          student_id: string;
          trainer_id: string;
          status?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          start_time?: string;
          end_time?: string | null;
          student_id?: string;
          trainer_id?: string;
          status?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
          created_at?: string;
          user_id?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          assigned_to_id: string;
          related_lead_id: string | null;
          priority: 'Low' | 'Medium' | 'High' | 'Urgent';
          status: 'Backlog' | 'Em andamento' | 'Bloqueadas' | 'Em Analise' | 'Concluidas';
          due_date: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          assigned_to_id: string;
          related_lead_id?: string | null;
          priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
          status?: 'Backlog' | 'Em andamento' | 'Bloqueadas' | 'Em Analise' | 'Concluidas';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          assigned_to_id?: string;
          related_lead_id?: string | null;
          priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
          status?: 'Backlog' | 'Em andamento' | 'Bloqueadas' | 'Em Analise' | 'Concluidas';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      whatsapp_messages: {
        Row: {
          id: number;
          lead_id: string;
          user_id: string;
          sender_jid: string;
          message_id: string | null;
          message_timestamp: string;
          message_type: string;
          message_content: string | null;
          media_url: string | null;
          mime_type: string | null;
          is_from_lead: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          lead_id: string;
          user_id: string;
          sender_jid: string;
          message_id?: string | null;
          message_timestamp: string;
          message_type?: string;
          message_content?: string | null;
          media_url?: string | null;
          mime_type?: string | null;
          is_from_lead: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          lead_id?: string;
          user_id?: string;
          sender_jid?: string;
          message_id?: string | null;
          message_timestamp?: string;
          message_type?: string;
          message_content?: string | null;
          media_url?: string | null;
          mime_type?: string | null;
          is_from_lead?: boolean;
          created_at?: string;
        };
      };
    };
  };
}