-- AI 做饭助手 v0.1 schema

CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  alias_names JSONB NOT NULL DEFAULT '[]',
  cuisine_type VARCHAR(64),
  cook_time_minutes INT,
  difficulty SMALLINT,
  taste_tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  alias_names JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dish_ingredients (
  id VARCHAR(64) PRIMARY KEY,
  dish_id VARCHAR(64) NOT NULL REFERENCES dishes(id),
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id),
  role VARCHAR(16) NOT NULL CHECK (role IN ('main', 'secondary', 'seasoning')),
  amount_text VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(64) PRIMARY KEY,
  dish_id VARCHAR(64) REFERENCES dishes(id),
  source_platform VARCHAR(32) NOT NULL,
  source_video_id VARCHAR(128) NOT NULL,
  title VARCHAR(256) NOT NULL,
  url TEXT NOT NULL,
  duration_sec INT,
  like_count INT,
  publish_time TIMESTAMP,
  score NUMERIC(5, 2),
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dishes_name ON dishes(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_videos_dish_id ON videos(dish_id);
