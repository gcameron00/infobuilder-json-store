// InfoBuilder JSON Store — static viewer
// Loads /data/index.json (manifest), renders the file list, and on selection
// fetches the chosen JSON and renders it as a syntax-coloured, collapsible tree.

(function () {
  "use strict";

  const MANIFEST_URL = "/data/index.json";
  const DATA_DIR = "/data/";

  const fileListEl = document.getElementById("file-list");
  const viewerEl = document.getElementById("viewer");
  const toolbarEl = document.getElementById("viewer-toolbar");
  const titleEl = document.getElementById("viewer-title");
  const descEl = document.getElementById("viewer-description");
  const pathEl = document.getElementById("viewer-path");
  const rawLinkEl = document.getElementById("viewer-raw");
  const expandBtn = document.getElementById("expand-all");
  const collapseBtn = document.getElementById("collapse-all");

  let manifest = null;

  // ---------- Manifest + file list ----------

  async function loadManifest() {
    try {
      const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      manifest = data;
      renderFileList(data.files || []);
      handleHashChange();
    } catch (err) {
      fileListEl.innerHTML =
        '<li class="file-list__error">Could not load manifest (' +
        escapeHtml(err.message) +
        ").</li>";
    }
  }

  function renderFileList(files) {
    if (!files.length) {
      fileListEl.innerHTML =
        '<li class="file-list__empty">No files in the manifest yet.</li>';
      return;
    }
    fileListEl.innerHTML = "";
    files.forEach((entry) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#file=" + encodeURIComponent(entry.path);
      a.dataset.path = entry.path;
      a.innerHTML =
        '<span class="file-list__title"></span>' +
        '<span class="file-list__path"></span>';
      a.querySelector(".file-list__title").textContent =
        entry.title || entry.path;
      a.querySelector(".file-list__path").textContent = entry.path;
      li.appendChild(a);
      fileListEl.appendChild(li);
    });
  }

  function setActiveLink(path) {
    fileListEl.querySelectorAll("a").forEach((a) => {
      if (a.dataset.path === path) {
        a.setAttribute("aria-current", "true");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  // ---------- Routing ----------

  function handleHashChange() {
    const hash = window.location.hash || "";
    const match = hash.match(/^#file=([^&]+)/);
    if (!match) {
      showPlaceholder();
      setActiveLink(null);
      return;
    }
    const path = decodeURIComponent(match[1]);
    loadFile(path);
  }

  function showPlaceholder() {
    toolbarEl.hidden = true;
    viewerEl.innerHTML =
      '<p class="viewer__placeholder">Select a file from the list to view its contents.</p>';
  }

  // ---------- File loading ----------

  async function loadFile(path) {
    setActiveLink(path);
    const entry = findEntry(path);
    const url = DATA_DIR + path;

    toolbarEl.hidden = false;
    titleEl.textContent = entry ? entry.title : path;
    descEl.textContent = entry && entry.description ? entry.description : "";
    pathEl.textContent = url;
    rawLinkEl.href = url;

    viewerEl.innerHTML =
      '<p class="viewer__placeholder">Loading ' + escapeHtml(path) + "…</p>";

    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("Invalid JSON: " + parseErr.message);
      }
      renderJson(parsed);
    } catch (err) {
      viewerEl.innerHTML =
        '<p class="viewer__error">Could not load file: ' +
        escapeHtml(err.message) +
        "</p>";
    }
  }

  function findEntry(path) {
    if (!manifest || !manifest.files) return null;
    return manifest.files.find((f) => f.path === path) || null;
  }

  // ---------- JSON tree rendering ----------

  function renderJson(value) {
    viewerEl.innerHTML = "";
    const root = document.createElement("div");
    root.className = "json-tree";
    root.appendChild(renderNode(value, null, true));
    viewerEl.appendChild(root);
  }

  // Renders one JSON value into an element. If `key` is provided, the value
  // is shown as a labelled child; otherwise it's a bare root value.
  // `isRoot` controls whether collapsible nodes start open at the root level
  // (root opens; everything else opens too by default, user can collapse).
  function renderNode(value, key, isRoot) {
    const type = typeOf(value);
    const li = document.createElement(key !== null ? "li" : "div");

    if (type === "object" || type === "array") {
      const isArray = type === "array";
      const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
      const open = "{[".charAt(isArray ? 1 : 0);
      const close = "}]".charAt(isArray ? 1 : 0);

      li.classList.add("json-node", "json-node--collapsible");
      if (entries.length === 0) {
        li.classList.remove("json-node--collapsible");
      }

      const summary = document.createElement("span");
      summary.className = "json-summary";

      const toggle = document.createElement("span");
      toggle.className = "json-toggle";
      toggle.textContent = entries.length ? "▼" : "·";
      summary.appendChild(toggle);

      if (key !== null) {
        summary.appendChild(renderKey(key));
        summary.appendChild(punct(": "));
      }
      summary.appendChild(punct(open));

      const ellipsis = document.createElement("span");
      ellipsis.className = "json-ellipsis";
      ellipsis.textContent = "…";
      summary.appendChild(ellipsis);

      const trailingClose = document.createElement("span");
      trailingClose.className = "json-trail json-punct";
      trailingClose.textContent = close;
      summary.appendChild(trailingClose);

      if (entries.length > 0) {
        const count = document.createElement("span");
        count.className = "json-count";
        count.textContent = isArray
          ? entries.length + (entries.length === 1 ? " item" : " items")
          : entries.length + (entries.length === 1 ? " key" : " keys");
        summary.appendChild(count);
      }

      li.appendChild(summary);

      if (entries.length > 0) {
        const ul = document.createElement("ul");
        entries.forEach(([childKey, childVal]) => {
          const childLi = renderNode(childVal, childKey, false);
          ul.appendChild(childLi);
        });
        li.appendChild(ul);

        const closingLine = document.createElement("div");
        closingLine.className = "json-closing";
        closingLine.appendChild(punct(close));
        li.appendChild(closingLine);

        summary.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleNode(li);
        });
      }

      return li;
    }

    // Primitive value
    if (key !== null) {
      li.appendChild(renderKey(key));
      li.appendChild(punct(": "));
    }
    li.appendChild(renderPrimitive(value, type));
    return li;
  }

  function renderKey(key) {
    const el = document.createElement("span");
    el.className = "json-key";
    if (typeof key === "number") {
      el.textContent = key;
    } else {
      el.textContent = '"' + key + '"';
    }
    return el;
  }

  function renderPrimitive(value, type) {
    const el = document.createElement("span");
    switch (type) {
      case "string":
        el.className = "json-string";
        el.textContent = JSON.stringify(value);
        break;
      case "number":
        el.className = "json-number";
        el.textContent = String(value);
        break;
      case "boolean":
        el.className = "json-bool";
        el.textContent = String(value);
        break;
      case "null":
        el.className = "json-null";
        el.textContent = "null";
        break;
      default:
        el.className = "json-string";
        el.textContent = String(value);
    }
    return el;
  }

  function punct(text) {
    const el = document.createElement("span");
    el.className = "json-punct";
    el.textContent = text;
    return el;
  }

  function toggleNode(li) {
    const collapsed = li.classList.toggle("json-node--collapsed");
    const toggle = li.querySelector(":scope > .json-summary > .json-toggle");
    if (toggle) toggle.textContent = collapsed ? "▶" : "▼";
  }

  function setAllCollapsed(collapsed) {
    viewerEl
      .querySelectorAll(".json-node--collapsible")
      .forEach((node) => {
        if (collapsed) {
          node.classList.add("json-node--collapsed");
        } else {
          node.classList.remove("json-node--collapsed");
        }
        const toggle = node.querySelector(":scope > .json-summary > .json-toggle");
        if (toggle) toggle.textContent = collapsed ? "▶" : "▼";
      });
  }

  // ---------- Utilities ----------

  function typeOf(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  // ---------- Wire up ----------

  expandBtn.addEventListener("click", () => setAllCollapsed(false));
  collapseBtn.addEventListener("click", () => setAllCollapsed(true));

  window.addEventListener("hashchange", handleHashChange);

  loadManifest();
})();
