/*
  Warnings:

  - You are about to drop the column `awayWinProb` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `homeWinProb` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "awayWinProb",
DROP COLUMN "homeWinProb";
