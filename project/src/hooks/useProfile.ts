import { useProfileStore } from '../store/profileStore';
import { User } from '../types/database';

export const useProfile = () => {
  const { 
    profile, 
    profileLoading, 
    followers, 
    following,
    fetchProfile,
    updateProfile,
    fetchFollowers,
    fetchFollowing,
    followUser,
    unfollowUser,
    isFollowing
  } = useProfileStore();

  return {
    profile,
    profileLoading,
    followers,
    following,
    fetchProfile,
    updateProfile,
    fetchFollowers,
    fetchFollowing,
    followUser,
    unfollowUser,
    isFollowing
  };
}; 