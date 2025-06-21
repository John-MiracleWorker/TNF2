/*
  # Update Prayer Prompts to use Prayer Journal Integration
  
  1. Changes
    - Update prayer_prompt text in plan_daily_readings to be more actionable
    - Add prayer_journal_friendly column to plan_daily_readings table
    - Mark existing prayer prompts as journal-friendly
  
  2. Benefits
    - Enables prayer prompts to be easily saved to prayer journal
    - Makes prayer prompts more specific and actionable
    - Better integrates reading plans with prayer functionality
*/

-- Add prayer_journal_friendly column to track which prompts are good for the prayer journal
ALTER TABLE plan_daily_readings 
ADD COLUMN IF NOT EXISTS prayer_journal_friendly BOOLEAN DEFAULT true;

-- Update existing prompts to be more actionable and prayer journal friendly
UPDATE plan_daily_readings
SET
  prayer_prompt = 'Lord, help me to prioritize what matters most in my life and align my prayers with Your will, just as Jesus taught in this model prayer.',
  prayer_journal_friendly = true
WHERE
  title = 'The Lord''s Prayer';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Father, I bring my deepest desires before You today. Like Hannah, help me to pour out my heart with honesty and faith, trusting Your perfect timing and wisdom.',
  prayer_journal_friendly = true
WHERE
  title = 'Hannah''s Prayer';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'God, create in me a clean heart and renew a right spirit within me. I confess my need for Your forgiveness and restoration in these specific areas of my life...',
  prayer_journal_friendly = true
WHERE
  title = 'David''s Prayer of Repentance';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Lord, I need Your divine wisdom for the decisions I face. Like Solomon, I ask not for worldly success but for discernment to navigate these specific situations in my life...',
  prayer_journal_friendly = true
WHERE
  title = 'Solomon''s Prayer for Wisdom';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Father, strengthen my commitment to consistent prayer, especially when facing opposition or distraction. Like Daniel, help me establish faithful prayer habits that become unshakable.',
  prayer_journal_friendly = true
WHERE
  title = 'Daniel''s Faithful Prayer';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Jesus, in my current struggles, I surrender my will to Yours. Grant me the strength to pray "not my will, but Yours be done" over these specific challenges I face...',
  prayer_journal_friendly = true
WHERE
  title = 'Jesus in Gethsemane';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Heavenly Father, I pray Paul''s powerful words for myself and these specific people in my life: strengthen us with power through Your Spirit, help Christ dwell in our hearts through faith, and ground us in Your love.',
  prayer_journal_friendly = true
WHERE
  title = 'Paul''s Prayer for the Church';

-- Update some of the Spiritual Renewal plan prayer prompts
UPDATE plan_daily_readings
SET
  prayer_prompt = 'God, thank You for making me a new creation in Christ. Help me live as Your ambassador today, specifically by representing You in these areas of my life...',
  prayer_journal_friendly = true
WHERE
  title = 'New Life in Christ';

UPDATE plan_daily_readings
SET
  prayer_prompt = 'Holy Spirit, transform me by renewing my mind. I surrender these specific thought patterns to You today and ask You to replace them with Your truth...',
  prayer_journal_friendly = true
WHERE
  title = 'Renewing Your Mind';