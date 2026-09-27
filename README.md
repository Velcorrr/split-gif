# Split GIF — The other side

A black-and-white, browser-only GIF lab, published at https://velcorrr.github.io/split-gif/.

## Use

- **GIF → GIF:** select an animated chat intro and a reveal GIF.
- **Still → GIF:** select a PNG, JPG, WebP, or GIF cover and a reveal GIF. A GIF cover uses its first frame. The cover is fitted to the reveal canvas and encoded as exactly one valid frame.
- **Mutation room:** edit the reveal palette (monochrome, negative, channel shift), speed, repetitions, whole-file looping, or disposal behavior for afterimage experiments. Add a UTF-8 note in a GIF comment extension.
- **Byte inspector:** view the file header, malformed transition, decoded comment, frame timings, offsets, and a downloadable JSON report.

The still-cover preset requests 20 ms. Some browsers clamp 0–10 ms GIF delays to around 100 ms, so requesting zero is not a reliable way to make a cover invisible. **A brief cover flash is possible.** Still mode defaults to play once, which stops at the final reveal frame. Loop forever repeats the entire file, including the cover. Reveal repetitions allow several cycles before stopping or returning to the cover.

Files stay on your device. Conversion and GIF byte processing run in a Web Worker. Cover images are decoded with createImageBitmap and fitted using a canvas; no image is sent to an API. Google Fonts supplies typography with local fallbacks. No accounts, tracking, runtime packages, or API keys are required.

## Run and test

Run `python -m http.server 8765 --bind 127.0.0.1` in this folder and open http://127.0.0.1:8765. A web server is required for module workers. Run `npm test` for 15 automated tests. No npm install or build step is needed.

## Format behavior and limits

The generator preserves compressed input frame pixels, palettes, offsets, transparency, interlacing, and unmodified delays. Differing GIF canvas sizes are centered. Cover images use adaptive palette quantization with up to 255 opaque colors and a transparent index; cover fitting supports contain/crop and a black/white matte. The simple cover LZW encoder clears its dictionary after 200 literal pixels to avoid code-width transitions.

The separating frame contains invalid LZW dictionary code 7 where the next legal entry is 6 (minimum code size 2; packed payload C4 0B). A strict decoder rejects that frame; a tolerant Chromium decoder can continue into the reveal. The original reference attachment's valid prefix was observed being retained by Discord's resizing proxy. Newly generated outputs have been tested in Chromium and with Pillow locally, **not uploaded to Discord by this project**. The chat preview is a simulation. Actual Discord rendering depends on its current client and image-processing path, and may differ. Re-encoding can destroy the effect.

Palette mutations affect only the reveal. The trails setting changes disposal to “keep”; it may look unchanged on fully opaque frames. The hidden note is plain text metadata, not encryption or steganography. The inspector displays structural byte facts, not a guarantee that all decoders will accept the file.

Limits: 20 MB per input, 2,000 source frames, 16-megapixel source canvas, 250 million decoded pixels per source GIF, 4-megapixel reveal canvas for still covers, 80 MB maximum generated file. Larger generated sequences can contain up to 30,001 frames with repetitions; the UI shows the first 100 frame rows and exports all of them in the report.

## GitHub Pages

Serve the main branch from /(root), with `.nojekyll`. All asset paths are relative. The reference attachment and user's reference artwork are not included in this repository. Demo artwork is generated for the project.

References: [GIF89a specification](https://giflib.sourceforge.net/gifstandard/GIF89a.html), [Mozilla's GIF delay compatibility discussion](https://bugzilla.mozilla.org/show_bug.cgi?id=232822).
