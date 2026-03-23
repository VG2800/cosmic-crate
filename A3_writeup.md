# CSC316 A3 Write-Up: Cosmic Crate (Alien Music Console)

## 1) Design Rationale

### Goal and Question
I designed an interactive visualization to answer this question:

How do Spotify tracks distribute across danceability and energy, how do those patterns shift under dynamic filters, and what songs best match specific vibe profiles?

I chose this question because it supports both open-ended exploration and a narrative wrapper. The interface frames the user as an alien analyst learning Earth music through guided missions while still allowing direct analytical exploration.

### Visual Encodings
- Marks: each song is a circle in a scatterplot.
- X position: danceability.
- Y position: energy.
- Color: genre (categorical hue mapping).
- Size: popularity (sqrt scale).
- Optional density layer: contour density over points to reveal high-concentration regions.
- Coordinated Quadrant Insight Deck: four region cards (high/low danceability x high/low energy) that report counts, shares, and average popularity.
- 3-point Vibe Scope view: a tri-axis profile chart comparing target danceability/energy/valence against current filtered averages.
- Recommendation panel: ranked list of top 5 tracks that best match mission vibe profiles (danceability, energy, valence).

I selected this encoding because danceability and energy are both continuous variables where correlation and clustering are important. A scatterplot is the clearest way to support spatial reasoning and comparisons between subgroups.

### Interactions and Animation Choices
I implemented the following techniques:
- Dynamic query filters (genre dropdown and minimum-popularity slider) for rapid subset exploration.
- Details-on-demand tooltip for song-level metadata.
- Continuous pan/zoom with synchronized axis updates.
- Toggleable density layer so users can switch between raw points and cluster emphasis.
- Mission-based storytelling controls (previous, next, autopilot, reset) that animate camera and filter changes.
- Mission zoom consistency toggle so comparisons can be made on fixed axes across missions.
- Multi-view coordination: clicking a quadrant card focuses the recommendation pool and visually dims non-focused points while preserving context.
- Lightweight recommender that computes nearest tracks to mission vibe profiles (or manually chosen profiles).
- Recommendation scope toggle to compare mission-local (filtered) picks versus global-universe picks.
- Onboarding and metric glossary panel that explains danceability, energy, valence, dot-size encoding, and zoom/pan interaction.

I used transitions for points, legends, axes, density contours, recommendation updates, and mission camera moves. Animations are short and purposeful to preserve context during state changes.

### Alternatives Considered
- Parallel coordinates: better for many dimensions, but harder for broad audiences and less direct for a primary danceability-energy question.
- Faceting by genre: clearer subgroup comparison, but weaker for global overlap and harder to combine with fluid zoom interactions.
- Pure slideshow narrative: clearer scripted story, but weaker for user agency and dynamic query exploration.

I chose a single interactive scatterplot with mission-guided exploration and a profile-based recommender because it balances free exploration, storytelling, and actionable output.

## 2) Development Process

### Workflow
I developed in incremental steps:
1. Data parsing and validation for required fields.
2. Base scatterplot with scales, axes, and circle rendering.
3. Dynamic filters (genre + popularity threshold).
4. Tooltip and legend updates.
5. Zoom/pan support with synchronized axes and density layer.
6. Performance tuning with representative sampling and render caps.
7. Mission-mode controls and annotation panel.
8. Alien Tuning Console recommender (vibe profile sliders + top-5 matches).
9. Theming, responsiveness, and source acknowledgements.

### Peer Feedback Integration (3 peers)
I received structured feedback from three classmates and used it to revise both interaction flow and explanation quality.

Key feedback themes:
- Add a clearer parameter-tuning visualization beyond sliders.
- Better explain feature meanings (danceability, energy, valence), zoom behavior, and visual encodings.
- Reduce cognitive load by improving onboarding and narrative order.
- Clarify whether dot size is data-driven and explain the mapping if so.
- Improve legend placement so color categories are interpretable without extra scrolling.
- Reduce camera-motion inconsistency during mission-to-mission comparison.

Changes implemented from that feedback:
- Added the 3-point Vibe Scope view to visualize target profile vs filtered-average profile.
- Added an onboarding + metric glossary panel and interaction guidance.
- Moved and emphasized legend context near the top of the chart view.
- Added explicit size legend and text indicating dot size represents popularity.
- Added mission auto-zoom toggle to support fixed-axis comparisons.
- Added quadrant hover tooltips with plain-language region descriptions.

This feedback cycle improved clarity, reduced interface overload, and strengthened the justification for advanced interaction and multi-view coordination choices.

### Data Cleaning and Preprocessing
Before rendering, I applied lightweight cleaning so both the scatterplot and recommender operate on consistent records:

- Parsed and standardized source columns with fallbacks (`track_name`/`name`, `artists`/`artist`, `track_genre`/`genre`).
- Removed rows missing required analytical fields (non-numeric danceability, energy, or popularity, or missing genre).
- Deduplicated repeated songs so each track appears once in the visualization and recommendation pipeline.
- Used a canonical key for deduplication: Spotify `track_id` when present, otherwise normalized `song + artist`.
- For duplicated entries, retained a representative row based on highest popularity and assigned the most frequent genre label among duplicates.
- Applied representative sampling after cleaning for performance, so sampling does not reintroduce duplicate-heavy bias.

The final mission arc includes six vibe studies: Dancefloor Pulse, Calm Side, High Demand, Groove Pocket, Tension Zone, and Bright Hook.

### Time and Effort
Estimated total development time: approximately 14-18 people-hours.

Rough breakdown:
- Core chart and parsing: 3-4 hours
- Interactions and tooltip/legend behavior: 4-5 hours
- Density layer and zoom synchronization: 3-4 hours
- Performance tuning and debugging: 2-3 hours
- Mission/recommender mode and polish: 2-3 hours

### LLM Use Reflection (if applicable)
I used an LLM to accelerate coding and iteration on D3 implementation details (especially transition orchestration and scene-navigation wiring). The most time-consuming parts were:
- Debugging interaction interplay (zoom + filters + transitions).
- Managing performance with large data while preserving visual structure.
- Ensuring responsive layout and polished behavior on small screens.
- Aligning narrative language with analytical interactions so the theme feels meaningful instead of cosmetic.

I was comfortable coding with LLM assistance for boilerplate and iterative refactoring, but still needed manual reasoning and testing for interaction correctness and user experience quality.

## 3) Sources and Acknowledgements
- Data: Spotify Tracks Dataset on Kaggle (Maharshi Pandya).
- Library: D3.js v7.
- Interaction inspiration: dynamic-query examples discussed in CSC316 course materials (including NameGrapher-like query-driven exploration).

These acknowledgements are also shown directly on the visualization page footer, as required.
