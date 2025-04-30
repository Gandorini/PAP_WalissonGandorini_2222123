import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Like } from '../types/database';

interface LikeState {
  userLikes: string[]; // IDs das partituras que o usuário curtiu
  loading: boolean;
  error: string | null;
  
  // Ações
  fetchUserLikes: () => Promise<string[]>;
  likeSheet: (sheetId: string) => Promise<boolean>;
  unlikeSheet: (sheetId: string) => Promise<boolean>;
  isSheetLiked: (sheetId: string) => boolean;
  clearLikes: () => void;
}

export const useLikeStore = create<LikeState>((set, get) => ({
  userLikes: [],
  loading: false,
  error: null,
  
  fetchUserLikes: async () => {
    set({ loading: true, error: null });
    try {
      // Verificar se temos o ID do usuário
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Buscar likes do usuário
      const { data, error } = await supabase
        .from('likes')
        .select('sheet_id')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const likedSheetIds = data.map(like => like.sheet_id);
      set({ userLikes: likedSheetIds, loading: false });
      return likedSheetIds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar likes';
      console.error('Erro ao buscar likes:', error);
      set({ error: errorMessage, loading: false });
      return [];
    }
  },
  
  likeSheet: async (sheetId: string) => {
    try {
      // Verificar se temos o ID do usuário
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se já está curtido
      if (get().isSheetLiked(sheetId)) {
        return true; // Já está curtido, não precisamos fazer nada
      }
      
      // Curtir a partitura
      const { error } = await supabase
        .from('likes')
        .insert({
          sheet_id: sheetId,
          user_id: userId
        });
        
      if (error) throw error;
      
      // Incrementar contador de likes na tabela music_sheets
      await supabase.rpc('increment_likes', {
        sheet_id: sheetId
      });
      
      // Atualizar estado local
      set(state => ({
        userLikes: [...state.userLikes, sheetId]
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao curtir partitura:', error);
      return false;
    }
  },
  
  unlikeSheet: async (sheetId: string) => {
    try {
      // Verificar se temos o ID do usuário
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Descurtir a partitura
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({
          sheet_id: sheetId,
          user_id: userId
        });
        
      if (error) throw error;
      
      // Decrementar contador de likes na tabela music_sheets
      await supabase.rpc('decrement_likes', {
        sheet_id: sheetId
      });
      
      // Atualizar estado local
      set(state => ({
        userLikes: state.userLikes.filter(id => id !== sheetId)
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao descurtir partitura:', error);
      return false;
    }
  },
  
  isSheetLiked: (sheetId: string) => {
    return get().userLikes.includes(sheetId);
  },
  
  clearLikes: () => {
    set({
      userLikes: [],
      loading: false,
      error: null
    });
  }
})); 