# Submission working record

This document contains the judge-facing content and release controls for the WebMCP Challenge entry. It is a working record, not proof that the submission has been finalized.

## Public identity

| Field             | Working value                                                 |
| ----------------- | ------------------------------------------------------------- |
| Project name      | DOMHamster                                                    |
| Subtitle          | The human-approved agent dispatcher                           |
| Submitter         | Mohammed Ghazal, individual entrant                           |
| Country           | Saudi Arabia                                                  |
| Project status    | New project created during the challenge                      |
| License           | MIT                                                           |
| Public repository | https://github.com/MohammedGhazal09/DOMHamster                |
| Live URL          | **Live URL: pending** until exact-commit Netlify verification |
| Video             | **Video URL: pending** until the verified release is recorded |

## Elevator pitch

A WebMCP coordination board where an agent drafts and repairs volunteer assignments, while a human locks preferences and approves the exact plan before commit.

## Judge testing instructions

1. Open the recorded live URL in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.
2. Select **Reset** and confirm `READY`, 8 requests, 5 volunteers, and the READY tool set.
3. Ask: **“Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.”**
4. Change `R-105` to `V-03` at `13:00`, then select **Lock assignment**.
5. Ask the agent to fix the conflict without changing locked `R-105`.
6. Confirm only `R-106` moves to `V-05` at `13:00` and the draft is valid.
7. Ask the agent to prepare review; select **Approve** for the exact visible version.
8. Ask the agent to commit the approved plan once.
9. Optionally request the fictional contact for `R-101` and recent audit history.

Expected end state: `COMMITTED`, the human lock remains, the contact request is scoped, and `CONTACTS_ACCESSED` is audited.

## Devpost content inventory

| Section       | Required final content                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Overview      | Project name, elevator pitch, and release-matched thumbnail                                                |
| Story         | Inspiration, what it does, construction, challenges, accomplishments, learning, and next steps             |
| Built with    | WebMCP, TypeScript, React, Vite, Ajv, Vitest, Playwright, Netlify, GitHub                                  |
| Links         | Exact production URL, public repository, and public video                                                  |
| Media         | Four release-matched images: READY, conflict, approval, committed/audit                                    |
| Testing       | Supported clients, reset, canonical prompt, human conflict/lock, approval, commit, optional contacts/audit |
| AI disclosure | Actual tools and uses from [AI-use disclosure](ai-use.md)                                                  |
| Entrant data  | Individual submitter and Saudi Arabia residence                                                            |

## Video requirements

- Target 2:35–2:45 with clear English audio.
- Show the working product within the first 15 seconds.
- Show actual WebMCP discovery and structured calls, not a simulated DOM-clicking narration.
- Show the human-created conflict, lock-preserving repair, exact-version approval, state-dependent commit, and audited contact access.
- Use the same immutable release as the repository tag, deployment, manifest, and screenshots.

## Release identity and finalization gate

Do not finalize the Devpost submission while the live URL or video URL is pending, an official-client record contains **Not run**, or the release candidate checklist has an unchecked P0 item.

Before finalization:

1. select one verified source commit;
2. generate and verify its release manifest;
3. deploy that exact commit;
4. complete WebMCP-enabled Chrome and ChatGPT in-app browser records;
5. capture release-matched screenshots and video;
6. verify every link while logged out;
7. record the final tag and submission receipt; and
8. freeze all judged surfaces.

## Deadline control

The controlling Official Rules deadline is September 3, 2026. DOMHamster’s internal submission deadline is September 3, 2026 at 6:00 p.m. Asia/Riyadh, preserving a five-hour buffer before the rules deadline recorded in the master plan.
