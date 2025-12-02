# Changelog

All notable changes to NYC Transit Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added - Comprehensive Crowding System (2024-12-02)

**Major Feature: Multi-Factor Crowding Analysis**

- **Enhanced Crowding Algorithm**
  - Multi-factor scoring combining headway (35%), demand (35%), delays (20%), and service alerts (10%)
  - Time-of-day demand patterns with rush hour detection
  - Real-time delay extraction from GTFS-RT feeds
  - Service alert severity impact analysis
  - Segment-level analysis with direction-specific crowding (Northbound/Southbound)

- **New Backend Modules** (`lib/crowding/`)
  - `config.ts` - Centralized thresholds and scoring weights
  - `headway.ts` - Multi-station headway calculation
  - `demand.ts` - Time-of-day demand patterns with fallback data
  - `delays.ts` - Real-time delay extraction
  - `alerts.ts` - Service alert impact scoring
  - `score.ts` - Weighted multi-factor algorithm
  - `segments.ts` - Line segment definitions for all 26+ routes
  - `enhanced.ts` - Segment-level crowding calculation

- **Data Infrastructure**
  - `scripts/update-demand-patterns.mjs` - MTA Hourly Ridership API integration
  - `data/crowding/demand-patterns.json` - Realistic demand fallback patterns

- **Enhanced API** (`/api/metrics/crowding`)
  - Added `?enhanced=true` query parameter for detailed analysis
  - Segment-level breakdown with all contributing factors
  - 60-second caching for performance
  - Backward-compatible with legacy simple crowding

- **New UI Components** (`components/crowding/`)
  - `ViewToggle.tsx` - Switch between list and diagram views
  - `CrowdingFilters.tsx` - Mode and direction filtering
  - `SegmentDiagram.tsx` - Visual line representation with color-coded segments
  - Complete redesign of `CrowdingList.tsx` with:
    - Toggle button for Simple ↔ Enhanced mode switching
    - Info modal (? button) explaining how the system works
    - Accordion expansion for segment details
    - Improved icon spacing and visual hierarchy
    - Loading states and error handling

- **Performance Optimizations**
  - Simple view loads in ~2-3s (default, fast)
  - Enhanced view available on-demand (~8-10s)
  - 60-second API caching reduces server load
  - Batched route processing (5 routes at a time)
  - Reduced segment calculations for network view

### Changed
- Crowding page now defaults to simple view for faster loading
- Updated documentation for new crowding features
- Enhanced type definitions for segment-level data

### Technical Details
- Extended TypeScript types with `SegmentCrowding`, `NetworkCrowding`, `TimeContext`, `CrowdingFactors`
- All code passes TypeScript strict mode
- No lint errors or warnings
- Production build successful

---

## Previous Releases

See git history for earlier changes.

