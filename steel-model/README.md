# WILP steel model viewer

The subpage runs from the `steel-model/` directory on the WILP site. GitHub Pages serves its HTML, JavaScript, WebAssembly and compressed IFC assets.

Choose **Steel + slabs** or **Full model with architecture**. Orbit, pan and zoom, or click to select an IFC element. **Measure** gives the straight-line distance in metres between two clicked surface points. Measurement points are picked on visible geometry and can be cleared with the toolbar.

The **Model browser** groups elements by IFC storey or category. Search by name, category, storey or IFC element number. Select an element to inspect IFC attributes and property sets. Fit, hide and isolate tools apply to all geometry belonging to that element. Section cuts use a movable plane along the selected axis.

The **Comments** panel captures the current model, camera and selected IFC element. **Go to view** restores that viewpoint. Choose **Shared** for the WILP review thread, sign in through WILP and use **Refresh** to retrieve comments and replies. Signed-in WILP reviewers can read the shared thread. Choose **This browser** for local comments and JSON export or import.

The shared endpoint is `https://wilptest.aecbim.work/api/steel-review`. Its Worker uses the existing WILP session service and the `steel_review_comments` table in WILP D1. The implementation and schema are under `backend/`.

**Copy review link** records the model variant, camera position, target and selected IFC entity number in the URL. Keep each model filename and its IFC contents stable for existing review links.

The IFC exports are the fitted Rev B models. Assets use gzip for smaller downloads and are decompressed in the browser. The viewer uses Three.js 0.187.0 and web-ifc 0.0.79. Their licenses are in `vendor/`.

To preview locally, serve this directory over HTTP with a static server. For the WILP site, place the directory at the repository root and deploy it through the existing Pages workflow.
