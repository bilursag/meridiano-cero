-- RenameColumn (data-preserving — not a drop+add)
ALTER TABLE "Trip" RENAME COLUMN "numeroGrupo" TO "groupNumber";
ALTER TABLE "Trip" RENAME COLUMN "curso" TO "grade";
ALTER TABLE "Trip" RENAME COLUMN "ejecutivo" TO "salesExecutive";
