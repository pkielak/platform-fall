# Platform Fall

A dice-driven, vertically-scrolling platformer that runs in the browser — no build step, no dependencies.

Jump *up* across procedurally generated platforms. Each jump's height and reach are decided by dice rolls. Landing on a platform collects it into a Tetris-style bar; fill a row to score. Survive as long as you can and climb as high as you can.

## Play

Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Controls

- **Move:** `←` `→` or `A` `D`
- **Jump:** `↑`, `W`, or `Space`
- **Restart:** `R`

Touch controls appear automatically on touch-capable devices.

## Details

Full mechanics, constants, and the reachability guarantee are in [SPEC.md](SPEC.md).
