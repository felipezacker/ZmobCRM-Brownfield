-- Add description field to tags table
ALTER TABLE tags ADD COLUMN description TEXT DEFAULT NULL;

-- Fix legacy default: change 'bg-gray-500' to NULL for color column
ALTER TABLE tags ALTER COLUMN color SET DEFAULT NULL;
UPDATE tags SET color = NULL WHERE color IS NOT NULL AND color NOT LIKE '#%';
