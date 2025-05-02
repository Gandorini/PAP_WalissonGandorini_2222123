import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, signIn, signOut, signUp } = useAuthStore();

  return {
    user,
    isAuthenticated: !!user,
    signIn,
    signOut,
    signUp
  };
}; 