/*
  Warnings:

  - Added the required column `data` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "data" BYTEA NOT NULL;
