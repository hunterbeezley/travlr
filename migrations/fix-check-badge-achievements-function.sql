-- Fix check_badge_achievements() function to handle user_follows table correctly
-- The function was trying to access NEW.user_id on user_follows table which doesn't have that field
-- Issue: "record 'new' has no field 'user_id'"

CREATE OR REPLACE FUNCTION check_badge_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_collection_count INT;
  v_like_count INT;
  v_save_count INT;
BEGIN
  -- Award creator badges based on collection count
  -- Only run this for collections table
  IF TG_TABLE_NAME = 'collections' THEN
    SELECT COUNT(*) INTO v_collection_count
    FROM collections
    WHERE user_id = NEW.user_id AND is_public = true;

    IF v_collection_count >= 1 THEN
      PERFORM award_badge(NEW.user_id, 'creator_starter');
    END IF;
    IF v_collection_count >= 5 THEN
      PERFORM award_badge(NEW.user_id, 'creator_bronze');
    END IF;
    IF v_collection_count >= 15 THEN
      PERFORM award_badge(NEW.user_id, 'creator_silver');
    END IF;
    IF v_collection_count >= 30 THEN
      PERFORM award_badge(NEW.user_id, 'creator_gold');
    END IF;
  END IF;

  -- Award explorer badges based on saved collections
  IF TG_TABLE_NAME = 'saved_collections' THEN
    SELECT COUNT(*) INTO v_save_count
    FROM saved_collections
    WHERE user_id = NEW.user_id;

    IF v_save_count >= 10 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_bronze');
    END IF;
    IF v_save_count >= 50 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_silver');
    END IF;
    IF v_save_count >= 100 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_gold');
    END IF;
  END IF;

  -- Award social butterfly based on follows
  IF TG_TABLE_NAME = 'user_follows' THEN
    SELECT COUNT(*) INTO v_like_count
    FROM user_follows
    WHERE follower_id = NEW.follower_id;

    IF v_like_count >= 25 THEN
      PERFORM award_badge(NEW.follower_id, 'social_butterfly');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No need to recreate triggers - they already exist and will use the updated function
