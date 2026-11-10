export interface CommentModel {
  id: string;
  author: string;
  user_id: number;
  avatar: string | null;
  text: string;
  date: number;
  likes: number[];
  dislikes: number[];
  likes_count: number;
  dislikes_count: number;
}