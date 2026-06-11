export interface LatLng {
  lat: number;
  lon: number;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  mindate: string;
  maxdate: string;
  datacoverage: number;
  distanceMiles: number;
}

export interface DailyPrecip {
  date: string;
  precipIn: number;
}

export interface RainfallSummary {
  stationId: string;
  stationName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  rainyDays: number;
  totalPrecipIn: number;
  percentile95In: number;
}

export interface Atlas14Result {
  depthIn: number;
  durationLabel: string;
  returnPeriodLabel: string;
  source: string;
}
