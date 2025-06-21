/*
  # Add Full Chapter Functionality to Reading Plans
  
  1. Update Sample Data
    - Modify some existing reading plan days to use full chapter references
    - Add more detail to descriptions to support full chapters
    
  2. Migration Info
    - This is a data-only migration, no schema changes needed
    - Updates several existing reading plans to include full chapter readings
*/

-- Update some of the Prayer Journey plan days to use full chapter readings
UPDATE plan_daily_readings
SET
  scripture_reference = 'Matthew 6',
  description = 'Jesus taught his disciples a model prayer as part of the Sermon on the Mount. Read the entire chapter to understand the context of prayer within Jesus'' broader teaching on righteousness and Kingdom living.'
WHERE
  title = 'The Lord''s Prayer'
  AND scripture_reference = 'Matthew 6:9-13';

UPDATE plan_daily_readings
SET
  scripture_reference = '1 Samuel 1',
  description = 'Hannah''s powerful prayer for a child came in the context of her family situation and God''s work in Israel. Reading the full chapter gives us a complete picture of her faith and devotion.'
WHERE
  title = 'Hannah''s Prayer'
  AND scripture_reference = '1 Samuel 1:9-20';

UPDATE plan_daily_readings
SET
  scripture_reference = 'Psalm 51',
  description = 'After his sin with Bathsheba, David poured out his heart in repentance. This entire psalm shows the journey from confession to restoration and renewed purpose.'
WHERE
  title = 'David''s Prayer of Repentance'
  AND scripture_reference = 'Psalm 51:1-17';

-- Update some of the Spiritual Renewal plan days to use full chapter readings
UPDATE plan_daily_readings
SET
  scripture_reference = 'Romans 12',
  description = 'Paul''s vision for the transformed Christian life begins with the mind but extends to every area of life. This chapter provides a comprehensive view of spiritual renewal.'
WHERE
  title = 'Renewing Your Mind'
  AND scripture_reference = 'Romans 12:1-2';

UPDATE plan_daily_readings
SET
  scripture_reference = 'Galatians 5',
  description = 'The contrast between the flesh and the Spirit permeates this entire chapter, showing us how the Holy Spirit transforms our character and relationships. Reading the full chapter gives a deeper understanding of what it means to walk in the Spirit.'
WHERE
  title = 'Walking in the Spirit'
  AND scripture_reference = 'Galatians 5:16-25';