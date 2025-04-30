export interface MusicSheet {
  id: string;
  title: string;
  composer: string;
  instrument: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  file_url: string;
  midi_url?: string;
  scales: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  likes?: number;
  downloads?: number;
  comments?: number;
  isLiked?: boolean;
} 