-- This script provides the SQL statements to create the necessary tables for the SafetySight application.
-- You can execute this script in your Google Cloud SQL instance to set up the database schema.

-- Creates the 'users' table to store user information.
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `role` ENUM('Admin', 'Safety Officer', 'Viewer') NOT NULL
);

-- Creates the 'departments' table to store organizational departments.
-- It includes a foreign key to link a supervisor from the 'users' table.
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `supervisor_id` INT,
  FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Creates the main 'hirac_entries' table for Hazard Identification, Risk Assessment, and Control records.
-- This table is linked to a department.
CREATE TABLE `hirac_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `department_id` INT NOT NULL,
  `task` VARCHAR(255) NOT NULL,
  `task_type` ENUM('Routine', 'Non-Routine') NOT NULL DEFAULT 'Routine',
  `hazard` TEXT NOT NULL,
  `hazard_photo_url` VARCHAR(1024),
  `hazard_class` ENUM('Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical') NOT NULL,
  `hazardous_event` TEXT NOT NULL,
  `persons_harmed` TEXT,
  `impact` TEXT NOT NULL,
  `initial_likelihood` INT NOT NULL,
  `initial_severity` INT NOT NULL,
  `residual_likelihood` INT,
  `residual_severity` INT,
  `status` ENUM('Implemented', 'For Implementation'),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP,
  `next_review_date` TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Creates the 'control_measures' table to store control measures for each HIRAC entry.
-- This table has a many-to-one relationship with 'hirac_entries'.
CREATE TABLE `control_measures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hirac_entry_id` INT NOT NULL,
  `type` ENUM('Engineering', 'Administrative', 'PPE') NOT NULL,
  `description` TEXT NOT NULL,
  `pic` VARCHAR(255),
  `status` ENUM('Implemented', 'For Implementation'),
  `completion_date` TIMESTAMP,
  FOREIGN KEY (`hirac_entry_id`) REFERENCES `hirac_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);