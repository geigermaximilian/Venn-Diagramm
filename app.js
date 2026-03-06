const exprInput = document.getElementById("exprInput");
const errorBox = document.getElementById("error");
const setCountEl = document.getElementById("setCount");
const universeInfoEl = document.getElementById("universeInfo");
const lockUniverseDetectEl = document.getElementById("lockUniverseDetect");
const manualSetCountEl = document.getElementById("manualSetCount");
const manualCountEl = document.getElementById("manualCount");
const manualTermEl = document.getElementById("manualTerm");
const manualAlternativesEl = document.getElementById("manualAlternatives");
const manualStepsEl = document.getElementById("manualSteps");
const taskSetCountEl = document.getElementById("taskSetCount");
const taskPromptEl = document.getElementById("taskPrompt");
const taskAnalyzeBtn = document.getElementById("taskAnalyzeBtn");
const taskParseInfoEl = document.getElementById("taskParseInfo");
const taskTermEl = document.getElementById("taskTerm");

const themeToggle = document.getElementById("themeToggle");
const menuToggle = document.getElementById("menuToggle");
const headerTabs = document.getElementById("headerTabs");
const infoToggle = document.getElementById("infoToggle");
const infoPopup = document.getElementById("infoPopup");
const layoutEditToggle = document.getElementById("layoutEditToggle");
const layoutReset = document.getElementById("layoutReset");
const diagramPanel = document.querySelector(".diagram-panel");

const vennCanvas = document.getElementById("vennCanvas");
const vennCtx = vennCanvas.getContext("2d");
const manualCanvas = document.getElementById("manualCanvas");
const manualCtx = manualCanvas.getContext("2d");
const errorOverlayImage = document.getElementById("errorOverlayImage");

const mainTabs = Array.from(document.querySelectorAll(".main-tab"));
const modePanels = {
  term: document.getElementById("mode-term"),
  manual: document.getElementById("mode-manual"),
  tasks: document.getElementById("mode-tasks"),
};
const canvasWraps = {
  term: document.getElementById("canvas-term-wrap"),
  manual: document.getElementById("canvas-manual-wrap"),
  tasks: document.getElementById("canvas-term-wrap"),
};

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = {
  ops: document.getElementById("tab-ops"),
  brackets: document.getElementById("tab-brackets"),
  special: document.getElementById("tab-special"),
};

const symbolButtons = Array.from(document.querySelectorAll(".symbol"));

const universeCandidates = ["M", "U", "Ω", "G", "OMEGA"];
const shortcutOps = {
  s: "∩",
  v: "∪",
  k: "'",
  d: "-",
  y: "△",
};

const state = {
  mode: "term",
  manualSetCount: Number(manualSetCountEl?.value || 3),
  manualSelected: new Set(),
  manualShapes: [],
  manualBounds: null,
  termShapes: [],
  termBounds: null,
  termSetNames: [],
  manualSetNames: [],
  termLayouts: {},
  manualLayouts: {},
  layoutEditEnabled: false,
  dragInfo: null,
  justDraggedUntil: 0,
};

initTheme();
setupThemeToggle();
setupMobileMenu();
setupInfoPopup();
setupMainTabs();
setupSymbolTabs();
setupSymbolButtons();
setupTaskInput();
setupKeyboardShortcuts();
setupManualCanvas();
setupManualSetCount();
setupUniverseDetectionToggle();
setupMobileTypingState();
setupLayoutControls();
setupDiagramDrag();

exprInput.addEventListener("input", () => {
  normalizeTermField();
  updateFromTermInput();
});
window.addEventListener("resize", () => {
  syncMobileMenuState();
  updateFromTermInput();
  drawManualDiagram();
});

queueMicrotask(() => {
  normalizeTermField();
  updateFromTermInput();
  drawManualDiagram();
  updateManualOutputs();
});

function initTheme() {
  const saved = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (systemPrefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}

function setupThemeToggle() {
  bindImmediateAction(themeToggle, () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";

    // Apply theme instantly; redraw canvases in the next frame to avoid click lag.
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);

    requestAnimationFrame(() => {
      updateFromTermInput();
      drawManualDiagram();
    });
  });
}

function setupInfoPopup() {
  if (!infoToggle || !infoPopup) return;

  bindImmediateAction(infoToggle, () => {
    infoPopup.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (infoToggle.contains(target) || infoPopup.contains(target)) return;
    infoPopup.classList.remove("open");
  });
}

function setupMainTabs() {
  for (const button of mainTabs) {
    button.addEventListener("click", () => {
      switchMode(button.dataset.mode);
      closeMobileMenu();
    });
  }
}

function setupMobileMenu() {
  if (!menuToggle || !headerTabs) return;

  bindImmediateAction(menuToggle, () => {
    const isOpen = headerTabs.classList.toggle("open");
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth > 980) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (menuToggle.contains(target) || headerTabs.contains(target)) return;
    closeMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  syncMobileMenuState();
}

function bindImmediateAction(button, action) {
  if (!button) return;

  let pointerTriggered = false;

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    pointerTriggered = true;
    action();
    setTimeout(() => {
      pointerTriggered = false;
    }, 260);
  });

  button.addEventListener("click", (event) => {
    if (pointerTriggered) {
      event.preventDefault();
      return;
    }
    action();
  });
}

function closeMobileMenu() {
  if (!menuToggle || !headerTabs) return;
  headerTabs.classList.remove("open");
  menuToggle.classList.remove("active");
  menuToggle.setAttribute("aria-expanded", "false");
}

function syncMobileMenuState() {
  if (!menuToggle || !headerTabs) return;
  if (window.innerWidth > 980) {
    headerTabs.classList.remove("open");
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
  }
}

function switchMode(mode) {
  state.mode = mode;

  for (const tab of mainTabs) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  }

  for (const [panelMode, panel] of Object.entries(modePanels)) {
    panel.classList.toggle("active", panelMode === mode);
  }

  document.getElementById("canvas-term-wrap").classList.toggle("active", mode !== "manual");
  document.getElementById("canvas-manual-wrap").classList.toggle("active", mode === "manual");

  if (mode === "manual") {
    setErrorOverlayVisible(false);
    drawManualDiagram();
  } else {
    updateFromTermInput();
  }

  updateLayoutToolsState();
}

function setupLayoutControls() {
  if (!layoutEditToggle || !layoutReset) return;

  bindImmediateAction(layoutEditToggle, () => {
    state.layoutEditEnabled = !state.layoutEditEnabled;
    updateLayoutToolsState();
  });

  bindImmediateAction(layoutReset, () => {
    if (state.mode === "manual") {
      const key = getLayoutKey(state.manualSetNames);
      delete state.manualLayouts[key];
      drawManualDiagram();
    } else {
      const key = getLayoutKey(state.termSetNames);
      delete state.termLayouts[key];
      updateFromTermInput();
    }
  });

  updateLayoutToolsState();
}

function updateLayoutToolsState() {
  if (!layoutEditToggle) return;
  layoutEditToggle.classList.toggle("active", state.layoutEditEnabled);
  layoutEditToggle.textContent = state.layoutEditEnabled ? "Fertig" : "Positionieren";

  document.body.classList.toggle("layout-editing", state.layoutEditEnabled);
}

function setupDiagramDrag() {
  setupDragForCanvas(vennCanvas, "term");
  setupDragForCanvas(manualCanvas, "manual");

  window.addEventListener("pointerup", () => {
    state.dragInfo = null;
  });
}

function setupDragForCanvas(canvasEl, mode) {
  canvasEl.addEventListener("pointerdown", (event) => {
    if (!state.layoutEditEnabled) return;
    if (mode === "term" && state.mode === "manual") return;
    if (mode === "manual" && state.mode !== "manual") return;

    const coords = getCanvasCoordinates(event, canvasEl);
    const shapes = mode === "manual" ? state.manualShapes : state.termShapes;
    if (!shapes || shapes.length === 0) return;

    let best = null;
    let bestDist = Infinity;
    for (const shape of shapes) {
      const dx = coords.x - shape.cx;
      const dy = coords.y - shape.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= shape.r && dist < bestDist) {
        best = shape;
        bestDist = dist;
      }
    }

    if (!best) return;

    canvasEl.setPointerCapture(event.pointerId);
    state.dragInfo = {
      mode,
      canvas: canvasEl,
      pointerId: event.pointerId,
      shapeName: best.name,
      offsetX: best.cx - coords.x,
      offsetY: best.cy - coords.y,
      moved: false,
    };
    event.preventDefault();
  });

  canvasEl.addEventListener("pointermove", (event) => {
    const drag = state.dragInfo;
    if (!drag || drag.mode !== mode || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    const coords = getCanvasCoordinates(event, canvasEl);
    const shapes = mode === "manual" ? state.manualShapes : state.termShapes;
    const bounds = mode === "manual" ? state.manualBounds : state.termBounds;
    const setNames = mode === "manual" ? state.manualSetNames : state.termSetNames;
    if (!shapes || !bounds || !setNames || setNames.length === 0) return;

    const shape = shapes.find((item) => item.name === drag.shapeName);
    if (!shape) return;

    const nextCx = clamp(coords.x + drag.offsetX, bounds.x + shape.r, bounds.x + bounds.width - shape.r);
    const nextCy = clamp(coords.y + drag.offsetY, bounds.y + shape.r, bounds.y + bounds.height - shape.r);
    shape.cx = nextCx;
    shape.cy = nextCy;
    drag.moved = true;

    saveLayoutPosition(mode, setNames, shape);

    if (mode === "manual") {
      drawManualDiagram();
    } else {
      updateFromTermInput();
    }
  });

  canvasEl.addEventListener("pointerup", (event) => {
    if (state.dragInfo && state.dragInfo.pointerId === event.pointerId) {
      if (state.dragInfo.moved) {
        state.justDraggedUntil = Date.now() + 180;
      }
      state.dragInfo = null;
    }
  });
}

function setupSymbolTabs() {
  for (const button of tabButtons) {
    button.addEventListener("click", () => {
      for (const b of tabButtons) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      }
      Object.values(tabPanels).forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      tabPanels[button.dataset.tab].classList.add("active");
    });
  }
}

function setupSymbolButtons() {
  for (const symbol of symbolButtons) {
    symbol.addEventListener("click", () => insertAtCursor(symbol.dataset.insert));
  }
}

function setupTaskInput() {
  if (!taskAnalyzeBtn) return;

  taskAnalyzeBtn.addEventListener("click", analyzeTaskPrompt);
  taskPromptEl.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      analyzeTaskPrompt();
    }
  });
}

function setupManualSetCount() {
  if (!manualSetCountEl) return;

  manualSetCountEl.addEventListener("change", () => {
    state.manualSetCount = Number(manualSetCountEl.value || 3);
    state.manualSelected.clear();
    drawManualDiagram();
    updateManualOutputs();
  });
}

function setupUniverseDetectionToggle() {
  if (!lockUniverseDetectEl) return;
  lockUniverseDetectEl.addEventListener("change", () => {
    updateFromTermInput();
  });
}

function setupMobileTypingState() {
  const setTypingState = (isTyping) => {
    if (window.innerWidth > 980) {
      document.body.classList.remove("mobile-typing");
      return;
    }

    document.body.classList.toggle("mobile-typing", isTyping);
  };

  exprInput.addEventListener("focus", () => {
    setTypingState(true);
  });

  exprInput.addEventListener("blur", () => {
    setTimeout(() => setTypingState(false), 120);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      document.body.classList.remove("mobile-typing");
    }
  });
}

function setupKeyboardShortcuts() {
  exprInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return;
    }

    const replacement = shortcutOps[event.key];
    if (!replacement) {
      return;
    }

    event.preventDefault();
    insertAtCursor(replacement);
  });
}

function setupManualCanvas() {
  manualCanvas.addEventListener("click", (event) => {
    if (state.layoutEditEnabled) {
      return;
    }

    if (Date.now() < state.justDraggedUntil) {
      return;
    }

    if (!state.manualBounds || state.manualShapes.length === 0) {
      return;
    }

    const coords = getCanvasCoordinates(event, manualCanvas);
    if (!pointInUniverse(coords.x, coords.y, state.manualBounds)) {
      return;
    }

    const key = membershipKey(coords.x, coords.y, state.manualShapes);
    if (!key) {
      return;
    }

    if (state.manualSelected.has(key)) {
      state.manualSelected.delete(key);
    } else {
      state.manualSelected.add(key);
    }

    updateManualOutputs();
    drawManualDiagram();
  });
}

function insertAtCursor(text) {
  const start = exprInput.selectionStart;
  const end = exprInput.selectionEnd;
  const value = exprInput.value;
  exprInput.value = value.slice(0, start) + text + value.slice(end);

  const cursorOffset = text.includes("  ") ? text.indexOf("  ") + 1 : text.length;
  const newPos = start + cursorOffset;
  exprInput.selectionStart = newPos;
  exprInput.selectionEnd = newPos;
  normalizeTermField();
  exprInput.focus();
  updateFromTermInput();
}

function normalizeTerm(term) {
  return term.replace(/\s+/g, "");
}

function normalizeTermField() {
  const original = exprInput.value;
  const cursor = exprInput.selectionStart ?? original.length;
  const beforeCursor = original.slice(0, cursor);
  const normalized = normalizeTerm(original);
  const normalizedCursor = normalizeTerm(beforeCursor).length;

  if (normalized !== original) {
    exprInput.value = normalized;
    exprInput.selectionStart = normalizedCursor;
    exprInput.selectionEnd = normalizedCursor;
  }
}

function updateFromTermInput() {
  const source = exprInput.value.trim();
  if (!source) {
    errorBox.textContent = "";
    setErrorOverlayVisible(false);
    drawEmpty(vennCtx, vennCanvas, "Gib links einen Mengenterm ein.");
    setCountEl.textContent = "Mengen: 0";
    universeInfoEl.textContent = "Grundmenge: –";
    return;
  }

  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();
    parser.expect("EOF");

    const allSetNames = Array.from(collectSets(ast)).sort();
    const shouldBlockUniverseDetect = Boolean(lockUniverseDetectEl?.checked);
    const universe = shouldBlockUniverseDetect ? null : detectUniverse(ast, allSetNames);
    const visibleSets = allSetNames.filter((name) => name !== universe);

    setCountEl.textContent = `Mengen: ${visibleSets.length}`;
    if (shouldBlockUniverseDetect) {
      universeInfoEl.textContent = "Grundmenge: blockiert";
    } else {
      universeInfoEl.textContent = universe ? `Grundmenge: ${universe}` : "Grundmenge: keine";
    }

    drawTermDiagram(ast, visibleSets, universe);
    setErrorOverlayVisible(false);
    errorBox.textContent = "";
  } catch (error) {
    drawEmpty(vennCtx, vennCanvas, "Term konnte nicht gezeichnet werden.");
    setErrorOverlayVisible(true);
    errorBox.textContent = `Fehler im Term: ${error.message}`;
  }
}

function setErrorOverlayVisible(visible) {
  if (!errorOverlayImage) return;

  const shouldShow = visible && state.mode !== "manual";
  errorOverlayImage.classList.toggle("visible", shouldShow);

  if (canvasWraps.term) {
    canvasWraps.term.classList.toggle("hidden-by-error", shouldShow);
  }

  if (diagramPanel) {
    diagramPanel.classList.toggle("error-active", shouldShow);
  }
}

function detectUniverse(ast, setNames) {
  const candidates = universeCandidates.filter((name) => setNames.includes(name));
  if (candidates.length === 0) {
    return null;
  }

  const preferred = candidates[0];
  if (hasComplement(ast)) {
    return preferred;
  }

  for (const candidate of candidates) {
    if (hasDiffWithLeft(ast, candidate)) {
      return candidate;
    }
  }

  return setNames.length >= 2 ? preferred : null;
}

function hasComplement(node) {
  if (!node) return false;
  if (node.type === "comp") return true;
  if (node.type === "union" || node.type === "inter" || node.type === "diff" || node.type === "symdiff") {
    return hasComplement(node.left) || hasComplement(node.right);
  }
  return false;
}

function hasDiffWithLeft(node, leftSetName) {
  if (!node) return false;
  if (node.type === "diff" && node.left.type === "set" && node.left.name === leftSetName) {
    return true;
  }
  if (node.type === "union" || node.type === "inter" || node.type === "diff" || node.type === "symdiff") {
    return hasDiffWithLeft(node.left, leftSetName) || hasDiffWithLeft(node.right, leftSetName);
  }
  if (node.type === "comp") {
    return hasDiffWithLeft(node.value, leftSetName);
  }
  return false;
}

function collectSets(node, out = new Set()) {
  if (!node) return out;
  if (node.type === "set") {
    out.add(node.name);
    return out;
  }
  if (node.type === "comp") {
    return collectSets(node.value, out);
  }
  if (node.type === "union" || node.type === "inter" || node.type === "diff" || node.type === "symdiff") {
    collectSets(node.left, out);
    collectSets(node.right, out);
  }
  return out;
}

function drawEmpty(context, canvasEl, message) {
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
  context.fillStyle = getCssVar("--canvas");
  context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  context.fillStyle = getCssVar("--muted");
  context.font = "16px Inter, sans-serif";
  context.fillText(message, 24, 40);
}

function drawTermDiagram(ast, setNames, universe) {
  vennCtx.clearRect(0, 0, vennCanvas.width, vennCanvas.height);
  vennCtx.fillStyle = getCssVar("--canvas");
  vennCtx.fillRect(0, 0, vennCanvas.width, vennCanvas.height);

  const bounds = {
    x: 60,
    y: 60,
    width: vennCanvas.width - 120,
    height: vennCanvas.height - 120,
  };

  if (setNames.length === 0 && universe) {
    drawUniverseBox(vennCtx, bounds, universe);
    return;
  }

  const maxRenderable = 5;
  const renderSets = setNames.slice(0, maxRenderable);
  const omitted = setNames.length - renderSets.length;

  const shapes = createShapes(renderSets, bounds);
  applySavedLayout("term", renderSets, shapes, bounds);
  state.termShapes = shapes;
  state.termBounds = bounds;
  state.termSetNames = [...renderSets];
  const step = 3;

  for (let x = bounds.x; x < bounds.x + bounds.width; x += step) {
    for (let y = bounds.y; y < bounds.y + bounds.height; y += step) {
      const insideUniverse = pointInUniverse(x, y, bounds);
      const membership = {};

      for (const shape of shapes) {
        membership[shape.name] = shape.contains(x, y);
      }

      if (universe) {
        membership[universe] = insideUniverse;
      }

      const insideResult = evaluate(ast, membership);
      if (insideResult && insideUniverse) {
        vennCtx.fillStyle = "rgba(37, 99, 235, 0.48)";
        vennCtx.fillRect(x, y, step, step);
      }
    }
  }

  if (universe) {
    drawUniverseBox(vennCtx, bounds, universe);
  }

  drawShapesWithLabels(vennCtx, shapes);

  if (omitted > 0) {
    vennCtx.fillStyle = getCssVar("--danger");
    vennCtx.font = "15px Inter, sans-serif";
    vennCtx.fillText(`${omitted} Menge(n) werden nicht gezeichnet (max. 4).`, 70, vennCanvas.height - 20);
  }
}

function drawManualDiagram() {
  manualCtx.clearRect(0, 0, manualCanvas.width, manualCanvas.height);
  manualCtx.fillStyle = getCssVar("--canvas");
  manualCtx.fillRect(0, 0, manualCanvas.width, manualCanvas.height);

  const bounds = {
    x: 60,
    y: 60,
    width: manualCanvas.width - 120,
    height: manualCanvas.height - 120,
  };

  const setNames = getSetNames(state.manualSetCount);
  const shapes = createShapes(setNames, bounds);
  applySavedLayout("manual", setNames, shapes, bounds);
  state.manualShapes = shapes;
  state.manualBounds = bounds;
  state.manualSetNames = [...setNames];

  const step = 3;
  for (let x = bounds.x; x < bounds.x + bounds.width; x += step) {
    for (let y = bounds.y; y < bounds.y + bounds.height; y += step) {
      const key = membershipKey(x, y, shapes);
      if (state.manualSelected.has(key)) {
        manualCtx.fillStyle = "rgba(37, 99, 235, 0.48)";
        manualCtx.fillRect(x, y, step, step);
      }
    }
  }

  drawUniverseBox(manualCtx, bounds, "M");
  drawShapesWithLabels(manualCtx, shapes);

  manualCtx.fillStyle = getCssVar("--muted");
  manualCtx.font = "14px Inter, sans-serif";
  manualCtx.fillText(`Klick auf Flächen zum Ein-/Ausschalten (${setNames.join(",")})`, bounds.x + 8, manualCanvas.height - 18);
}

function updateManualOutputs() {
  const selected = Array.from(state.manualSelected).sort();
  manualCountEl.textContent = `Ausgewählte Bereiche: ${selected.length}`;
  const setNames = getSetNames(state.manualSetCount);

  if (selected.length === 0) {
    manualTermEl.value = "∅";
    manualAlternativesEl.innerHTML = "<li>∅</li>";
    manualStepsEl.innerHTML = "<li>Gedanklich zuerst die Ziel-Bereiche festlegen, die enthalten sein sollen.</li>";
    return;
  }

  const alternatives = buildAlternativeExpressions(selected, setNames);
  const simplified = alternatives[0] || "∅";
  manualTermEl.value = simplified;
  manualAlternativesEl.innerHTML = alternatives.map((expr) => `<li>${expr}</li>`).join("");

  manualStepsEl.innerHTML = [
    "<li>Zuerst überlegen: Welche Kombinationen der Mengen sollen gelten?</li>",
    `<li>Dann diese Kombinationen als Boolesche Fälle zusammenfassen (${selected.length} aktive Bereiche).</li>`,
    `<li>Zum Schluss den Ausdruck logisch vereinfachen: ${simplified}</li>`,
  ].join("");
}

function buildAlternativeExpressions(selectedKeys, setNames) {
  const uniqueKeys = Array.from(new Set(selectedKeys)).sort();
  const n = setNames.length;
  const universeSize = 2 ** n;

  const simplified = simplifyRegionKeys(uniqueKeys, setNames, "M");
  const canonicalDNF = uniqueKeys.map((key) => keyToMinterm(key, setNames)).join(" ∪ ") || "∅";

  const countPatternExpr = buildCountPatternExpression(uniqueKeys, setNames);

  const allKeys = Array.from({ length: universeSize }, (_, index) => index.toString(2).padStart(n, "0"));
  const selectedSet = new Set(uniqueKeys);
  const complementKeys = allKeys.filter((key) => !selectedSet.has(key));

  const results = [countPatternExpr, simplified, canonicalDNF];
  if (complementKeys.length > 0) {
    const complementSimplified = simplifyRegionKeys(complementKeys, setNames, "M");
    results.push(`(${complementSimplified})'`);
  }

  return Array.from(new Set(results.filter(Boolean)));
}

function buildCountPatternExpression(selectedKeys, setNames) {
  const n = setNames.length;
  if (selectedKeys.length === 0) return "∅";

  const selected = new Set(selectedKeys);
  const allKeys = Array.from({ length: 2 ** n }, (_, mask) => mask.toString(2).padStart(n, "0"));
  const selectedCounts = selectedKeys.map((key) => countOnes(key));

  const allSame = selectedCounts.every((value) => value === selectedCounts[0]);
  if (allSame) {
    const k = selectedCounts[0];
    if (k === 0) {
      return `(${buildThresholdUnion(setNames, 1)})'`;
    }
    if (k === n) {
      return setNames.join(" ∩ ");
    }

    const targetKeys = allKeys.filter((key) => countOnes(key) === k);
    if (sameKeySet(selected, targetKeys)) {
      const uk = buildThresholdUnion(setNames, k);
      const uk1 = buildThresholdUnion(setNames, k + 1);
      return `(${uk}) - (${uk1})`;
    }
  }

  for (let k = 1; k <= n; k += 1) {
    const targetKeys = allKeys.filter((key) => countOnes(key) >= k);
    if (sameKeySet(selected, targetKeys)) {
      return buildThresholdUnion(setNames, k);
    }
  }

  for (let k = 0; k < n; k += 1) {
    const targetKeys = allKeys.filter((key) => countOnes(key) <= k);
    if (sameKeySet(selected, targetKeys)) {
      return `(${buildThresholdUnion(setNames, k + 1)})'`;
    }
  }

  return null;
}

function buildThresholdUnion(setNames, threshold) {
  const combos = combinations(setNames, threshold);
  const terms = combos.map((combo) => combo.join(" ∩ "));
  if (terms.length === 0) return "∅";
  if (terms.length === 1) return terms[0];
  return terms.map((term) => `(${term})`).join(" ∪ ");
}

function combinations(items, size) {
  const out = [];

  function backtrack(start, current) {
    if (current.length === size) {
      out.push([...current]);
      return;
    }

    for (let index = start; index < items.length; index += 1) {
      current.push(items[index]);
      backtrack(index + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return out;
}

function countOnes(bits) {
  let count = 0;
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === "1") count += 1;
  }
  return count;
}

function sameKeySet(aSet, bKeys) {
  if (aSet.size !== bKeys.length) return false;
  for (const key of bKeys) {
    if (!aSet.has(key)) return false;
  }
  return true;
}

function keyToMinterm(key, setNames) {
  const parts = [];
  for (let i = 0; i < key.length; i += 1) {
    parts.push(key[i] === "1" ? setNames[i] : `${setNames[i]}'`);
  }
  return parts.join(" ∩ ");
}

function simplifyRegionKeys(regionKeys, varNames, universeName = "M") {
  const varCount = varNames.length;
  const unique = Array.from(new Set(regionKeys));
  if (unique.length === 0) return "∅";
  if (unique.length === 2 ** varCount) return universeName;

  const minterms = unique.map((key) => parseInt(key, 2)).sort((a, b) => a - b);
  const selected = new Set(minterms);

  let groups = minterms.map((value) => ({
    bits: value.toString(2).padStart(varCount, "0"),
    covers: new Set([value]),
    used: false,
  }));

  const primeMap = new Map();

  while (groups.length > 0) {
    groups.forEach((item) => {
      item.used = false;
    });

    const nextMap = new Map();

    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        const combinedBits = combineBits(groups[i].bits, groups[j].bits);
        if (!combinedBits) continue;

        groups[i].used = true;
        groups[j].used = true;

        const coverSet = new Set([...groups[i].covers, ...groups[j].covers]);
        const key = `${combinedBits}|${Array.from(coverSet).sort((a, b) => a - b).join(",")}`;
        if (!nextMap.has(key)) {
          nextMap.set(key, { bits: combinedBits, covers: coverSet, used: false });
        }
      }
    }

    for (const item of groups) {
      if (!item.used) {
        const key = `${item.bits}|${Array.from(item.covers).sort((a, b) => a - b).join(",")}`;
        primeMap.set(key, { bits: item.bits, covers: item.covers });
      }
    }

    groups = Array.from(nextMap.values());
  }

  const primeImplicants = Array.from(primeMap.values()).filter((imp) => {
    for (const covered of imp.covers) {
      if (selected.has(covered)) return true;
    }
    return false;
  });

  const mintermToImps = new Map();
  for (const minterm of minterms) {
    mintermToImps.set(
      minterm,
      primeImplicants.filter((imp) => imp.covers.has(minterm)),
    );
  }

  const chosen = [];
  const covered = new Set();

  for (const minterm of minterms) {
    const covering = mintermToImps.get(minterm) || [];
    if (covering.length === 1) {
      const essential = covering[0];
      if (!chosen.includes(essential)) {
        chosen.push(essential);
      }
      essential.covers.forEach((value) => {
        if (selected.has(value)) covered.add(value);
      });
    }
  }

  const remainingMinterms = minterms.filter((m) => !covered.has(m));
  if (remainingMinterms.length > 0) {
    const candidates = primeImplicants.filter((imp) => !chosen.includes(imp));
    const extra = pickMinimalCover(remainingMinterms, candidates, selected);
    for (const imp of extra) {
      chosen.push(imp);
      imp.covers.forEach((value) => {
        if (selected.has(value)) covered.add(value);
      });
    }
  }

  const expression = chosen
    .map((imp) => implicantToExpression(imp.bits, varNames))
    .filter(Boolean)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .join(" ∪ ");

  return expression || "∅";
}

function combineBits(a, b) {
  let differences = 0;
  let out = "";

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) {
      out += a[i];
      continue;
    }

    if (a[i] === "-" || b[i] === "-") {
      return null;
    }

    differences += 1;
    out += "-";
    if (differences > 1) {
      return null;
    }
  }

  return differences === 1 ? out : null;
}

function pickMinimalCover(remainingMinterms, candidates, selectedSet) {
  if (remainingMinterms.length === 0) return [];
  if (candidates.length === 0) return [];

  if (candidates.length > 20) {
    return greedyCover(remainingMinterms, candidates, selectedSet);
  }

  let bestSubset = null;

  const total = 1 << candidates.length;
  for (let mask = 1; mask < total; mask += 1) {
    const subset = [];
    const covered = new Set();

    for (let i = 0; i < candidates.length; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      const imp = candidates[i];
      subset.push(imp);
      imp.covers.forEach((value) => covered.add(value));
    }

    const allCovered = remainingMinterms.every((m) => covered.has(m));
    if (!allCovered) continue;

    if (!bestSubset || subset.length < bestSubset.length) {
      bestSubset = subset;
      continue;
    }

    if (bestSubset && subset.length === bestSubset.length) {
      const score = subset.reduce((acc, item) => acc + literalCount(item.bits), 0);
      const bestScore = bestSubset.reduce((acc, item) => acc + literalCount(item.bits), 0);
      if (score < bestScore) {
        bestSubset = subset;
      }
    }
  }

  return bestSubset || [];
}

function greedyCover(remainingMinterms, candidates, selectedSet) {
  const uncovered = new Set(remainingMinterms);
  const picked = [];

  while (uncovered.size > 0) {
    let best = null;
    let bestGain = -1;
    let bestCost = Infinity;

    for (const candidate of candidates) {
      if (picked.includes(candidate)) continue;
      let gain = 0;
      candidate.covers.forEach((value) => {
        if (selectedSet.has(value) && uncovered.has(value)) gain += 1;
      });
      if (gain <= 0) continue;

      const cost = literalCount(candidate.bits);
      if (gain > bestGain || (gain === bestGain && cost < bestCost)) {
        best = candidate;
        bestGain = gain;
        bestCost = cost;
      }
    }

    if (!best) break;
    picked.push(best);
    best.covers.forEach((value) => uncovered.delete(value));
  }

  return picked;
}

function literalCount(bits) {
  return bits.split("").filter((ch) => ch !== "-").length;
}

function implicantToExpression(bits, vars) {
  const terms = [];

  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] === "-") continue;
    terms.push(bits[i] === "1" ? vars[i] : `${vars[i]}'`);
  }

  if (terms.length === 0) return "M";
  return terms.join(" ∩ ");
}

function membershipKey(x, y, shapes) {
  const bits = shapes.map((shape) => (shape.contains(x, y) ? "1" : "0"));
  return bits.join("");
}

function getCanvasCoordinates(event, canvasEl) {
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = canvasEl.width / rect.width;
  const scaleY = canvasEl.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawUniverseBox(context, bounds, universeName) {
  context.strokeStyle = getCssVar("--text");
  context.lineWidth = 2;
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.fillStyle = getCssVar("--text");
  context.font = "bold 18px Inter, sans-serif";
  context.fillText(universeName, bounds.x + 8, bounds.y + 24);
}

function drawShapesWithLabels(context, shapes) {
  for (const shape of shapes) {
    context.beginPath();
    context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    context.lineWidth = 2;
    context.strokeStyle = getCssVar("--text");
    context.stroke();

    context.fillStyle = getCssVar("--text");
    context.font = "bold 18px Inter, sans-serif";
    context.fillText(shape.name, shape.cx - 6, shape.cy - shape.r - 10);
  }
}

function pointInUniverse(x, y, bounds) {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function createShapes(setNames, bounds) {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const maxR = Math.min(bounds.width, bounds.height) * 0.23;

  if (setNames.length === 1) {
    return [circle(setNames[0], centerX, centerY, maxR)];
  }

  if (setNames.length === 2) {
    return [
      circle(setNames[0], centerX - maxR * 0.72, centerY, maxR),
      circle(setNames[1], centerX + maxR * 0.72, centerY, maxR),
    ];
  }

  if (setNames.length === 3) {
    return [
      circle(setNames[0], centerX - maxR * 0.72, centerY + maxR * 0.36, maxR),
      circle(setNames[1], centerX + maxR * 0.72, centerY + maxR * 0.36, maxR),
      circle(setNames[2], centerX, centerY - maxR * 0.62, maxR),
    ];
  }

  if (setNames.length === 4) {
    return [
      circle(setNames[0], centerX - maxR * 0.8, centerY - maxR * 0.58, maxR * 0.96),
      circle(setNames[1], centerX + maxR * 0.8, centerY - maxR * 0.58, maxR * 0.96),
      circle(setNames[2], centerX - maxR * 0.8, centerY + maxR * 0.58, maxR * 0.96),
      circle(setNames[3], centerX + maxR * 0.8, centerY + maxR * 0.58, maxR * 0.96),
    ];
  }

  if (setNames.length === 5) {
    const orbit = maxR * 1.05;
    const r = maxR * 0.78;
    return setNames.map((name, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
      return circle(name, centerX + Math.cos(angle) * orbit, centerY + Math.sin(angle) * orbit, r);
    });
  }

  return [];
}

function getSetNames(count) {
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

function getLayoutKey(setNames) {
  return setNames.join("|");
}

function applySavedLayout(mode, setNames, shapes, bounds) {
  const store = mode === "manual" ? state.manualLayouts : state.termLayouts;
  const key = getLayoutKey(setNames);
  const positions = store[key];
  if (!positions) return;

  for (const shape of shapes) {
    const saved = positions[shape.name];
    if (!saved) continue;
    shape.cx = clamp(saved.cx, bounds.x + shape.r, bounds.x + bounds.width - shape.r);
    shape.cy = clamp(saved.cy, bounds.y + shape.r, bounds.y + bounds.height - shape.r);
  }
}

function saveLayoutPosition(mode, setNames, shape) {
  const store = mode === "manual" ? state.manualLayouts : state.termLayouts;
  const key = getLayoutKey(setNames);
  if (!store[key]) {
    store[key] = {};
  }
  store[key][shape.name] = { cx: shape.cx, cy: shape.cy };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function analyzeTaskPrompt() {
  const prompt = (taskPromptEl?.value || "").trim();
  const setCount = Number(taskSetCountEl?.value || 3);
  const setNames = getSetNames(setCount);

  if (!prompt) {
    taskParseInfoEl.textContent = "Bitte gib zuerst eine Aufgaben-Formulierung ein.";
    return;
  }

  const parsed = parseTaskPrompt(prompt, setNames);
  if (!parsed) {
    taskParseInfoEl.textContent = "Formulierung nicht erkannt. Beispiele: mindestens 3, genau 2, höchstens 1, zu keiner, nur Menge A.";
    return;
  }

  taskParseInfoEl.textContent = `Erkannt: ${parsed.intent}`;
  taskTermEl.value = parsed.expression;
  exprInput.value = normalizeTerm(parsed.expression);
  updateFromTermInput();
}

function parseTaskPrompt(input, setNames) {
  const text = normalizePrompt(input);
  const n = setNames.length;

  const onlyMatch = text.match(/(ausschliesslich|nur)(?:\s+zu)?(?:\s+menge)?\s+([a-z])/);
  if (onlyMatch) {
    const target = onlyMatch[2].toUpperCase();
    const idx = setNames.indexOf(target);
    if (idx >= 0) {
      const bits = setNames.map((_, i) => (i === idx ? "1" : "0")).join("");
      return {
        intent: `ausschließlich ${target}`,
        expression: simplifyRegionKeys([bits], setNames, "M"),
      };
    }
  }

  if (text.includes("keiner") || text.includes("zu keiner")) {
    return buildCountIntent(0, "eq", setNames, "zu keiner Menge");
  }

  if (text.includes("allen") || text.includes("alle mengen") || text.includes("zu allen")) {
    return buildCountIntent(n, "eq", setNames, "zu allen Mengen");
  }

  const atLeast = extractNumberAfterKeywords(text, ["mindestens", "wenigstens"]);
  if (atLeast !== null) {
    return buildCountIntent(atLeast, "gte", setNames, `mindestens ${atLeast}`);
  }

  const exactly = extractNumberAfterKeywords(text, ["genau", "exakt"]);
  if (exactly !== null) {
    return buildCountIntent(exactly, "eq", setNames, `genau ${exactly}`);
  }

  const atMost = extractNumberAfterKeywords(text, ["hoechstens", "höchstens", "maximal"]);
  if (atMost !== null) {
    return buildCountIntent(atMost, "lte", setNames, `höchstens ${atMost}`);
  }

  return null;
}

function buildCountIntent(value, mode, setNames, intentLabel) {
  const n = setNames.length;
  const k = Math.max(0, Math.min(n, value));
  const selectedKeys = [];

  for (let mask = 0; mask < 2 ** n; mask += 1) {
    const bits = mask.toString(2).padStart(n, "0");
    const count = bits.split("").filter((x) => x === "1").length;
    const ok = mode === "gte" ? count >= k : mode === "lte" ? count <= k : count === k;
    if (ok) selectedKeys.push(bits);
  }

  return {
    intent: intentLabel,
    expression: simplifyRegionKeys(selectedKeys, setNames, "M"),
  };
}

function extractNumberAfterKeywords(text, keywords) {
  const keywordPattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const numberToken = "(keiner|keine|einer|eine|eins|zwei|drei|vier|fuenf|fünf|\\d+)";
  const pattern = `(?:${keywordPattern})\\s+${numberToken}(?:\\s+von\\s+\\d+)?`;
  const match = text.match(new RegExp(pattern, "i"));

  if (!match) return null;
  return toNumberToken((match[1] || "").toLowerCase());
}

function normalizePrompt(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumberToken(token) {
  const map = {
    keiner: 0,
    keine: 0,
    einer: 1,
    eine: 1,
    eins: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    fuenf: 5,
    "fünf": 5,
  };

  if (Object.prototype.hasOwnProperty.call(map, token)) {
    return map[token];
  }

  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function circle(name, cx, cy, r) {
  return {
    name,
    cx,
    cy,
    r,
    contains(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      return dx * dx + dy * dy <= r * r;
    },
  };
}

function evaluate(node, membership) {
  if (node.type === "set") {
    return Boolean(membership[node.name]);
  }
  if (node.type === "union") {
    return evaluate(node.left, membership) || evaluate(node.right, membership);
  }
  if (node.type === "inter") {
    return evaluate(node.left, membership) && evaluate(node.right, membership);
  }
  if (node.type === "diff") {
    return evaluate(node.left, membership) && !evaluate(node.right, membership);
  }
  if (node.type === "symdiff") {
    const left = evaluate(node.left, membership);
    const right = evaluate(node.right, membership);
    return left !== right;
  }
  if (node.type === "comp") {
    return !evaluate(node.value, membership);
  }
  return false;
}

function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN" });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "RPAREN" });
      i += 1;
      continue;
    }

    if (ch === "{") {
      tokens.push({ type: "LPAREN" });
      i += 1;
      continue;
    }

    if (ch === "}") {
      tokens.push({ type: "RPAREN" });
      i += 1;
      continue;
    }

    if (ch === "∩") {
      tokens.push({ type: "INTER" });
      i += 1;
      continue;
    }

    if (ch === "∪") {
      tokens.push({ type: "UNION" });
      i += 1;
      continue;
    }

    if (ch === "-") {
      tokens.push({ type: "DIFF" });
      i += 1;
      continue;
    }

    if (ch === "△" || ch === "∆" || ch === "⊕") {
      tokens.push({ type: "SYMDIFF" });
      i += 1;
      continue;
    }

    if (ch === "∖" || ch === "\\") {
      if (ch === "∖") {
        tokens.push({ type: "DIFF" });
        i += 1;
        continue;
      }

      if (input[i + 1] === "\\") {
        i += 1;
        continue;
      }

      let j = i + 1;
      while (j < input.length && /[a-zA-Z]/.test(input[j])) {
        j += 1;
      }

      const command = input.slice(i + 1, j).toLowerCase();
      if (command === "cap") {
        tokens.push({ type: "INTER" });
      } else if (command === "cup") {
        tokens.push({ type: "UNION" });
      } else if (command === "triangle" || command === "delta" || command === "oplus" || command === "symdiff") {
        tokens.push({ type: "SYMDIFF" });
      } else if (command === "setminus" || command === "smallsetminus") {
        tokens.push({ type: "DIFF" });
      } else if (command === "complement") {
        tokens.push({ type: "COMP" });
      } else if (command === "neg") {
        tokens.push({ type: "COMP" });
      } else {
        throw new Error(`Unbekannter Befehl \\${command}`);
      }

      i = j;
      continue;
    }

    if (ch === "!") {
      tokens.push({ type: "COMP" });
      i += 1;
      continue;
    }

    if (ch === "¬") {
      tokens.push({ type: "COMP" });
      i += 1;
      continue;
    }

    if (ch === "'") {
      tokens.push({ type: "POSTCOMP" });
      i += 1;
      continue;
    }

    if (/[A-Za-zΩ]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_Ω]/.test(input[j])) {
        j += 1;
      }
      const name = input.slice(i, j).toUpperCase();
      tokens.push({ type: "SET", value: name });
      i = j;
      continue;
    }

    throw new Error(`Unerwartetes Zeichen: ${ch}`);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  peek() {
    return this.tokens[this.current];
  }

  consume() {
    const token = this.tokens[this.current];
    this.current += 1;
    return token;
  }

  expect(type) {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Erwartet ${type}, gefunden ${token.type}`);
    }
    return this.consume();
  }

  parseExpression() {
    let node = this.parseTerm();

    while (this.peek().type === "UNION" || this.peek().type === "SYMDIFF") {
      const op = this.consume();
      const right = this.parseTerm();
      node = { type: op.type === "UNION" ? "union" : "symdiff", left: node, right };
    }

    return node;
  }

  parseTerm() {
    let node = this.parseUnary();

    while (this.peek().type === "INTER" || this.peek().type === "DIFF") {
      const op = this.consume();
      const right = this.parseUnary();
      node = {
        type: op.type === "INTER" ? "inter" : "diff",
        left: node,
        right,
      };
    }

    return node;
  }

  parseUnary() {
    if (this.peek().type === "COMP") {
      this.consume();
      return { type: "comp", value: this.parseUnary() };
    }

    let node = this.parsePrimary();
    while (this.peek().type === "POSTCOMP") {
      this.consume();
      node = { type: "comp", value: node };
    }
    return node;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === "SET") {
      this.consume();
      return { type: "set", name: token.value };
    }

    if (token.type === "LPAREN") {
      this.consume();
      const inner = this.parseExpression();
      this.expect("RPAREN");
      return inner;
    }

    throw new Error(`Unerwartetes Token ${token.type}`);
  }
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
