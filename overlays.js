/* SAS Overlays — display layer for the static Scope & Sequence site
 * -----------------------------------------------------------------
 * Reads NETWORK-visible teacher adjustments and shows them inside the
 * existing lesson detail modal, plus a "Customize my SAS" button that opens
 * the Apps Script editor. The network plan itself is untouched.
 *
 * Integration (see SAS-Overlay-Setup.md):
 *   1. Set OVERLAYS_SOURCE and EDITOR_URL below.
 *   2. In index.html, add after <script src="app.js"></script>:
 *        <link rel="stylesheet" href="overlays.css" />
 *        <script src="overlays.js"></script>
 *   3. In app.js openLessonModal(), just before the modal is shown, add:
 *        if (window.SASOverlays) SASOverlays.renderInto(body, lesson, subj);
 *
 * This file has ZERO dependencies on app.js internals beyond the lesson
 * object shape, so it is safe to drop in.
 */
(function () {
  "use strict";

  // ---- CONFIG: fill these in after deploying the Apps Script web app ----
  // Where to read shared overlays from. Recommended: a committed JSON file
  // refreshed by the daily job. Alternative: the GAS live feed
  // (".../exec?api=overlays") if you deploy it with "Anyone" access.
  var OVERLAYS_SOURCE = "data/overlays.json";
  // The Apps Script web app /exec URL (the editor teachers open):
  var EDITOR_URL = "https://script.google.com/a/macros/voicescharterschool.com/s/AKfycbwVv9f9QbxQoBg6VvHgFD5PpWBPa5TW-Hq5ga94UbE-8AwvukaXBPZ4xyB8BBVYeM-q/exec";
  // -----------------------------------------------------------------------

  var TYPE_LABELS = {
    pacing: "Pacing change", skip: "Not teaching", note: "Note",
    objective: "Revised objective", i_can: "I Can statement", add: "Added lesson"
  };

  var indexByKey = {};   // lesson_key -> [overlay, ...]
  var loaded = false;

  // MUST match lessonKey_() in the Apps Script Code.gs exactly.
  function lessonKey(l) {
    return [l.grade_level, l.subject_area, l.section_number, l.lesson_number, l.week, l.topic, l.start_date]
      .map(function (x) { return (x === null || x === undefined) ? "" : String(x).trim(); })
      .join("||");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function load() {
    return fetch(OVERLAYS_SOURCE, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { overlays: {} }; })
      .then(function (data) { indexByKey = (data && data.overlays) || {}; loaded = true; })
      .catch(function () { indexByKey = {}; loaded = true; });
  }

  function overlaysFor(lesson) {
    return indexByKey[lessonKey(lesson)] || [];
  }

  // Append an overlays panel to the modal body for a given lesson.
  function renderInto(bodyEl, lesson, subj) {
    if (!bodyEl) return;
    var ovs = overlaysFor(lesson);
    var panel = document.createElement("div");
    panel.className = "sas-ov-panel";

    var head = '<div class="sas-ov-head">Teacher adjustments'
      + (ovs.length ? ' <span class="sas-ov-count">' + ovs.length + "</span>" : "") + "</div>";

    var body = ovs.length
      ? ovs.map(function (o) {
          return '<div class="sas-ov-item">'
            + '<span class="sas-ov-tag">' + esc(TYPE_LABELS[o.type] || o.type) + "</span>"
            + '<span class="sas-ov-by">' + esc(o.teacher_name || "") + (o.site ? " · " + esc(o.site) : "") + "</span>"
            + '<div class="sas-ov-val">' + esc(o.value) + "</div>"
            + "</div>";
        }).join("")
      : '<div class="sas-ov-empty">No shared adjustments yet for this lesson.</div>';

    var btn = EDITOR_URL && EDITOR_URL.indexOf("PASTE_") === -1
      ? '<a class="sas-ov-btn" href="' + esc(EDITOR_URL) + '" target="_blank" rel="noopener">Customize my SAS ↗</a>'
      : "";

    panel.innerHTML = head + body + btn;
    bodyEl.appendChild(panel);
  }

  // Optional: does this lesson have shared overlays? (for chip badges)
  function hasOverlays(lesson) { return overlaysFor(lesson).length > 0; }
  function countFor(lesson) { return overlaysFor(lesson).length; }

  window.SASOverlays = {
    ready: load(),          // promise; resolves when overlays are loaded
    renderInto: renderInto,
    hasOverlays: hasOverlays,
    countFor: countFor,
    lessonKey: lessonKey
  };
})();
