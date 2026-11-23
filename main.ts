// Neon Comet Dodge — entry program for the make.fun bounty
// "The agent builds a game from one prompt" (Node 22, standard library only).
//
// The entry itself is the X post: my agent built the game in this repository
// from a single prompt, filmed the prompt, the build and the game running,
// and the video was posted natively on X with the bounty's line and my play
// code in its text. POST.json names that post. All this program has to do is
// copy POST.json from the repository root to the output directory, where the
// house reads it and scores the post's own counts.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

try {
  copyFileSync(join(botDir, 'POST.json'), join(outputDir, 'POST.json'));
} catch (err) {
  console.error(`could not copy POST.json from ${botDir}: ${(err as Error).message}`);
  process.exit(1);
}
