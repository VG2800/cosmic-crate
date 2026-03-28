const svg = d3.select("#chart");
const tooltip = d3.select("#tooltip");
const legendContainer = d3.select("#legend");
const genreFilter = d3.select("#genre-filter");
const popularitySlider = d3.select("#popularity-slider");
const popularityValue = d3.select("#popularity-value");
const renderStats = d3.select("#render-stats");
const densityToggle = d3.select("#density-toggle");
const storyPrevButton = d3.select("#story-prev");
const storyNextButton = d3.select("#story-next");
const storyResetButton = d3.select("#story-reset");
const storyStepLabel = d3.select("#story-step-label");
const storyNote = d3.select("#story-note");
const storyGuide = d3.select("#story-guide");
const targetDanceability = d3.select("#target-danceability");
const targetEnergy = d3.select("#target-energy");
const targetValence = d3.select("#target-valence");
const targetDanceabilityValue = d3.select("#target-danceability-value");
const targetEnergyValue = d3.select("#target-energy-value");
const targetValenceValue = d3.select("#target-valence-value");
const recommendScopeSelect = d3.select("#recommend-scope");
const recommendButton = d3.select("#recommend-btn");
const recommendSummary = d3.select("#recommend-summary");
const recommendList = d3.select("#recommend-list");
const embedStatus = d3.select("#embed-status");
const spotifyEmbed = d3.select("#spotify-embed");
const embedTrackSelector = d3.select("#embed-track-selector");
const quadrantGrid = d3.select("#quadrant-grid");
const clearFocusButton = d3.select("#clear-focus");
const quadrantTooltip = d3.select("#quadrant-tooltip");
const insightSummary = d3.select("#insight-summary");
const vibeScopeSvg = d3.select("#vibe-scope");
const scopeMeta = d3.select("#scope-meta");

document.addEventListener("DOMContentLoaded", () => {
  const infoTooltip = document.getElementById("info-tooltip");

  function showInfoTooltip(el, text) {
    if (!text || !infoTooltip) return;
    const rect = el.getBoundingClientRect();
    infoTooltip.innerHTML = text;
    infoTooltip.style.left = `${rect.left + rect.width / 2}px`;
    infoTooltip.style.top = `${rect.bottom + 10}px`;
    infoTooltip.setAttribute("aria-hidden", "false");
    infoTooltip.classList.add("show");
  }

  function hideInfoTooltip() {
    if (!infoTooltip) return;
    infoTooltip.classList.remove("show");
    infoTooltip.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll('.metric-info').forEach((btn) => {
    const tip = btn.dataset.tooltip || btn.getAttribute('title');
    if (btn.hasAttribute('title')) btn.removeAttribute('title');
    btn.addEventListener('mouseenter', () => showInfoTooltip(btn, tip));
    btn.addEventListener('mouseleave', hideInfoTooltip);
    btn.addEventListener('focus', () => showInfoTooltip(btn, tip));
    btn.addEventListener('blur', hideInfoTooltip);
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (infoTooltip.classList.contains('show')) hideInfoTooltip();
      else showInfoTooltip(btn, tip);
    }, { passive: false });
  });

  window.addEventListener('scroll', hideInfoTooltip, true);
  window.addEventListener('resize', hideInfoTooltip);
});

const margin = { top: 24, right: 24, bottom: 64, left: 72 };
const width = 1080;
const height = 640;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
const scopeWidth = 280;
const scopeHeight = 200;

svg.attr("viewBox", `0 0 ${width} ${height}`);
vibeScopeSvg.attr("viewBox", `0 0 ${scopeWidth} ${scopeHeight}`);

const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const defs = svg.append("defs");
defs
  .append("clipPath")
  .attr("id", "plot-clip")
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", innerWidth)
  .attr("height", innerHeight);

const gridLayer = root.append("g").attr("class", "grid");
const densityLayer = root
  .append("g")
  .attr("class", "density")
  .attr("clip-path", "url(#plot-clip)");
const pointsLayer = root.append("g").attr("class", "points").attr("clip-path", "url(#plot-clip)");
const xAxisLayer = root.append("g").attr("class", "axis x-axis").attr("transform", `translate(0,${innerHeight})`);
const yAxisLayer = root.append("g").attr("class", "axis y-axis");

const scopeRoot = vibeScopeSvg.append("g").attr("transform", `translate(${scopeWidth / 2},${scopeHeight / 2 + 8})`);
const scopeRingLayer = scopeRoot.append("g");
const scopeAxisLayer = scopeRoot.append("g");
const scopePolygonLayer = scopeRoot.append("g");
const scopeLabelLayer = scopeRoot.append("g");

const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
const rScale = d3.scaleSqrt().range([2.2, 9.5]);
const scopeRadius = 64;

let colorScale;
let allData = [];
let allDataByPopularity = [];
let sampledData = [];
let currentRenderableData = [];
let currentTransform = d3.zoomIdentity;
let currentPopularityMin = 50;
const DEFAULT_POPULARITY_MIN = 50;
const MAX_SAMPLE_POINTS = 5500;
const MAX_RENDER_POINTS = 800;
let sliderRafId = null;
let currentStoryStep = -1;
let currentFilteredPool = [];
let latestRecommendations = [];
let activeQuadrantKey = null;
let isZooming = false;

const storySteps = [
  {
    title: "Mission 1: Arrival — First Contact",
    question: "What musical fingerprints does your landing site emit?",
    description: "Your probe records a broad wash of local music. Scan widely to form a first impression across many genres.",
    outcome: "Outcome: A balanced, exploratory sample across genres to orient the mission.",
    challenge: "Pick a genre you haven't seen yet and find a popular exemplar.",
    genre: "All",
    popularityMin: 40,
    xDomain: [0, 1],
    yDomain: [0, 1],
    targetProfile: { danceability: 0.6, energy: 0.5, valence: 0.55 },
  },
  {
    title: "Mission 2: Market Exchange",
    question: "Where do social, dance-forward tracks gather in marketplaces?",
    description: "Survey tracks commonly used for gatherings and social spaces — higher danceability and approachable energy.",
    outcome: "Outcome: The market-friendly music cluster appears, showing crowd-ready grooves.",
    challenge: "Find a dance/pop track used by humans to energize crowds.",
    genre: "pop",
    popularityMin: 60,
    xDomain: [0.6, 1],
    yDomain: [0.45, 0.85],
    targetProfile: { danceability: 0.8, energy: 0.7, valence: 0.75 },
  },
  {
    title: "Mission 3: Hearth & Home",
    question: "What do the intimate, acoustic corners of this world sound like?",
    description: "Listen for small-scale, acoustic, and singer-songwriter music that favours warmth over intensity.",
    outcome: "Outcome: Hearth music clusters toward lower energy, medium valence and intimacy.",
    challenge: "Find an acoustic track that feels like a domestic moment.",
    genre: "acoustic",
    popularityMin: 35,
    xDomain: [0, 0.6],
    yDomain: [0, 0.5],
    targetProfile: { danceability: 0.35, energy: 0.28, valence: 0.5 },
  },
  {
    title: "Mission 4: Ritual Echoes",
    question: "Which tracks suggest ceremonial or traditional use?",
    description: "Probe for world-music, latin, and folk traditions carrying rhythmic signatures and cultural markers.",
    outcome: "Outcome: Ritual music reveals recurring rhythmic structures and varied valence.",
    challenge: "Identify a world-music or latin track with memorable rhythmic identity.",
    genre: "world-music",
    popularityMin: 45,
    xDomain: [0.2, 0.9],
    yDomain: [0.2, 0.85],
    targetProfile: { danceability: 0.78, energy: 0.6, valence: 0.6 },
  },
  {
    title: "Mission 5: Night Parade",
    question: "How does nightlife push the extremes of tempo and energy?",
    description: "Search the late-night ecosystems — electronic, club, and high-tempo genres dominate here.",
    outcome: "Outcome: Nightlife tracks cluster toward high danceability and energy.",
    challenge: "Find a club/edm track with tempo and energy that stand out.",
    genre: "edm",
    popularityMin: 50,
    xDomain: [0.7, 1],
    yDomain: [0.6, 1],
    targetProfile: { danceability: 0.9, energy: 0.9, valence: 0.6 },
  },
  {
    title: "Mission 6: Industrial Pulse",
    question: "Where do mechanically intense, high-energy tracks live?",
    description: "Map the industrial, metal, and harder electronic sounds that emphasize power and density.",
    outcome: "Outcome: High-energy, low-groove regions are highlighted for power-focused listening.",
    challenge: "Find a metal or industrial track with energy > 0.9.",
    genre: "metal",
    popularityMin: 40,
    xDomain: [0.1, 0.6],
    yDomain: [0.75, 1],
    targetProfile: { danceability: 0.25, energy: 0.95, valence: 0.45 },
  },
  {
    title: "Mission 7: Oceanic Drift",
    question: "Which tracks evoke wide, ambient, or meditative spaces?",
    description: "Search for ambient, new-age, and cinematic pieces that occupy broad sonic landscapes.",
    outcome: "Outcome: Drift music emphasizes sustained textures and lower rhythmic motion.",
    challenge: "Find an ambient track with very low danceability and high instrumentalness.",
    genre: "ambient",
    popularityMin: 30,
    xDomain: [0, 0.4],
    yDomain: [0, 0.45],
    targetProfile: { danceability: 0.15, energy: 0.18, valence: 0.4 },
  },
  {
    title: "Mission 8: Final Transmission",
    question: "Which track best summarizes the day's sonic discoveries?",
    description: "Synthesize the mission by picking a track that feels representative of the collected insights.",
    outcome: "Outcome: A single exemplar track is selected as the day's transmission back to home.",
    challenge: "Choose a track from any genre that best represents this collection.",
    genre: "All",
    popularityMin: 40,
    xDomain: [0, 1],
    yDomain: [0, 1],
    targetProfile: { danceability: 0.6, energy: 0.6, valence: 0.6 },
  },
];

root
  .append("text")
  .attr("class", "axis-label")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 48)
  .attr("text-anchor", "middle")
  .text("Danceability");

root
  .append("text")
  .attr("class", "axis-label")
  .attr("x", -innerHeight / 2)
  .attr("y", -48)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Energy");

function parseRow(d, i) {
  const song = d.song ?? d.track_name ?? d.name ?? "Unknown Song";
  const artist = d.artist ?? d.artists ?? "Unknown Artist";
  const genre = d.genre ?? d.track_genre ?? "Unknown";
  return {
    id: d.track_id ?? `${song}-${artist}-${i}`,
    trackId: d.track_id ?? null,
    song,
    artist,
    genre,
    danceability: Number.parseFloat(d.danceability),
    energy: Number.parseFloat(d.energy),
    valence: Number.parseFloat(d.valence),
    popularity: Number.parseFloat(d.popularity),
    tempo: Number.parseFloat(d.tempo),
  };
}

function deduplicateTracks(rows) {
  const grouped = d3.group(rows, (d) => getCanonicalTrackKey(d));
  const deduped = [];

  grouped.forEach((group) => {
    const base = group.slice().sort((a, b) => d3.descending(a.popularity, b.popularity))[0];
    const genreCounts = d3
      .rollups(
        group,
        (values) => values.length,
        (d) => d.genre
      )
      .sort((a, b) => d3.descending(a[1], b[1]));

    deduped.push({
      ...base,
      genre: genreCounts[0]?.[0] ?? base.genre,
      duplicateCount: group.length,
    });
  });

  return deduped;
}

const zoomBehavior = d3
  .zoom()
  .filter((event) => {
    if (event.type === "wheel") {
      return event.ctrlKey;
    }
    return !event.button;
  })
  .scaleExtent([1, 12])
  .translateExtent([
    [margin.left, margin.top],
    [margin.left + innerWidth, margin.top + innerHeight],
  ])
  .extent([
    [margin.left, margin.top],
    [margin.left + innerWidth, margin.top + innerHeight],
  ])
  .on("start", () => {
    isZooming = true;
    densityLayer.interrupt().style("opacity", 0);
  })
  .on("zoom", (event) => {
    currentTransform = event.transform;
    const zx = getZoomedX();
    const zy = getZoomedY();

    // Zoom events fire frequently; avoid transitions to keep panning smooth.
    xAxisLayer.call(d3.axisBottom(zx).ticks(10).tickFormat(d3.format(".1f")));
    yAxisLayer.call(d3.axisLeft(zy).ticks(10).tickFormat(d3.format(".1f")));
    gridLayer.call(d3.axisLeft(zy).tickSize(-innerWidth).tickFormat("").ticks(8));

    pointsLayer
      .selectAll("circle.dot")
      .attr("cx", (d) => zx(d.danceability))
      .attr("cy", (d) => zy(d.energy));

    densityLayer.style("opacity", 0);
  })
  .on("end", () => {
    isZooming = false;
    const zx = getZoomedX();
    const zy = getZoomedY();
    updateDensity(currentRenderableData, zx, zy, 0);
  });

svg.call(zoomBehavior).on("dblclick.zoom", null);

function getZoomedX() {
  return currentTransform.rescaleX(xScale);
}

function getZoomedY() {
  return currentTransform.rescaleY(yScale);
}

function getTransformForDomains(xDomain, yDomain) {
  const xMin = Math.max(0, Math.min(1, xDomain[0]));
  const xMax = Math.max(xMin + 0.05, Math.min(1, xDomain[1]));
  const yMin = Math.max(0, Math.min(1, yDomain[0]));
  const yMax = Math.max(yMin + 0.05, Math.min(1, yDomain[1]));

  const kx = 1 / (xMax - xMin);
  const ky = 1 / (yMax - yMin);
  const k = Math.min(kx, ky, 12);

  const tx = -xScale(xMin) * k;
  const ty = -yScale(yMax) * k;
  return d3.zoomIdentity.translate(tx, ty).scale(k);
}

async function loadData() {
  const data = await d3.csv("dataset.csv", parseRow);
  if (!data.length) {
    throw new Error("dataset.csv is empty or unreadable");
  }
  return data;
}

function drawAxes(x = getZoomedX(), y = getZoomedY(), duration = 700) {
  xAxisLayer
    .transition()
    .duration(duration)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".1f")));

  yAxisLayer
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".1f")));

  gridLayer
    .transition()
    .duration(duration)
    .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat("").ticks(8));
}

function renderLegend(genres) {
  const items = legendContainer.selectAll(".legend-item").data(genres, (d) => d);

  const itemsEnter = items
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("opacity", 0);

  itemsEnter
    .append("span")
    .attr("class", "legend-swatch")
    .style("color", (d) => colorScale(d))
    .style("background", (d) => colorScale(d));

  itemsEnter.append("span").text((d) => d);

  itemsEnter.transition().duration(500).style("opacity", 1);

  items.exit().transition().duration(300).style("opacity", 0).remove();
}

function updateDensity(data, x, y, duration) {
  if (isZooming) {
    densityLayer.interrupt().style("opacity", 0);
    return;
  }

  if (!densityToggle.property("checked") || data.length < 25) {
    densityLayer.selectAll("path.density-path").remove();
    densityLayer.style("opacity", 0);
    return;
  }

  densityLayer.style("opacity", 1);

  const contours = d3
    .contourDensity()
    .x((d) => x(d.danceability))
    .y((d) => y(d.energy))
    .size([innerWidth, innerHeight])
    .bandwidth(24)
    .thresholds(8)(data);

  const maxValue = d3.max(contours, (d) => d.value) ?? 1;
  const opacityScale = d3.scaleLinear().domain([0, maxValue]).range([0.06, 0.32]);
  const colorScale = d3
    .scaleSequential(d3.interpolateRgbBasis(["#1b3550", "#2b5f88", "#5aa3cf", "#9fd5f0"]))
    .domain([0, maxValue]);

  const paths = densityLayer.selectAll("path.density-path").data(contours, (d) => d.value);

  const merged = paths
    .enter()
    .append("path")
    .attr("class", "density-path")
    .attr("d", d3.geoPath())
    .merge(paths);

  merged
    .attr("d", d3.geoPath())
    .attr("fill", (d) => colorScale(d.value))
    .attr("fill-opacity", (d) => opacityScale(d.value))
    .attr("stroke", (d) => colorScale(Math.max(0, d.value * 0.92)))
    .attr("stroke-opacity", 0.16)
    .style("opacity", 1);

  paths.exit().remove();
}

function showTooltip(event, d) {
  const chartRect = document.querySelector(".chart-card").getBoundingClientRect();
  const tipWidth = 260;
  const tipHeight = 168;
  let left = event.clientX - chartRect.left + 16;
  let top = event.clientY - chartRect.top + 16;

  left = Math.min(left, chartRect.width - tipWidth - 10);
  top = Math.min(top, chartRect.height - tipHeight - 10);
  left = Math.max(10, left);
  top = Math.max(10, top);

  tooltip
    .html(
      `<div class="tip-title">${d.song}</div>` +
        `<div class="tip-grid">` +
        `<span class="meta">Artist: ${d.artist}</span>` +
        `<span class="meta">Genre: ${d.genre}</span>` +
        `<span class="meta">Popularity: ${d.popularity}</span>` +
        `<span class="meta">Energy: ${d.energy.toFixed(2)}</span>` +
        `<span class="meta">Danceability: ${d.danceability.toFixed(2)}</span>` +
        `</div>`
    )
    .classed("show", true)
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.classed("show", false);
}

function getCurrentProfile() {
  return {
    danceability: Number(targetDanceability.property("value")),
    energy: Number(targetEnergy.property("value")),
    valence: Number(targetValence.property("value")),
  };
}

function getPoolProfile(pool) {
  if (!pool.length) {
    return { danceability: 0, energy: 0, valence: 0 };
  }
  return {
    danceability: d3.mean(pool, (d) => d.danceability) ?? 0,
    energy: d3.mean(pool, (d) => d.energy) ?? 0,
    valence: d3.mean(pool, (d) => d.valence) ?? 0,
  };
}

function getScopeVertex(value, angle) {
  const radius = scopeRadius * Math.max(0, Math.min(1, value));
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function profileToScopePoints(profile) {
  const axes = [
    { key: "danceability", angle: -Math.PI / 2 },
    { key: "energy", angle: -Math.PI / 2 + (2 * Math.PI) / 3 },
    { key: "valence", angle: -Math.PI / 2 + (4 * Math.PI) / 3 },
  ];
  return axes.map((axis) => getScopeVertex(profile[axis.key], axis.angle));
}

function drawScopeFrame() {
  const rings = [0.25, 0.5, 0.75, 1];
  const ringData = rings.map((ring) => {
    const r = scopeRadius * ring;
    return [
      [0, -r],
      [Math.cos(-Math.PI / 2 + (2 * Math.PI) / 3) * r, Math.sin(-Math.PI / 2 + (2 * Math.PI) / 3) * r],
      [Math.cos(-Math.PI / 2 + (4 * Math.PI) / 3) * r, Math.sin(-Math.PI / 2 + (4 * Math.PI) / 3) * r],
    ];
  });

  scopeRingLayer
    .selectAll("path.scope-ring")
    .data(ringData)
    .join("path")
    .attr("class", "scope-ring")
    .attr("d", (d) => d3.line().curve(d3.curveLinearClosed)(d));

  const axes = [
    { label: "Dance", angle: -Math.PI / 2 },
    { label: "Energy", angle: -Math.PI / 2 + (2 * Math.PI) / 3 },
    { label: "Valence", angle: -Math.PI / 2 + (4 * Math.PI) / 3 },
  ];

  scopeAxisLayer
    .selectAll("line.scope-axis")
    .data(axes)
    .join("line")
    .attr("class", "scope-axis")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d) => Math.cos(d.angle) * scopeRadius)
    .attr("y2", (d) => Math.sin(d.angle) * scopeRadius);

  scopeLabelLayer
    .selectAll("text.scope-label")
    .data(axes)
    .join("text")
    .attr("class", "scope-label")
    .attr("x", (d) => Math.cos(d.angle) * (scopeRadius + 16))
    .attr("y", (d) => Math.sin(d.angle) * (scopeRadius + 16))
    .text((d) => d.label);
}

function updateVibeScope() {
  const targetProfile = getCurrentProfile();
  const poolProfile = getPoolProfile(currentFilteredPool);

  const targetPath = d3.line().curve(d3.curveLinearClosed)(profileToScopePoints(targetProfile));
  const poolPath = d3.line().curve(d3.curveLinearClosed)(profileToScopePoints(poolProfile));

  scopePolygonLayer
    .selectAll("path.scope-target")
    .data([targetPath])
    .join("path")
    .attr("class", "scope-target")
    .attr("d", (d) => d);

  scopePolygonLayer
    .selectAll("path.scope-mean")
    .data([poolPath])
    .join("path")
    .attr("class", "scope-mean")
    .attr("d", (d) => d);

  scopeMeta.text(
    `Target vs filtered average: dance ${poolProfile.danceability.toFixed(2)}, energy ${poolProfile.energy.toFixed(
      2
    )}, valence ${poolProfile.valence.toFixed(2)}.`
  );
}

function getQuadrantKey(d) {
  const danceSide = d.danceability >= 0.5 ? "highDance" : "lowDance";
  const energySide = d.energy >= 0.5 ? "highEnergy" : "lowEnergy";
  return `${danceSide}|${energySide}`;
}

function getQuadrantLabel(key) {
  const labels = {
    "highDance|highEnergy": "Pulse Core",
    "highDance|lowEnergy": "Groove Pocket",
    "lowDance|highEnergy": "Tension Zone",
    "lowDance|lowEnergy": "Calm Orbit",
  };
  return labels[key] ?? key;
}

function getQuadrantDescription(key) {
  const descriptions = {
    "highDance|highEnergy":
      "Pulse Core: movement-heavy and intense tracks, typically suited for peak-time and party energy.",
    "highDance|lowEnergy":
      "Groove Pocket: rhythm-forward tracks with softer intensity, good for chill movement or laid-back sets.",
    "lowDance|highEnergy":
      "Tension Zone: intense but less groove-centered tracks, often driving or dramatic in feel.",
    "lowDance|lowEnergy":
      "Calm Orbit: mellow and low-intensity tracks, often reflective, ambient, or gentle listening.",
  };
  return descriptions[key] ?? "No description available for this region.";
}

function positionQuadrantTooltip(left, top) {
  const panelRect = document.querySelector(".insight-panel").getBoundingClientRect();
  const tipRect = quadrantTooltip.node().getBoundingClientRect();
  const boundedLeft = Math.max(10, Math.min(left, panelRect.width - tipRect.width - 10));
  const boundedTop = Math.max(10, Math.min(top, panelRect.height - tipRect.height - 10));

  quadrantTooltip.style("left", `${boundedLeft}px`).style("top", `${boundedTop}px`);
}

function showQuadrantTooltip(event, key) {
  const panelRect = document.querySelector(".insight-panel").getBoundingClientRect();
  const left = event.clientX - panelRect.left + 14;
  const top = event.clientY - panelRect.top + 14;
  quadrantTooltip.text(getQuadrantDescription(key)).classed("show", true);
  positionQuadrantTooltip(left, top);
}

function showQuadrantTooltipForElement(element, key) {
  const panelRect = document.querySelector(".insight-panel").getBoundingClientRect();
  const cardRect = element.getBoundingClientRect();
  const left = cardRect.left - panelRect.left + cardRect.width / 2;
  const top = cardRect.top - panelRect.top + cardRect.height + 10;
  quadrantTooltip.text(getQuadrantDescription(key)).classed("show", true);
  positionQuadrantTooltip(left, top);
}

function hideQuadrantTooltip() {
  quadrantTooltip.classed("show", false);
}

function renderQuadrantInsights(data, poolForSummary) {
  const keys = ["lowDance|highEnergy", "highDance|highEnergy", "lowDance|lowEnergy", "highDance|lowEnergy"];
  const total = Math.max(1, data.length);
  const grouped = d3.rollup(
    data,
    (values) => ({
      count: values.length,
      avgPopularity: d3.mean(values, (d) => d.popularity) ?? 0,
    }),
    (d) => getQuadrantKey(d)
  );

  const stats = keys.map((key) => {
    const entry = grouped.get(key) ?? { count: 0, avgPopularity: 0 };
    return {
      key,
      label: getQuadrantLabel(key),
      count: entry.count,
      share: entry.count / total,
      avgPopularity: entry.avgPopularity,
    };
  });

  const cards = quadrantGrid.selectAll("button.quadrant-card").data(stats, (d) => d.key);

  const enter = cards
    .enter()
    .append("button")
    .attr("type", "button")
    .attr("class", "quadrant-card")
    .on("mouseenter", function (event, d) {
      showQuadrantTooltip(event, d.key);
    })
    .on("mousemove", function (event, d) {
      showQuadrantTooltip(event, d.key);
    })
    .on("mouseleave", () => {
      hideQuadrantTooltip();
    })
    .on("focus", function (_, d) {
      showQuadrantTooltipForElement(this, d.key);
    })
    .on("blur", () => {
      hideQuadrantTooltip();
    })
    .on("click", (_, d) => {
      activeQuadrantKey = activeQuadrantKey === d.key ? null : d.key;
      applyFilters({ animate: true });
    });

  enter.append("div").attr("class", "quadrant-title");
  enter.append("p").attr("class", "quadrant-meta");
  enter.append("div").attr("class", "quadrant-bar").append("span").attr("class", "quadrant-fill");

  enter
    .merge(cards)
    .classed("active", (d) => d.key === activeQuadrantKey)
    .select(".quadrant-title")
    .text((d) => d.label);

  enter
    .merge(cards)
    .select(".quadrant-meta")
    .text(
      (d) =>
        `${d.count.toLocaleString()} tracks (${Math.round(d.share * 100)}%) | avg popularity ${d.avgPopularity.toFixed(1)}`
    );

  enter
    .merge(cards)
    .select(".quadrant-fill")
    .style("--fill", (d) => `${Math.round(d.share * 100)}%`);

  cards.exit().remove();

  clearFocusButton.property("disabled", activeQuadrantKey === null);

  const focusLabel = activeQuadrantKey ? getQuadrantLabel(activeQuadrantKey) : "All quadrants";
  const dominant = stats.slice().sort((a, b) => d3.descending(a.share, b.share))[0];
  const poolSize = poolForSummary.length;
  insightSummary.text(
    `Focus: ${focusLabel}. Dominant region: ${dominant.label} at ${Math.round(
      dominant.share * 100
    )}% of visible tracks. Recommendation pool: ${poolSize.toLocaleString()} tracks.`
  );
}

function updateChart(filteredData, options = {}) {
  const shouldAnimate = options.animate !== false;
  const duration = shouldAnimate
    ? filteredData.length > 700
      ? 220
      : filteredData.length > 350
        ? 340
        : 520
    : 0;
  const t = d3.transition().duration(duration).ease(d3.easeCubicInOut);
  const x = getZoomedX();
  const y = getZoomedY();
  currentRenderableData = filteredData;
  const pointScaleFactor = filteredData.length > 800 ? 0.75 : filteredData.length > 500 ? 0.86 : 1;
  const baseOpacity = filteredData.length > 800 ? 0.5 : filteredData.length > 450 ? 0.62 : 0.78;

  updateDensity(filteredData, x, y, duration);

  const circles = pointsLayer.selectAll("circle.dot").data(filteredData, (d) => d.id);

  circles
    .exit()
    .transition(t)
    .attr("r", 0)
    .style("opacity", 0)
    .remove();

  const circlesEnter = circles
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.danceability))
    .attr("cy", (d) => y(d.energy))
    .attr("r", 0)
    .attr("fill", (d) => colorScale(d.genre))
    .style("opacity", 0.2)
    .on("mousemove", function (event, d) {
      showTooltip(event, d);
    })
    .on("mouseenter", function (event, d) {
      d3.select(this)
        .raise()
        .transition()
        .duration(180)
        .attr("r", rScale(d.popularity) * pointScaleFactor * 1.2)
        .style("opacity", 1);
      showTooltip(event, d);
    })
    .on("mouseleave", function (event, d) {
      d3.select(this)
        .transition()
        .duration(180)
        .attr("r", rScale(d.popularity) * pointScaleFactor)
        .style("opacity", baseOpacity);
      hideTooltip();
    });

  circlesEnter
    .merge(circles)
    .transition(t)
    .attr("cx", (d) => x(d.danceability))
    .attr("cy", (d) => y(d.energy))
    .attr("r", (d) => rScale(d.popularity) * pointScaleFactor)
    .attr("fill", (d) => colorScale(d.genre))
    .style("opacity", baseOpacity);

  pointsLayer
    .selectAll("circle.dot")
    .classed("focus-dim", (d) => activeQuadrantKey !== null && getQuadrantKey(d) !== activeQuadrantKey);
}

function updateGenreFilter(genres) {
  const options = genreFilter.selectAll("option.genre-option").data(genres, (d) => d);

  options.enter().append("option").attr("class", "genre-option").attr("value", (d) => d).text((d) => d);
  options.exit().remove();
}

function createRepresentativeSubset(data, targetSize) {
  if (data.length <= targetSize) {
    return data;
  }

  const xBins = 12;
  const yBins = 12;
  const popularityBins = 5;
  const bins = new Map();

  const popExtent = d3.extent(data, (d) => d.popularity);
  const popMin = popExtent[0] ?? 0;
  const popMax = popExtent[1] ?? 100;
  const popRange = Math.max(1, popMax - popMin);

  for (const d of data) {
    const bx = Math.max(0, Math.min(xBins - 1, Math.floor(d.danceability * xBins)));
    const by = Math.max(0, Math.min(yBins - 1, Math.floor(d.energy * yBins)));
    const bp = Math.max(
      0,
      Math.min(popularityBins - 1, Math.floor(((d.popularity - popMin) / popRange) * popularityBins))
    );
    const key = `${d.genre}|${bp}|${bx}|${by}`;

    if (!bins.has(key)) {
      bins.set(key, []);
    }
    bins.get(key).push(d);
  }

  const chosen = [];
  const leftovers = [];

  bins.forEach((bucket) => {
    bucket.sort((a, b) => d3.descending(a.popularity, b.popularity));
    chosen.push(bucket[0]);
    if (bucket.length > 1) {
      leftovers.push(...bucket.slice(1));
    }
  });

  if (chosen.length >= targetSize) {
    const step = Math.ceil(chosen.length / targetSize);
    const compact = [];
    for (let i = 0; i < chosen.length; i += step) {
      compact.push(chosen[i]);
      if (compact.length >= targetSize) {
        break;
      }
    }
    return compact;
  }

  leftovers.sort((a, b) => d3.descending(a.popularity, b.popularity));
  const need = targetSize - chosen.length;
  return chosen.concat(leftovers.slice(0, need));
}

function getRenderableData(filtered) {
  if (filtered.length <= MAX_RENDER_POINTS) {
    return filtered;
  }

  const step = Math.ceil(filtered.length / MAX_RENDER_POINTS);
  const sampled = [];
  for (let i = 0; i < filtered.length; i += step) {
    sampled.push(filtered[i]);
    if (sampled.length >= MAX_RENDER_POINTS) {
      break;
    }
  }
  return sampled;
}

function applyFilters(options = {}) {
  const selectedGenre = genreFilter.property("value");
  let filtered;

  if (selectedGenre === "All") {
    filtered = [];
    for (const d of allDataByPopularity) {
      if (d.popularity < currentPopularityMin) {
        break;
      }
      filtered.push(d);
    }
  } else {
    filtered = sampledData.filter((d) => d.genre === selectedGenre && d.popularity >= currentPopularityMin);
  }

  const focusPool =
    activeQuadrantKey === null ? filtered : filtered.filter((d) => getQuadrantKey(d) === activeQuadrantKey);
  currentFilteredPool = focusPool;

  const renderable = getRenderableData(filtered);
  const visibleGenreCounts = d3.rollups(
    renderable,
    (v) => v.length,
    (d) => d.genre
  )
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 14);

  const compactLegend = visibleGenreCounts.map(([genre, count]) => `${genre} (${count})`);
  const compactLegendKeys = visibleGenreCounts.map(([genre]) => genre);

  const items = legendContainer.selectAll(".legend-item").data(compactLegend, (d) => d);

  const enter = items.enter().append("div").attr("class", "legend-item").style("opacity", 0);
  enter
    .append("span")
    .attr("class", "legend-swatch")
    .style("color", (_, i) => colorScale(compactLegendKeys[i]))
    .style("background", (_, i) => colorScale(compactLegendKeys[i]));
  enter.append("span").text((d) => d);
  enter.transition().duration(300).style("opacity", 1);

  items
    .select(".legend-swatch")
    .style("color", (_, i) => colorScale(compactLegendKeys[i]))
    .style("background", (_, i) => colorScale(compactLegendKeys[i]));
  items.select("span:last-child").text((d) => d);
  items.exit().transition().duration(220).style("opacity", 0).remove();

  renderQuadrantInsights(renderable, focusPool);
  if (activeQuadrantKey === null) {
    renderStats.text(`Alien scanner currently tracking ${filtered.length.toLocaleString()} songs`);
  } else {
    renderStats.text(
      `Alien scanner tracking ${filtered.length.toLocaleString()} songs | ${focusPool.length.toLocaleString()} in focused region`
    );
  }
  updateVibeScope();
  updateChart(renderable, options);
}

function scheduleSliderFilter() {
  if (sliderRafId !== null) {
    cancelAnimationFrame(sliderRafId);
  }
  sliderRafId = requestAnimationFrame(() => {
    sliderRafId = null;
    applyFilters({ animate: false });
  });
}

function clampPopularity(value) {
  const min = Number(popularitySlider.attr("min"));
  const max = Number(popularitySlider.attr("max"));
  return Math.max(min, Math.min(max, value));
}

function formatGenreFocus(genre) {
  return genre === "All" ? "All genres" : genre;
}

function renderGenreAwareText(text, genre) {
  if (!text) {
    return "";
  }
  const genreLabel = genre === "All" ? "all genres" : genre;
  return text.replaceAll("{genre}", genreLabel);
}

function renderStoryNote(step, index) {
  if (!step) {
    storyStepLabel.text("");
    storyNote.html(
      "<h3>Free scan mode</h3><p>Manual control restored. Adjust filters, zoom into clusters, and generate mission picks from your current scan.</p>"
    );
    storyGuide.html(
      `<div class="guide-title">Mission Debrief</div><div class="guide-line">Scanner in passive mode. Launch <strong>Start mission tour</strong> to load a vibe objective.</div><div class="guide-line">Expected output: cluster shift and vibe-aligned picks.</div>`
    );
    storyPrevButton.property("disabled", true);
    storyNextButton.text("Start mission tour");
    return;
  }

  const displayQuestion = renderGenreAwareText(step.question, step.genre);
  const displayDescription = renderGenreAwareText(step.description, step.genre);
  const displayOutcome = renderGenreAwareText(step.outcome, step.genre);
  storyStepLabel.text(`Mission ${index + 1} of ${storySteps.length}`);
  storyNote.html(
    `<h3>${step.title}</h3><p class="story-q">Vibe Objective: ${displayQuestion}</p><p>${displayDescription}</p><p class="story-outcome">${displayOutcome}</p>`
  );
  storyGuide.html(
      `<div class="guide-title">Mission Debrief</div><div class="guide-line"><strong>Scanner adjustments:</strong> genre ${formatGenreFocus(step.genre)}, popularity >= ${step.popularityMin}, profile uploaded.</div><div class="guide-line"><strong>What to inspect:</strong> watch where the dominant cluster shifts in danceability-energy space.</div><div class="guide-line"><strong>Then:</strong> compare the shifted region with Mission Picks telemetry.</div>`
  );
  storyPrevButton.property("disabled", false);
  storyNextButton.text("Next mission");
}

function applyTargetProfile(profile) {
  targetDanceability.property("value", profile.danceability);
  targetEnergy.property("value", profile.energy);
  targetValence.property("value", profile.valence);
  updateTargetLabels();
}

function flashControl(selection) {
  selection.classed("control-flash", false);
  requestAnimationFrame(() => {
    selection.classed("control-flash", true);
    setTimeout(() => selection.classed("control-flash", false), 700);
  });
}

function applyStoryStep(index) {
  if (!storySteps.length) {
    return;
  }

  currentStoryStep = ((index % storySteps.length) + storySteps.length) % storySteps.length;
  const step = storySteps[currentStoryStep];
  activeQuadrantKey = null;

  genreFilter.property("value", step.genre);
  currentPopularityMin = clampPopularity(step.popularityMin);
  popularitySlider.property("value", currentPopularityMin);
  popularityValue.text(currentPopularityMin);
  applyTargetProfile(step.targetProfile);
  renderStoryNote(step, currentStoryStep);
  applyFilters({ animate: true });
  generateRecommendations();

  flashControl(genreFilter);
  flashControl(popularitySlider);
  flashControl(targetDanceability);
  flashControl(targetEnergy);
  flashControl(targetValence);
  flashControl(recommendButton);

  const autoZoomEnabled = AUTO_ZOOM_ON_MISSION;
  const targetTransform = autoZoomEnabled ? getTransformForDomains(step.xDomain, step.yDomain) : d3.zoomIdentity;
  svg.transition().duration(950).ease(d3.easeCubicInOut).call(zoomBehavior.transform, targetTransform);
}


function clearQuadrantFocus(options = {}) {
  activeQuadrantKey = null;
  if (options.reapply !== false) {
    applyFilters({ animate: options.animate !== false });
  }
}



function updateTargetLabels() {
  targetDanceabilityValue.text(Number(targetDanceability.property("value")).toFixed(2));
  targetEnergyValue.text(Number(targetEnergy.property("value")).toFixed(2));
  targetValenceValue.text(Number(targetValence.property("value")).toFixed(2));
  updateVibeScope();
}

function recommendationDistance(track, profile) {
  const pop = Math.max(0, Math.min(1, track.popularity / 100));
  const danceDiff = track.danceability - profile.danceability;
  const energyDiff = track.energy - profile.energy;
  const valenceDiff = track.valence - profile.valence;
  const popDiff = pop - profile.popularity;

  return Math.sqrt(
    danceDiff * danceDiff * 0.34 +
      energyDiff * energyDiff * 0.34 +
      valenceDiff * valenceDiff * 0.2 +
      popDiff * popDiff * 0.12
  );
}

function getCanonicalTrackKey(track) {
  if (isSpotifyTrackId(track.trackId)) {
    return `id:${track.trackId}`;
  }

  const song = String(track.song ?? "").trim().toLowerCase();
  const artist = String(track.artist ?? "").trim().toLowerCase();
  return `name:${song}|artist:${artist}`;
}

function getReason(track, profile) {
  const reasons = [];
  if (Math.abs(track.danceability - profile.danceability) < 0.08) {
    reasons.push("rhythm match");
  }
  if (Math.abs(track.energy - profile.energy) < 0.08) {
    reasons.push("energy match");
  }
  if (Math.abs(track.valence - profile.valence) < 0.1) {
    reasons.push("mood match");
  }
  if (track.popularity >= currentPopularityMin + 10) {
    reasons.push("popular signal");
  }

  return reasons.length ? reasons.join(" | ") : "overall profile match";
}

function isSpotifyTrackId(value) {
  return typeof value === "string" && /^[A-Za-z0-9]{22}$/.test(value);
}

function loadSpotifyEmbed(track) {
  if (!track || !isSpotifyTrackId(track.trackId)) {
    spotifyEmbed.attr("src", "");
    embedStatus.text("Spotify embed unavailable for this track. Try another recommendation.");
    return;
  }

  spotifyEmbed.attr("src", `https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator`);
  embedStatus.text(`Loaded: ${track.song} by ${track.artist}`);
}

function renderEmbedTrackSelector(ranked, activeTrackId) {
  const items = embedTrackSelector
    .selectAll("button.embed-track-btn")
    .data(ranked, (d) => d.track.id);

  const enter = items
    .enter()
    .append("button")
    .attr("type", "button")
    .attr("class", "embed-track-btn")
    .on("click", (_, d) => {
      loadSpotifyEmbed(d.track);
      renderEmbedTrackSelector(ranked, d.track.id);
    });

  enter.merge(items)
    .text((d, i) => `${i + 1}: ${d.track.song}`)
    .classed("active", (d) => d.track.id === activeTrackId);

  items.exit().remove();
}

function generateRecommendations() {
  const profile = {
    danceability: Number(targetDanceability.property("value")),
    energy: Number(targetEnergy.property("value")),
    valence: Number(targetValence.property("value")),
    popularity: Math.max(0, Math.min(1, currentPopularityMin / 100)),
  };

  const scope = recommendScopeSelect.property("value") === "global" ? "global" : "filtered";
  const pool = scope === "global" ? allData : currentFilteredPool;
  if (!pool.length) {
    latestRecommendations = [];
    recommendSummary.text(
      scope === "global"
        ? "No tracks available in Whole Data."
        : "No tracks available for recommendation under current filters."
    );
    recommendList.selectAll("li.recommend-item").remove();
    embedTrackSelector.selectAll("button.embed-track-btn").remove();
    spotifyEmbed.attr("src", "");
    embedStatus.text("No recommendations available to embed right now.");
    return;
  }

  const scored = pool
    .map((track) => ({
      track,
      score: recommendationDistance(track, profile),
      reason: getReason(track, profile),
    }))
    .sort((a, b) => d3.ascending(a.score, b.score));

  const bestByTrack = new Map();
  for (const candidate of scored) {
    const key = getCanonicalTrackKey(candidate.track);
    const existing = bestByTrack.get(key);
    if (!existing || candidate.score < existing.score) {
      bestByTrack.set(key, candidate);
    }
  }

  const ranked = Array.from(bestByTrack.values())
    .sort((a, b) => d3.ascending(a.score, b.score))
    .slice(0, 5);
  latestRecommendations = ranked;

  const scopeLabel = scope === "global" ? "Whole Data" : "Current Filtered Data";
  recommendSummary.text(
    `Generated ${ranked.length} mission picks from ${pool.length.toLocaleString()} tracks in ${scopeLabel} (${bestByTrack.size.toLocaleString()} unique songs).`
  );

  const items = recommendList.selectAll("li.recommend-item").data(ranked, (d) => d.track.id);
  const enter = items.enter().append("li").attr("class", "recommend-item").style("opacity", 0);

  enter.append("div").attr("class", "recommend-song");
  enter.append("div").attr("class", "recommend-meta");

  enter
    .merge(items)
    .select(".recommend-song")
    .text((d) => `${d.track.song} - ${d.track.artist}`);

  enter
    .merge(items)
    .select(".recommend-meta")
    .text(
      (d) =>
        `${d.track.genre} | popularity ${Math.round(d.track.popularity)} | d ${d.track.danceability.toFixed(2)} e ${d.track.energy.toFixed(2)} v ${d.track.valence.toFixed(2)}`
    );

  enter
    .merge(items)
    .on("click", function (_, d) {
      loadSpotifyEmbed(d.track);
      renderEmbedTrackSelector(ranked, d.track.id);
    })
    .style("cursor", "pointer");

  enter.transition().duration(240).style("opacity", 1);
  items.exit().transition().duration(180).style("opacity", 0).remove();

  loadSpotifyEmbed(ranked[0].track);
  renderEmbedTrackSelector(ranked, ranked[0].track.id);
}

function resetStoryAndView() {
  currentStoryStep = -1;
  activeQuadrantKey = null;
  genreFilter.property("value", "All");
  currentPopularityMin = clampPopularity(DEFAULT_POPULARITY_MIN);
  popularitySlider.property("value", currentPopularityMin);
  popularityValue.text(currentPopularityMin);
  applyTargetProfile({ danceability: 0.65, energy: 0.6, valence: 0.55 });
  renderStoryNote(null, -1);
  applyFilters({ animate: true });
  svg.transition().duration(850).ease(d3.easeCubicInOut).call(zoomBehavior.transform, d3.zoomIdentity);
}

function initialize(data) {
  const validRows = data.filter(
    (d) =>
      Number.isFinite(d.danceability) &&
      Number.isFinite(d.energy) &&
      Number.isFinite(d.popularity) &&
      d.genre
  );

  allData = deduplicateTracks(validRows);

  const genres = Array.from(new Set(allData.map((d) => d.genre))).sort(d3.ascending);
  sampledData = createRepresentativeSubset(allData, MAX_SAMPLE_POINTS);
  allDataByPopularity = sampledData.slice().sort((a, b) => d3.descending(a.popularity, b.popularity));
  colorScale = d3.scaleOrdinal(genres, d3.quantize(d3.interpolateRainbow, genres.length + 1));
  rScale.domain(d3.extent(allData, (d) => d.popularity));
  const popularityExtent = d3.extent(allData, (d) => d.popularity);

  if (!allData.length || !Number.isFinite(popularityExtent[0]) || !Number.isFinite(popularityExtent[1])) {
    throw new Error("No valid rows were found for danceability, energy, popularity, and genre columns");
  }

  popularitySlider
    .attr("min", Math.floor(popularityExtent[0]))
    .attr("max", Math.ceil(popularityExtent[1]))
    .attr("value", Math.max(DEFAULT_POPULARITY_MIN, Math.floor(popularityExtent[0])));

  currentPopularityMin = Math.max(DEFAULT_POPULARITY_MIN, Math.floor(popularityExtent[0]));
  currentPopularityMin = Math.min(currentPopularityMin, Math.ceil(popularityExtent[1]));
  popularityValue.text(currentPopularityMin);

  updateGenreFilter(genres);
  drawScopeFrame();
  drawAxes(getZoomedX(), getZoomedY(), 700);
  renderLegend(genres.slice(0, 14));
  applyFilters();
  renderStoryNote(null, -1);

  genreFilter.on("change", function () {
    applyFilters();
  });

  popularitySlider.on("input", function () {
    currentPopularityMin = +this.value;
    popularityValue.text(currentPopularityMin);
    scheduleSliderFilter();
  });

  popularitySlider.on("change", function () {
    currentPopularityMin = +this.value;
    popularityValue.text(currentPopularityMin);
    applyFilters({ animate: true });
  });

  densityToggle.on("change", function () {
    applyFilters({ animate: true });
  });


  // Autopilot feature
  let autopilotActive = false;
  let autopilotTimeout = null;
  let autopilotCountdown = null;
  const storyAutopilotButton = d3.select("#story-autopilot");
  const storyTimer = d3.select("#story-timer");

  function stopAutopilot() {
    autopilotActive = false;
    if (autopilotTimeout) {
      clearTimeout(autopilotTimeout);
      autopilotTimeout = null;
    }
    if (autopilotCountdown) {
      clearInterval(autopilotCountdown);
      autopilotCountdown = null;
    }
    storyTimer.text("");
    storyAutopilotButton.text("Autopilot tour");
    storyNextButton.property("disabled", false);
    storyPrevButton.property("disabled", false);
    storyResetButton.property("disabled", false);
  }

  function runAutopilot(stepIdx = 0) {
    if (!autopilotActive) return;
    // Apply the story step and wait for the zoom transition to finish before starting the timer
    applyStoryStepWithTransition(stepIdx, () => {
      if (!autopilotActive) return;
      storyNextButton.property("disabled", true);
      storyPrevButton.property("disabled", true);
      storyResetButton.property("disabled", true);
      storyAutopilotButton.text("Stop autopilot");

      let seconds = 15;
      storyTimer.text(`Next mission in ${seconds} seconds...`);
      if (autopilotCountdown) {
        clearInterval(autopilotCountdown);
      }
      autopilotCountdown = setInterval(() => {
        seconds--;
        if (seconds > 0) {
          storyTimer.text(`Next mission in ${seconds} seconds...`);
        } else {
          storyTimer.text("");
          clearInterval(autopilotCountdown);
          autopilotCountdown = null;
        }
      }, 1000);

      if (stepIdx < storySteps.length - 1) {
        autopilotTimeout = setTimeout(() => runAutopilot(stepIdx + 1), 15000);
      } else {
        autopilotTimeout = setTimeout(() => {
          stopAutopilot();
        }, 15000);
      }
    });
  }

  // Helper to apply a story step and call a callback after the zoom transition ends
  function applyStoryStepWithTransition(index, callback) {
    if (!storySteps.length) {
      if (callback) callback();
      return;
    }
    currentStoryStep = ((index % storySteps.length) + storySteps.length) % storySteps.length;
    const step = storySteps[currentStoryStep];
    activeQuadrantKey = null;

    genreFilter.property("value", step.genre);
    currentPopularityMin = clampPopularity(step.popularityMin);
    popularitySlider.property("value", currentPopularityMin);
    popularityValue.text(currentPopularityMin);
    applyTargetProfile(step.targetProfile);
    renderStoryNote(step, currentStoryStep);
    applyFilters({ animate: true });
    generateRecommendations();

    flashControl(genreFilter);
    flashControl(popularitySlider);
    flashControl(targetDanceability);
    flashControl(targetEnergy);
    flashControl(targetValence);
    flashControl(recommendButton);

    const autoZoomEnabled = typeof AUTO_ZOOM_ON_MISSION !== 'undefined' ? AUTO_ZOOM_ON_MISSION : true;
    const targetTransform = autoZoomEnabled ? getTransformForDomains(step.xDomain, step.yDomain) : d3.zoomIdentity;
    svg.transition().duration(950).ease(d3.easeCubicInOut)
      .call(zoomBehavior.transform, targetTransform)
      .on('end', function() {
        if (callback) callback();
      });
  }

  storyAutopilotButton.on("click", function () {
    if (autopilotActive) {
      stopAutopilot();
    } else {
      autopilotActive = true;
      runAutopilot(0);
    }
  });

  storyNextButton.on("click", function () {
    stopAutopilot();
    applyStoryStep(currentStoryStep + 1);
  });


  storyPrevButton.on("click", function () {
    stopAutopilot();
    const previous = currentStoryStep < 0 ? storySteps.length - 1 : currentStoryStep - 1;
    applyStoryStep(previous);
  });


  storyResetButton.on("click", function () {
    stopAutopilot();
    resetStoryAndView();
  });

  targetDanceability.on("input", updateTargetLabels);
  targetEnergy.on("input", updateTargetLabels);
  targetValence.on("input", updateTargetLabels);

  recommendButton.on("click", function () {
    generateRecommendations();
  });

  recommendScopeSelect.on("change", function () {
    if (latestRecommendations.length) {
      generateRecommendations();
    }
  });

  clearFocusButton.on("click", function () {
    clearQuadrantFocus({ animate: true });
  });

  updateTargetLabels();
}

loadData()
  .then(initialize)
  .catch((error) => {
    d3.select(".chart-card")
      .append("p")
      .style("padding", "8px 4px 2px")
      .style("color", "#ffd3d3")
      .text(`Data load error: ${error.message}`);
  });
