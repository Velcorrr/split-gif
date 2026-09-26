# Split GIF

A static, browser-only website that combines two user-selected GIFs into an experimental file with different behavior in strict image processors and tolerant browsers.

## Run locally

From this folder run `python -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765. No npm dependencies or build step are required. A web server is necessary for module workers; opening index.html directly from disk will not work.

## Use

1. Choose an ordinary GIF for the intended chat preview and another for the browser reveal, or load the included abstract demo animations.
2. Choose how many times the intro should play in the browser.
3. Create the combined GIF. Compare the simulated chat preview with the actual generated file playing in your browser.
4. Download it and test it as a Discord attachment. Open the original attachment in a compatible browser to compare results.

Files are read locally using File and Blob APIs and processed in a Web Worker. User-selected files are never sent to a server. Google Fonts is used for typography with system fallbacks. There are no analytics, accounts, API keys, runtime libraries, or external processing services.

## How the file works

`gif.js` parses both sources, preserves compressed frame data and timing, promotes each frame's palette to a local color table, and centers differing canvas sizes without scaling. A deliberately malformed LZW transition is inserted between the two sequences. The transition emits clear code 4, pixel index 0, invalid dictionary reference 7 (next legal dictionary entry is 6), then end code 5. These are packed into bytes C4 0B. The output loops the entire intro-and-reveal sequence.

A strict GIF decoder rejects the transition. A tolerant Chromium decoder can continue to the subsequent frames. The original reference file was observed to be truncated to its valid prefix by Discord's media resizing endpoint. **That endpoint has not been tested with freshly generated output from this app.** Discord's implementation, client, attachment dimensions, proxy cache, and future updates may change results. No claim of universal compatibility is made. The chat preview in the UI is explicitly a simulation, not a live call to Discord.

The generator uses its own minimal transition rather than copying bytes, images, or trailing padding from the reference GIF. The website includes only new geometric demo artwork. Arbitrary palettes, transparency, interlacing and frame delays are retained, but unusual background/disposal combinations and different canvas sizes may composite differently. Use matching dimensions and full-frame sources for the most predictable appearance. Re-encoding the result can destroy the effect.

## Checks

- `npm test`: parser, structural validation, source LZW integrity, input preservation, repeat count, palette retention, centering, transparency, and interlace flags.
- The generated demo has been observed displaying both animations in Chromium; Pillow rejects its transition after the valid intro.
- Input limits: 20 MB per file, 2,000 frames, 16-megapixel canvas, and 250 million total decoded pixels per GIF.

## Publish with GitHub Pages

Push the contents of this folder to a repository. In Settings → Pages, choose **Deploy from a branch**, **main**, and **/(root)**. Save. The site uses relative asset paths, so it supports project URLs such as `https://USERNAME.github.io/split-gif/` without configuration.

The `.nojekyll` file disables unnecessary Jekyll processing. The original research files and reference attachment are outside this project and must not be included in the repository.

References: [GIF89a format](https://giflib.sourceforge.net/gifstandard/GIF89a.html), [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
