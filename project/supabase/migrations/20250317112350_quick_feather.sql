/*
  # Initial Schema Setup for Music Sheet Platform

  1. Tables
    - users (extends auth.users)
      - username
      - avatar_url
      - is_admin
    - music_sheets
      - title
      - composer
      - instrument
      - difficulty
      - tags
      - file_url
      - midi_url
    - comments
      - content
      - user reference
      - sheet reference
    - ratings
      - score
      - user reference
      - sheet reference

  2. Security
    - Enable RLS on all tables
    - Set up access policies for each table
*/

-- Create custom types
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create users table that extends auth.users
CREATE TABLE public.users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create music sheets table
CREATE TABLE public.music_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  composer text NOT NULL,
  instrument text NOT NULL,
  difficulty difficulty_level NOT NULL,
  tags text[] DEFAULT '{}',
  file_url text NOT NULL,
  midi_url text,
  scales text[] DEFAULT '{}',
  user_id uuid REFERENCES public.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  sheet_id uuid REFERENCES public.music_sheets(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  sheet_id uuid REFERENCES public.music_sheets(id) NOT NULL,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  score integer CHECK (score >= 1 AND score <= 5) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sheet_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Music sheets policies
CREATE POLICY "Anyone can read music sheets"
  ON public.music_sheets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create music sheets"
  ON public.music_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own music sheets"
  ON public.music_sheets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own music sheets"
  ON public.music_sheets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can read comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ratings policies
CREATE POLICY "Anyone can read ratings"
  ON public.ratings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ratings"
  ON public.ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_music_sheets_user_id ON public.music_sheets(user_id);
CREATE INDEX idx_music_sheets_difficulty ON public.music_sheets(difficulty);
CREATE INDEX idx_comments_sheet_id ON public.comments(sheet_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_ratings_sheet_id ON public.ratings(sheet_id);