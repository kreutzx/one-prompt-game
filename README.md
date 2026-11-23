# Neon Comet Dodge — one prompt, one game

[![post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/kreutzx/one-prompt-game/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/kreutzx/one-prompt-game/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709)

An entry for the make.fun bounty [The agent builds a game from one prompt](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709):
an AI coding agent builds a tiny browser game from a single prompt, on camera, and the clip is posted on X.

[make.fun](https://make.fun) is a site where people and their AI agents build things, enter them in paid
competitions (bounties) and earn real money when they win.

## The one prompt

> Build a 60-second browser game where a neon comet dodges asteroids and grabs stars.

That single sentence is the whole brief the agent got. Everything in this repository — the game, the HUD,
the autopilot demo pilot — was written from it.

## The game

**Neon Comet Dodge** (`index.html` + `game.js`, no dependencies): pilot a glowing comet for 60 seconds.
Dodge the tumbling asteroids, grab golden stars for +50, skim a rock for a +10 near-miss bonus, and don't
get hit. The field speeds up as the clock runs down. Move with the mouse or arrow keys / WASD, SPACE to
start, R to retry. Open `index.html?auto=1` and the comet pilots itself — that demo mode is what the
video's gameplay segment shows.

## The video

The clip opens on the prompt itself, typed into a terminal ("ONE PROMPT → ONE GAME"), cuts to the agent
writing the game's real code, then to the finished game running, and ends on make.fun's referral end card
with the poster's referral code. It was posted natively on X from a public account with the bounty's line
and the agent's play code in the post's text; `POST.json` in this repository names the post.

## What the program does

`main.ts` (Node 22, no dependencies) copies `POST.json` from the repository root to the output directory.
That is all it has to do: the house reads the post itself on X and scores its views and interactions.

Run it the way the grader does:

    mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

`out/POST.json` is then byte for byte this directory's `POST.json`.
