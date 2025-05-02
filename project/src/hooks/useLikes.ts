import { useLikeStore } from '../store/likeStore';

export const useLikes = () => {
  const { userLikes, loading, fetchUserLikes, likeSheet, unlikeSheet, isSheetLiked } = useLikeStore();

  return {
    userLikes,
    loading,
    fetchUserLikes,
    likeSheet,
    unlikeSheet,
    isLiked: isSheetLiked
  };
}; 