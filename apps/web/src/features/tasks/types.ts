export type Task = {
  id: string;
  title: string;
  due_date: string;
  is_priority: boolean;
  completed_at: string | null;
  carry_count: number;
  created_at: string;
};

export const MAX_PRIORITIES = 3;
export const MAX_TITLE_LENGTH = 200;
