import {
  LayoutDashboard,
  Users,
  ClipboardList,
  GraduationCap,
  Calendar,
  MessageSquare,
  Building2,
} from 'lucide-react';

export const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { text: 'Gerenciamento', icon: Building2, path: '/management' },
  { text: 'Leads', icon: Users, path: '/leads' },
  { text: 'Chat', icon: MessageSquare, path: '/whatsapp' },
  { text: 'Tarefas', icon: ClipboardList, path: '/tasks' },
  { text: 'Alunos', icon: GraduationCap, path: '/students' },
  { text: 'Agenda', icon: Calendar, path: '/schedule' },
] as const;