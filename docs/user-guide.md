# User Guide

Welcome to NYC Transit Hub! This guide will help you get the most out of the application.

---

## Overview

NYC Transit Hub provides real-time information about New York City's public transit system, including:

- **Subway** - Real-time train arrivals and delays
- **Bus** - Real-time bus positions and arrivals
- **LIRR** - Long Island Rail Road train schedules
- **Metro-North** - Metro-North Railroad train schedules

---

## Getting Started

### Accessing the App

Visit [nyc-transit-hub.vercel.app](https://nyc-transit-hub.vercel.app) (or your deployed URL) in any modern web browser.

**Supported browsers:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Mobile:** The app is fully responsive and works on phones and tablets.

---

## Features

### Dashboard

The home dashboard provides an at-a-glance view of:

- **Your Station** - Next trains at your saved station
- **Service Alerts** - Active delays and service changes
- **Live Tracker** - Visual train positions
- **Commute Assistant** - Departure recommendations
- **Incidents** - Current incident count
- **Reliability** - Line performance metrics
- **Crowding** - Estimated train crowding

### Station Board

View detailed departure information for any station:

1. Click "Your Station" on the dashboard or navigate to "Station Board" in the sidebar
2. Use the search box to find a station by name
3. View arrivals organized by direction (Uptown/Downtown)
4. Click the star icon to save a station as your favorite

**Features:**
- **Favorite Station** - Your primary station is saved and shown on the dashboard
- **Nearby Stations** - Enable location to see stations within 1 mile
- **Multi-Platform Support** - Stations like Times Sq show all lines automatically
- **Auto-Refresh** - Data updates every 30 seconds

**Understanding Arrivals:**

| Display | Meaning |
|---------|---------|
| "3 min" | Train arriving in 3 minutes |
| "Now" | Train arriving or at platform |
| "Delayed" | Train is delayed (time shown may be inaccurate) |

**Tip:** Your favorite station is saved in your browser. It will persist across sessions.

### Live Tracker

Watch trains and buses move in real-time:

1. Navigate to "Realtime" from the sidebar
2. Choose a mode: **Subway**, **Bus**, **LIRR**, or **Metro-North**
3. Select a line/route/branch
4. View real-time arrivals and positions
5. Click any marker for detailed information

#### View Modes

Toggle between two viewing modes using the buttons in the top-right:

- **Diagram** - Vertical line diagram showing all stations
- **Map** - Interactive map with real-time vehicle positions

#### Subway Mode

- View a vertical line diagram showing all stations
- Watch train markers update in real-time
- Click train markers for destination and ETA details

**Understanding the Diagram:**

| Symbol | Meaning |
|--------|---------|
| Large dot | Terminal station (end of line) |
| Medium dot | Express stop |
| Small dot | Local stop |
| Green ↑ arrow | Northbound/Uptown train |
| Red ↓ arrow | Southbound/Downtown train |
| "NOW" badge | Train arriving within 1 minute |
| Line bullets below station | Available transfers to other lines |

**Map View:**

| Symbol | Meaning |
|--------|---------|
| Colored line | Route path |
| Circle markers | Station locations |
| Train bullet + arrow | Live train position with direction |
| Click marker | View train details (destination, ETA, delay) |

Train positions on the map are intelligently calculated based on their ETA to the next station. A train showing "16 min" will appear appropriately far from its destination, not at the station itself. The system accounts for different speeds (subway vs regional rail) and prevents overlapping markers when multiple trains are in the same area.

#### Bus Mode

- Select from 288+ NYC bus routes
- Routes organized by borough (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
- Select Bus Service (SBS) routes shown with `+` suffix
- Express routes include BM, BXM, QM, SIM, and X prefixes

**Bus List View:**

| Field | Description |
|-------|-------------|
| Destination | Final destination of the bus |
| Next Stop | The bus's next scheduled stop |
| ETA | Minutes until arrival |
| Distance | How far the bus is from the stop |

**Bus Map View:**

- Route path shown as blue line following actual streets
- All stops displayed as circle markers
- Live bus positions with GPS coordinates
- Bus icons show route number and direction (bearing)
- Click any bus or stop for detailed information

#### LIRR Mode

- Select from 12 LIRR branches
- View trains grouped by direction (To/From Penn Station)
- See arrival times and any delays

**LIRR Branches:**
Babylon, City Terminal Zone, Far Rockaway, Hempstead, Long Beach, Montauk, Oyster Bay, Port Jefferson, Port Washington, Ronkonkoma, West Hempstead, Belmont Park

#### Metro-North Mode

- Select from 6 Metro-North lines
- View trains grouped by direction (To/From Grand Central)
- See arrival times and any delays

**Metro-North Lines:**
Hudson, Harlem, New Haven, New Canaan, Danbury, Waterbury

**Train Details:**

Click any train marker to see:
- Destination (where the train is going)
- Next stop with station name
- Exact arrival time
- Delay status (on time, minor delay, significant delay)

**Auto-Refresh:**

- Data updates automatically every 30 seconds
- Toggle auto-refresh on/off with the switch
- Click "Refresh" for manual updates

**Legend:**

Click the "Legend" button in the top-right to see a visual guide explaining all diagram elements.

### Service Alerts

Stay informed about delays and service changes:

1. Click "Service Alerts" on the dashboard
2. View active alerts sorted by severity
3. Filter by subway line
4. Click an alert for full details

### Commute Assistant

Get personalized departure recommendations:

1. Set up your commute (home and work stations)
2. View the recommended departure time
3. See alternative routes if delays occur
4. Track your commute history

### Reliability Metrics

Understand historical line performance:

1. Navigate to "Reliability" from the sidebar
2. View on-time percentages by line
3. Compare performance over different time periods
4. Identify the most reliable routes

### Crowding Estimates

NYC Transit Hub provides two levels of crowding analysis:

#### Simple View (Fast)

The default view shows crowding based on train headways (time between trains):

1. Click "Crowding" on the dashboard or sidebar
2. View lines grouped by crowding level (High/Medium/Low)
3. See average wait times between trains

**Crowding Levels:**
- **Low** (Green) - Headway < 6 min, frequent service
- **Medium** (Yellow) - Headway 6-12 min, moderate waits
- **High** (Red) - Headway > 12 min, long gaps mean crowded trains

#### Enhanced View (Detailed)

For more accurate estimates, click the **"Enhanced View"** button:

1. **Multi-Factor Analysis** - Combines 4 factors:
   - **Headway (35%)** - Time gaps between trains
   - **Demand (35%)** - Rush hour vs off-peak ridership patterns
   - **Delays (20%)** - Real-time train delays causing bunching
   - **Alerts (10%)** - Active service disruptions

2. **Segment Breakdown** - See crowding by line section:
   - Click any route to expand
   - View crowding for each segment (Inwood, Harlem, Midtown, etc.)
   - See direction-specific data (Northbound vs Southbound)
   - Review contributing factors per segment

3. **Visual Diagrams** - Toggle to diagram view:
   - Color-coded bars show crowding intensity
   - Hover for detailed factor breakdown
   - Quickly identify problem areas

**Understanding Scores:**
- **0-33** (Green) - Low crowding, good service
- **34-66** (Yellow) - Moderate crowding, busy but manageable
- **67-100** (Red) - Heavy crowding, expect packed trains and delays

**How It Works (?)** - Click the info button on the page to learn how the system calculates crowding.

**Tips:**
- Check before your commute to avoid peak crowding
- Use Enhanced View during rush hours for better accuracy
- Morning rush: Inbound to Manhattan is most crowded
- Evening rush: Outbound from Manhattan is most crowded

**Note:** Crowding is estimated using MTA real-time data, not actual passenger counts. Updates every 60 seconds.

---

## Settings

### Theme

Toggle between dark and light mode:

1. Click the sun/moon icon in the top-right corner
2. Your preference is saved automatically

### Saved Stations

Manage your favorite stations:

1. Go to Station Board
2. Click "Configure stations"
3. Add or remove stations

---

## Tips & Tricks

### Mobile Usage

- **Add to Home Screen** - For app-like experience on mobile
- **Swipe** - Navigate between sections on smaller screens
- **Pull to Refresh** - Update data manually

### Data Freshness

- Real-time data updates every 30 seconds
- Check the "System Status" indicator for connection health
- Stale data shows a warning indicator

### Understanding Train Times

| Display | Meaning |
|---------|---------|
| "3 min" | Train arriving in 3 minutes |
| "Now" | Train is arriving or at platform |
| "Delayed" | Train is delayed, time unknown |
| "—" | No data available |

---

## Troubleshooting

### Data Not Loading

1. Check your internet connection
2. Look at the System Status indicator
3. Try refreshing the page
4. Wait a moment and try again (MTA feeds occasionally go down)

### Wrong Theme Displayed

1. Clear browser cache
2. Toggle theme twice
3. Check if system dark mode is overriding

### Slow Performance

1. Close other browser tabs
2. Try a different browser
3. Disable browser extensions
4. Clear browser cache

---

## Privacy

NYC Transit Hub:

- **Does not** collect or store personal data on our servers
- **Does not** require an account for basic features
- Uses **browser localStorage** to save your favorite stations (stored locally, never uploaded)
- **Optional location access** - Only used to find nearby stations, never stored or sent to our servers

Your location is only accessed when you click "Enable Location" on the Station Board page. The coordinates are sent directly to our API to find nearby stations and are not logged or stored.

---

## Feedback

Found a bug or have a suggestion?

- Open an issue on [GitHub](https://github.com/ahossain/NYC-Transit-Hub/issues)
- Include steps to reproduce any bugs
- Screenshots are helpful!

---

## Credits

- Data provided by [MTA](https://new.mta.info/)
- Subway icons from [mta-subway-bullets](https://github.com/louh/mta-subway-bullets)
- Built with [Next.js](https://nextjs.org/) and [HeroUI](https://heroui.com/)

