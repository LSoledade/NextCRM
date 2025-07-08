
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface User {
  id: string;
  full_name: string;
}

export function useUsers(role: 'student' | 'teacher') {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      
      try {
        if (role === 'student') {
          // Buscar estudantes com join na tabela leads para pegar o nome
          const { data, error } = await supabase
            .from('students')
            .select(`
              id,
              leads!inner(name)
            `);

          if (error) {
            console.error('Erro ao buscar estudantes:', error);
            setUsers([]);
          } else {
            const formattedUsers = data?.map((student: any) => ({
              id: student.id,
              full_name: student.leads.name
            })) || [];
            setUsers(formattedUsers);
          }
        } else if (role === 'teacher') {
          // Buscar professores
          const { data, error } = await supabase
            .from('trainers')
            .select('id, name');

          if (error) {
            console.error('Erro ao buscar professores:', error);
            setUsers([]);
          } else {
            const formattedUsers = data?.map(trainer => ({
              id: trainer.id,
              full_name: trainer.name
            })) || [];
            setUsers(formattedUsers);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar ${role}s:`, error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [role, supabase]);

  return { users, isLoading };
}
