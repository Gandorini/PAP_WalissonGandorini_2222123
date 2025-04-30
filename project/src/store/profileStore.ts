import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Follower } from '../types/database';

interface ProfileState {
  profile: User | null;
  followers: string[]; // IDs dos seguidores
  following: string[]; // IDs de quem o usuário segue
  profileLoading: boolean;
  followersLoading: boolean;
  followingLoading: boolean;
  profileError: string | null;
  
  // Ações
  fetchProfile: (userId: string) => Promise<User | null>;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  fetchFollowers: (userId: string) => Promise<string[]>;
  fetchFollowing: (userId: string) => Promise<string[]>;
  followUser: (userId: string) => Promise<boolean>;
  unfollowUser: (userId: string) => Promise<boolean>;
  isFollowing: (userId: string) => boolean;
  resetStore: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  followers: [],
  following: [],
  profileLoading: false,
  followersLoading: false,
  followingLoading: false,
  profileError: null,
  
  fetchProfile: async (userId: string) => {
    set({ profileLoading: true, profileError: null });
    try {
      // Buscar perfil do usuário
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      set({ profile: data as User, profileLoading: false });
      return data as User;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar perfil';
      console.error('Erro ao buscar perfil:', error);
      set({ profileError: errorMessage, profileLoading: false });
      return null;
    }
  },
  
  updateProfile: async (profileData: Partial<User>) => {
    try {
      // Verificar se temos o ID do usuário
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Atualizar perfil no banco de dados
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
        
      if (error) throw error;
      
      // Atualizar estado local
      set(state => ({
        profile: state.profile ? { ...state.profile, ...profileData } : null
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return false;
    }
  },
  
  fetchFollowers: async (userId: string) => {
    set({ followersLoading: true });
    try {
      // Buscar seguidores do usuário
      const { data, error } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const followerIds = data.map(item => item.follower_id);
      set({ followers: followerIds, followersLoading: false });
      return followerIds;
    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
      set({ followersLoading: false });
      return [];
    }
  },
  
  fetchFollowing: async (userId: string) => {
    set({ followingLoading: true });
    try {
      // Buscar quem o usuário segue
      const { data, error } = await supabase
        .from('followers')
        .select('user_id')
        .eq('follower_id', userId);
        
      if (error) throw error;
      
      const followingIds = data.map(item => item.user_id);
      set({ following: followingIds, followingLoading: false });
      return followingIds;
    } catch (error) {
      console.error('Erro ao buscar seguidos:', error);
      set({ followingLoading: false });
      return [];
    }
  },
  
  followUser: async (userId: string) => {
    try {
      // Verificar se temos o ID do usuário autenticado
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      
      if (!authUserId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se já está seguindo
      if (get().isFollowing(userId)) {
        return true; // Já está seguindo, não precisamos fazer nada
      }
      
      // Seguir o usuário
      const { error } = await supabase
        .from('followers')
        .insert({
          user_id: userId,
          follower_id: authUserId
        });
        
      if (error) throw error;
      
      // Atualizar estado local
      set(state => ({
        following: [...state.following, userId]
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao seguir usuário:', error);
      return false;
    }
  },
  
  unfollowUser: async (userId: string) => {
    try {
      // Verificar se temos o ID do usuário autenticado
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      
      if (!authUserId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Deixar de seguir o usuário
      const { error } = await supabase
        .from('followers')
        .delete()
        .match({
          user_id: userId,
          follower_id: authUserId
        });
        
      if (error) throw error;
      
      // Atualizar estado local
      set(state => ({
        following: state.following.filter(id => id !== userId)
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao deixar de seguir usuário:', error);
      return false;
    }
  },
  
  isFollowing: (userId: string) => {
    return get().following.includes(userId);
  },
  
  resetStore: () => {
    set({
      profile: null,
      followers: [],
      following: [],
      profileLoading: false,
      followersLoading: false,
      followingLoading: false,
      profileError: null
    });
  }
})); 