// COLDSNAP deployment mark (Jeff's scheme, 2026-08-11): one global version,
// shown on the start screen and the in-game corner. Bump EVERY deployment:
// +0.01 per task, +0.1 per phase (a new phase sets the next tenth). Started
// at mk0.1 with FRONT F1 Task 1. Every implementation task's commit bumps
// this constant — a deploy without a bump is a defect.
export const MK = "mk2.86";
