-- This SQL command adds the 'persons_harmed' column to the 'hirac_entries' table.
-- It is designed to be run on an existing database where this column is missing.

ALTER TABLE `hirac_entries` ADD COLUMN `persons_harmed` text;
