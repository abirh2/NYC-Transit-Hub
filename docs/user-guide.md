# User Guide

Welcome to NYC Transit Hub! This guide will help you get the most out of the application.

---

## Overview

NYC Transit Hub provides real-time information about New York City's public transit system, including:

- **Subway** - Real-time train arrivals and delays
- **Bus** - Coming soon
- **LIRR** - Coming soon
- **Metro-North** - Coming soon

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

Watch trains move in real-time:

1. Navigate to "Realtime" from the sidebar
2. Select a subway line
3. View the line diagram with train positions
4. Click a train to see its destination and stops

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

Know which trains are packed:

1. Click "Crowding" on the dashboard
2. View crowding levels by line
3. Plan your trip to avoid packed trains

**Note:** Crowding is estimated based on train headways and delays, not actual passenger counts.

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

