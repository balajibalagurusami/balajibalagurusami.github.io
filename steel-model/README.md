# WILP steel model viewer

The subpage runs from the `steel-model/` directory on the WILP site. GitHub Pages serves its HTML, JavaScript, WebAssembly and compressed IFC assets.

Choose **Steel + slabs** or **Full model with architecture**. Orbit, pan and zoom, or click to select an IFC element. **Measure** gives the straight-line distance in metres between two clicked surface points. Measurement points are picked on visible geometry and can be cleared with the toolbar.

**Copy review link** records the model variant, camera position, target and selected IFC entity number in the URL. Keep each model filename and its IFC contents stable for existing review links. **Comment on GitHub** opens a prefilled issue in the WILP repository. Reviewers submit it using their GitHub account and repository issue permissions.

The IFC exports are the fitted Rev B models. Assets use gzip for smaller downloads and are decompressed in the browser. The viewer uses Three.js 0.187.0 and web-ifc 0.0.79. Their licenses are in `vendor/`.

To preview locally, serve this directory over HTTP with a static server. For the WILP site, place the directory at the repository root and deploy it through the existing Pages workflow.
