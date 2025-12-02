/**
 * Line Segment Definitions
 * Divides subway lines into geographic segments for more granular crowding analysis
 */

import type { SubwayLine, LineSegment } from "@/types/mta";

// ============================================================================
// Segment Definitions by Line
// ============================================================================

/**
 * Subway line segment definitions
 * Segments divide lines into meaningful geographic/operational zones
 */
export const LINE_SEGMENTS: Record<SubwayLine, LineSegment[]> = {
  // Broadway-7th Ave Lines (Red)
  "1": [
    { id: "1-bronx", name: "Bronx", stations: ["101", "103", "104", "106", "107", "108", "109", "110", "111"] },
    { id: "1-upper", name: "Upper Manhattan", stations: ["112", "113", "114", "115", "116", "117", "118", "119", "120", "121", "122", "123", "124"] },
    { id: "1-midtown", name: "Midtown", stations: ["125", "126", "127", "128", "129", "130"] },
    { id: "1-lower", name: "Lower Manhattan", stations: ["131", "132", "133", "134", "135", "136", "137", "138", "139", "142"] },
  ],
  
  "2": [
    { id: "2-bronx", name: "Bronx", stations: ["201", "204", "205", "206", "207", "208", "209", "210", "211", "212", "213", "214", "215", "216", "217", "218", "219", "220", "221", "222"] },
    { id: "2-harlem", name: "Harlem", stations: ["224", "225", "226", "227", "621", "622", "623", "624", "625"] },
    { id: "2-midtown", name: "Midtown Express", stations: ["120", "626", "627", "123", "628", "629", "631", "127", "128", "132"] },
    { id: "2-brooklyn", name: "Brooklyn", stations: ["137", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "241", "242", "243", "244", "245", "246", "247", "248", "249", "250", "251"] },
  ],
  
  "3": [
    { id: "3-harlem", name: "Harlem", stations: ["301", "302"] },
    { id: "3-upper", name: "Upper Manhattan", stations: ["224", "225", "226", "227"] },
    { id: "3-midtown", name: "Midtown", stations: ["120", "123", "125", "127", "128", "132"] },
    { id: "3-brooklyn", name: "Brooklyn", stations: ["232", "233", "234", "235", "236", "237", "238", "239", "247", "248", "249", "250", "251", "301", "302"] },
  ],

  // Lexington Ave Lines (Green)
  "4": [
    { id: "4-bronx", name: "Bronx", stations: ["401", "402", "405", "406", "407", "408", "409", "410", "413", "414", "415", "416", "418", "419", "420", "621", "222"] },
    { id: "4-upper", name: "Upper East Side", stations: ["621", "622", "623", "624", "625", "626", "627", "628", "629"] },
    { id: "4-midtown", name: "Midtown Express", stations: ["631", "632", "633", "634", "635", "636"] },
    { id: "4-lower", name: "Lower Manhattan", stations: ["637", "638", "639", "640"] },
    { id: "4-brooklyn", name: "Brooklyn", stations: ["232", "234", "235", "414", "415", "416", "417", "418", "419", "420", "423"] },
  ],

  "5": [
    { id: "5-bronx", name: "Bronx", stations: ["501", "502", "503", "504", "505", "506", "507", "508", "509", "510", "511", "512", "513", "514", "222"] },
    { id: "5-upper", name: "Upper East Side", stations: ["621", "622", "623", "624", "625", "626", "627", "628", "629"] },
    { id: "5-midtown", name: "Midtown Express", stations: ["631", "632", "633", "634", "635", "636"] },
    { id: "5-lower", name: "Lower Manhattan & Brooklyn", stations: ["637", "638", "639", "640", "232", "234", "235", "515", "516", "517", "518", "519", "520"] },
  ],

  "6": [
    { id: "6-bronx", name: "Bronx", stations: ["601", "602", "606", "607", "608", "609", "610", "611", "612", "613", "614", "615", "616", "617", "618", "619", "620"] },
    { id: "6-upper", name: "Upper East Side", stations: ["621", "622", "623", "624", "625", "626", "627", "628", "629"] },
    { id: "6-midtown", name: "Midtown & Lower", stations: ["631", "632", "633", "634", "635", "636", "637", "638", "639", "640"] },
  ],

  // Flushing Line (Purple)
  "7": [
    { id: "7-queens-east", name: "Eastern Queens", stations: ["701", "702", "705", "706", "707", "708", "709", "710", "711", "712", "713", "714", "715"] },
    { id: "7-queens-central", name: "Central Queens", stations: ["716", "718", "719", "720", "721", "722", "723", "724", "725"] },
    { id: "7-manhattan", name: "Manhattan", stations: ["127"] },
  ],

  // 8th Ave Lines (Blue)
  "A": [
    { id: "A-inwood", name: "Inwood", stations: ["A02", "A03", "A05", "A06", "A07", "A09", "A10", "A11", "A12"] },
    { id: "A-harlem", name: "Harlem", stations: ["A14", "A15", "D20", "A24", "A25", "A27", "A28", "A30", "A31"] },
    { id: "A-midtown", name: "Midtown", stations: ["A32", "A33", "A34", "A36", "A38", "A40", "A41", "A42"] },
    { id: "A-brooklyn", name: "Brooklyn", stations: ["A43", "A44", "A45", "A46", "A48", "A50", "A51", "A52", "A53", "A54", "A55", "A57", "A59", "A60", "A61", "A63", "A64", "A65"] },
    { id: "A-rockaway", name: "Rockaway", stations: ["H01", "H02", "H03", "H04", "H06", "H08", "H09", "H10", "H11", "H12", "H13", "H14", "H15"], branch: "rockaway" },
    { id: "A-lefferts", name: "Lefferts Blvd", stations: ["A60", "A61", "A63", "A64", "A65"], branch: "lefferts" },
  ],

  "C": [
    { id: "C-upper", name: "Upper Manhattan", stations: ["A02", "A03", "A05", "A06", "A07", "A09", "A10", "A11", "A12", "A14", "A15", "A16", "A17", "A18", "A19", "A20", "A21", "A22", "A24", "A25", "A27", "A28", "A30"] },
    { id: "C-midtown", name: "Midtown", stations: ["A32", "A33", "A34", "A36", "A38", "A40", "A41", "A42"] },
    { id: "C-brooklyn", name: "Brooklyn", stations: ["A43", "A44", "A45", "A46", "A48", "A50", "A51", "A52", "A53", "A55"] },
  ],

  "E": [
    { id: "E-queens", name: "Queens", stations: ["E01", "F01", "F02", "F03", "F04", "F05", "F06", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12", "G13", "G14"] },
    { id: "E-midtown", name: "Midtown", stations: ["D15", "D14", "A27", "A28", "A31", "A32", "A34", "A36", "A38", "A40", "A41", "A42"] },
    { id: "E-downtown", name: "Downtown", stations: ["D12", "D11", "D10", "D09", "138"] },
  ],

  // 6th Ave Lines (Orange)
  "B": [
    { id: "B-bronx", name: "Bronx", stations: ["D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13"] },
    { id: "B-manhattan", name: "Manhattan", stations: ["D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21"] },
    { id: "B-brooklyn", name: "Brooklyn", stations: ["D22", "D24", "D25", "D26", "D27", "D28", "D29", "D30", "D31", "D35", "D37", "D39", "D40", "D41", "D42", "D43"] },
  ],

  "D": [
    { id: "D-bronx", name: "Bronx", stations: ["D01", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13"] },
    { id: "D-manhattan", name: "Manhattan", stations: ["D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21"] },
    { id: "D-brooklyn", name: "Brooklyn", stations: ["D22", "D24", "D25", "D26", "D27", "D28", "D29", "D30", "D31", "D35", "D37", "D39", "D40", "D41", "D42", "D43"] },
  ],

  "F": [
    { id: "F-queens", name: "Queens", stations: ["F01", "F02", "F03", "F04", "F05", "F06", "G05", "G06", "G07", "G08", "G09", "F09", "F11", "F12", "F14", "F15", "F16", "F18", "F20"] },
    { id: "F-manhattan", name: "Manhattan", stations: ["F21", "D20", "D19", "D18", "D17", "D16", "A36", "D11", "D10", "F23", "F24", "F25", "F26", "F27"] },
    { id: "F-brooklyn", name: "Brooklyn", stations: ["F29", "F30", "F31", "F32", "F33", "F34", "F35", "F36", "F38", "F39"] },
  ],

  "M": [
    { id: "M-queens-brooklyn", name: "Queens & Brooklyn", stations: ["M01", "M04", "M05", "M06", "M08", "M09", "M10", "M11", "M12", "M13", "M14", "M16", "M18", "M19", "M20", "M21", "M22", "M23"] },
    { id: "M-manhattan", name: "Manhattan", stations: ["D16", "D17", "D18", "D19", "D20", "D21", "D22"] },
  ],

  // Crosstown (Lime)
  "G": [
    { id: "G-queens", name: "Queens", stations: ["G20", "G22", "G24", "G26", "G28", "G29"] },
    { id: "G-brooklyn", name: "Brooklyn", stations: ["G30", "G31", "G32", "G33", "G34", "G35", "G36"] },
  ],

  // Nassau St Lines (Brown)
  "J": [
    { id: "J-queens", name: "Queens", stations: ["M01", "M04", "M05", "M06", "M08", "M09", "M10", "M11"] },
    { id: "J-brooklyn", name: "Brooklyn", stations: ["M12", "M13", "M14", "M16", "M18", "M19", "M20", "M21", "M22", "M23", "M26", "M27", "M28", "M29", "M30", "J12", "J13", "J14", "J15", "J16", "J17", "J19", "J20", "J21", "J22", "J23", "J24", "J27", "J28", "J29", "J30", "J31"] },
  ],

  "Z": [
    { id: "Z-skip-stop", name: "Skip Stop Service", stations: ["J12", "J13", "J14", "J15", "J16", "J17", "J19", "J20", "J21", "J22", "J23", "J24", "J27", "J28", "J29", "J30", "J31"] },
  ],

  // Canarsie (Gray)
  "L": [
    { id: "L-manhattan", name: "Manhattan", stations: ["L01", "L02", "L03", "L05", "L06"] },
    { id: "L-brooklyn", name: "Brooklyn", stations: ["L08", "L10", "L11", "L12", "L13", "L14", "L15", "L16", "L17", "L19", "L20", "L21", "L22", "L24", "L25", "L26", "L27", "L28", "L29"] },
  ],

  // Broadway (Yellow)
  "N": [
    { id: "N-queens", name: "Queens", stations: ["R01", "R03", "R04", "R05", "R06", "R08", "R09", "R11", "R13", "R14", "R15", "R16"] },
    { id: "N-manhattan", name: "Manhattan", stations: ["R17", "R18", "R19", "R20", "R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29"] },
    { id: "N-brooklyn", name: "Brooklyn", stations: ["R30", "R31", "R32", "R33", "R34", "R35", "R36", "R39", "R40", "R41", "R42", "R43", "R44", "R45", "D35", "D37", "D39", "D40", "D41", "D42", "D43"] },
  ],

  "Q": [
    { id: "Q-brooklyn-east", name: "Eastern Brooklyn", stations: ["D24", "D25", "D26", "D27", "D28", "D29", "D30", "D31"] },
    { id: "Q-brooklyn-west", name: "Western Brooklyn", stations: ["D35", "D37", "D39", "D40", "D41", "D42", "D43", "R30", "R31"] },
    { id: "Q-manhattan", name: "Manhattan", stations: ["R16", "R17", "R18", "R19", "R20", "R21", "R23", "R24", "R25", "R26", "R27", "R28"] },
  ],

  "R": [
    { id: "R-queens", name: "Queens", stations: ["R01", "R03", "R04", "R05", "R06", "R08", "R09", "R11"] },
    { id: "R-manhattan", name: "Manhattan", stations: ["R16", "R17", "R18", "R19", "R20", "R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29"] },
    { id: "R-brooklyn", name: "Brooklyn", stations: ["R30", "R31", "R32", "R33", "R34", "R35", "R36", "R39", "R40", "R41", "R42", "R43", "R44", "R45"] },
  ],

  "W": [
    { id: "W-queens", name: "Queens", stations: ["R01", "R03", "R04", "R05", "R06", "R08", "R09", "R11"] },
    { id: "W-manhattan", name: "Manhattan", stations: ["R16", "R17", "R18", "R19", "R20", "R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29"] },
    { id: "W-brooklyn", name: "Brooklyn", stations: ["R30", "R31", "R32", "R33"] },
  ],

  // Shuttles
  "S": [
    { id: "S-42nd", name: "42nd St Shuttle", stations: ["901", "902"] },
  ],

  "SF": [
    { id: "SF-shuttle", name: "Franklin Av Shuttle", stations: ["S01", "S03", "S04"] },
  ],

  "SR": [
    { id: "SR-shuttle", name: "Rockaway Park Shuttle", stations: ["H19", "H15", "H14", "H13", "H12"] },
  ],

  // Staten Island Railway
  "SIR": [
    { id: "SIR-north", name: "North Shore", stations: ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09"] },
    { id: "SIR-south", name: "South Shore", stations: ["S10", "S11", "S12", "S13", "S14", "S15", "S16", "S17", "S18", "S19", "S20", "S21"] },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get segment definitions for a specific line
 */
export function getLineSegments(routeId: SubwayLine): LineSegment[] {
  return LINE_SEGMENTS[routeId] || [];
}

/**
 * Get all stations in a segment
 */
export function getSegmentStations(routeId: SubwayLine, segmentId: string): string[] {
  const segments = LINE_SEGMENTS[routeId];
  if (!segments) return [];

  const segment = segments.find(s => s.id === segmentId);
  return segment?.stations || [];
}

/**
 * Find which segment a station belongs to on a specific line
 */
export function findStationSegment(routeId: SubwayLine, stationId: string): LineSegment | null {
  const segments = LINE_SEGMENTS[routeId];
  if (!segments) return null;

  return segments.find(segment => segment.stations.includes(stationId)) || null;
}

/**
 * Get total number of segments across all lines
 */
export function getTotalSegmentCount(): number {
  return Object.values(LINE_SEGMENTS).reduce((sum, segments) => sum + segments.length, 0);
}

