# Demo recording script

`fleet-ops-walkthrough.mp4` in this folder is a 45 second captioned walkthrough built from
screenshots of the running app. It shows each screen but not the motion between them. This
script is for a full screen recording with narration, about two minutes long.

## Setup

```bash
pnpm install
pnpm dev              # page on http://localhost:6701, mock API on :6709
```

- Use a 1280x800 browser window and start in dark mode.
- Open the header's **API** menu and make sure it says **API: normal**.
- Restart `pnpm dev` right before recording so the seeded data matches the screenshots.

## Shots

| #   | Time | On screen                                                                                       | Narration                                                                                                                                                                                    |
| --- | ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00 | `/assets`, table at rest                                                                        | "This is a fleet operations dashboard made of four single-spa micro-frontends. The shell, assets, maintenance and the live map are built and served separately and composed in the browser." |
| 2   | 0:12 | Change **Rows** to 1000 and scroll quickly                                                      | "Paging, sorting and filtering happen on the server. A page can be a thousand rows, but only the rows on screen are in the DOM."                                                             |
| 3   | 0:25 | **Status** filter: Maintenance and Offline. Sort by **Engine hours**. Point at the address bar  | "Filters and sort live in the URL, so this exact view can be shared, reloaded or reached with the back button."                                                                              |
| 4   | 0:38 | **API: fail writes**, then set Crane 0001 to Offline                                            | "Now the mock server refuses every write. The change shows at once, the server answers 503, and only that row rolls back, with a toast that says why."                                       |
| 5   | 0:55 | **API: normal**, go to **Maintenance**, open **New work order**, press Create with empty fields | "Validation comes from the same Zod schema the server uses."                                                                                                                                 |
| 6   | 1:05 | Fill in AST-00042 and a title, then press Create                                                | "The row appears straight away as saving, then is swapped for the stored work order."                                                                                                        |
| 7   | 1:15 | Press **Start** on a work order                                                                 | "Status changes work the same way and roll back on failure."                                                                                                                                 |
| 8   | 1:22 | **Live map**, click a vehicle in the list                                                       | "Positions stream over a WebSocket once a second. Vehicles that stop reporting turn into dashed rings after ten seconds."                                                                    |
| 9   | 1:35 | Save any file in `server/src`, which restarts the mock server                                   | "If the socket drops, the map says so and reconnects with backoff."                                                                                                                          |
| 10  | 1:48 | **API: fail everything** on Assets, then **Try again** after switching back                     | "When reads fail, each app shows an error state with a retry instead of a blank page."                                                                                                       |
| 11  | 1:58 | Toggle the theme, then resize to phone width                                                    | "Light and dark themes come from one set of tokens shared by every micro-frontend."                                                                                                          |

## Before publishing

- Check that no terminal, browser profile or notification shows personal details.
- Export as MP4 (H.264), 1280x800 or 1920x1200.
- Large videos are better attached to a GitHub release or uploaded through the README
  editor than committed to the repository.
