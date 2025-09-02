-- This script is generated based on the Drizzle ORM schema.
-- You can use this to set up your database tables in a MySQL environment.

-- Drop tables in reverse order of dependency to avoid foreign key constraints errors
DROP TABLE IF EXISTS `control_measures`;
DROP TABLE IF EXISTS `hirac_entries`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `users`;


-- Create `users` table
CREATE TABLE `users` (
    `id` serial AUTO_INCREMENT NOT NULL,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    `role` enum('Admin','Safety Officer','Viewer') NOT NULL,
    CONSTRAINT `users_id` PRIMARY KEY(`id`),
    CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

-- Create `departments` table
CREATE TABLE `departments` (
    `id` serial AUTO_INCREMENT NOT NULL,
    `name` varchar(255) NOT NULL,
    `supervisor_id` int unsigned,
    CONSTRAINT `departments_id` PRIMARY KEY(`id`),
    CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);

-- Create `hirac_entries` table
CREATE TABLE `hirac_entries` (
    `id` serial AUTO_INCREMENT NOT NULL,
    `department_id` int NOT NULL,
    `task` varchar(255) NOT NULL,
    `task_type` enum('Routine','Non-Routine') NOT NULL DEFAULT 'Routine',
    `hazard` text NOT NULL,
    `hazard_photo_url` varchar(1024),
    `hazard_class` enum('Physical','Chemical','Biological','Mechanical','Electrical') NOT NULL,
    `hazardous_event` text NOT NULL,
    `persons_harmed` text,
    `impact` text NOT NULL,
    `initial_likelihood` int NOT NULL,
    `initial_severity` int NOT NULL,
    `residual_likelihood` int,
    `residual_severity` int,
    `status` enum('Implemented','For Implementation'),
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` timestamp,
    `next_review_date` timestamp,
    `display_order` int NOT NULL DEFAULT 0,
    CONSTRAINT `hirac_entries_id` PRIMARY KEY(`id`)
);

-- Create `control_measures` table
CREATE TABLE `control_measures` (
    `id` serial AUTO_INCREMENT NOT NULL,
    `hirac_entry_id` int NOT NULL,
    `type` enum('Engineering','Administrative','PPE') NOT NULL,
    `description` text NOT NULL,
    `pic` varchar(255),
    `status` enum('Implemented','For Implementation'),
    `completion_date` timestamp,
    CONSTRAINT `control_measures_id` PRIMARY KEY(`id`)
);
