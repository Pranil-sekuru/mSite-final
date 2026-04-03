import { Injectable } from '@angular/core';
import { LocationReading, HomeGeofence } from '../models/sensor.models';
import { DataStorageService } from './data-storage.service';

interface DataPoint {
  id: number;
  reading: LocationReading;
  visited: boolean;
  cluster: number; // 0 = unassigned, -1 = noise, >0 = cluster ID
}

@Injectable({ providedIn: 'root' })
export class DbscanClusteringService {

  constructor(private storage: DataStorageService) {}

  /**
   * Runs DBSCAN on past location readings to automatically identify the most
   * densely populated location (typically Home/Work) and updates the homeGeofence.
   * 
   * @param epsMeters Maximum radius (epsilon) to consider a point part of a cluster (default: 100m)
   * @param minPts Minimum points required to form a dense region (default: 5)
   */
  public async analyzeAndSetHome(epsMeters = 100, minPts = 5): Promise<HomeGeofence | null> {
    // 1. Fetch location history (e.g. past 7 days)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    // We get all location history for clustering
    const locationReadings = await this.storage.getSensorHistory('location' as any, lastWeek, today);
    const readings = locationReadings as LocationReading[];

    if (readings.length < minPts) {
      console.warn('DBSCAN: Not enough location data points to cluster.');
      return null;
    }

    // 2. Prepare DBSCAN nodes
    const points: DataPoint[] = readings.map((r, i) => ({
      id: i,
      reading: r,
      visited: false,
      cluster: 0
    }));

    let currentClusterId = 0;

    // 3. DBSCAN Core Algorithm
    for (const point of points) {
      if (point.visited) continue;

      point.visited = true;
      const neighbors = this.regionQuery(points, point, epsMeters);

      if (neighbors.length < minPts) {
        point.cluster = -1; // Noise
      } else {
        currentClusterId++;
        point.cluster = currentClusterId;
        this.expandCluster(points, neighbors, currentClusterId, epsMeters, minPts);
      }
    }

    // 4. Find the largest cluster (we assume largest density = Home)
    const clusterCounts = new Map<number, DataPoint[]>();
    for (const p of points) {
      if (p.cluster > 0) {
        if (!clusterCounts.has(p.cluster)) clusterCounts.set(p.cluster, []);
        clusterCounts.get(p.cluster)!.push(p);
      }
    }

    if (clusterCounts.size === 0) {
      console.warn('DBSCAN: No clusters found. All points treated as noise.');
      return null;
    }

    let maxClusterId = 0;
    let maxClusterCount = 0;
    clusterCounts.forEach((pts, clusterId) => {
      if (pts.length > maxClusterCount) {
        maxClusterCount = pts.length;
        maxClusterId = clusterId;
      }
    });

    const homePoints = clusterCounts.get(maxClusterId)!;

    // 5. Calculate centroid of the largest cluster
    const centroid = this.calculateCentroid(homePoints.map(p => p.reading));

    const newHome: HomeGeofence = {
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      radiusMeters: epsMeters
    };

    // Save it to configuration
    await this.storage.saveHomeLocation(newHome);
    console.log(`DBSCAN: Identified Home cluster with ${homePoints.length} points.`);
    
    return newHome;
  }

  // ── DBSCAN Helper Methods ─────────────────────────────────────────────

  private expandCluster(points: DataPoint[], neighbors: DataPoint[], clusterId: number, eps: number, minPts: number): void {
    let i = 0;
    while (i < neighbors.length) {
      const p = neighbors[i];

      if (!p.visited) {
        p.visited = true;
        const pNeighbors = this.regionQuery(points, p, eps);
        if (pNeighbors.length >= minPts) {
          // Merge neighbors
          for (const pn of pNeighbors) {
            if (!neighbors.some(existing => existing.id === pn.id)) {
              neighbors.push(pn);
            }
          }
        }
      }

      if (p.cluster === 0 || p.cluster === -1) {
        p.cluster = clusterId;
      }

      i++;
    }
  }

  private regionQuery(points: DataPoint[], p: DataPoint, eps: number): DataPoint[] {
    const neighbors: DataPoint[] = [];
    for (const other of points) {
      const dist = this.haversineDistance(
        p.reading.latitude, p.reading.longitude,
        other.reading.latitude, other.reading.longitude
      );
      if (dist <= eps) {
        neighbors.push(other);
      }
    }
    return neighbors;
  }

  // ── Geospatial Utilities ──────────────────────────────────────────────

  private calculateCentroid(points: LocationReading[]): { latitude: number, longitude: number } {
    let latSum = 0;
    let lonSum = 0;
    for (const p of points) {
      latSum += p.latitude;
      lonSum += p.longitude;
    }
    return {
      latitude: latSum / points.length,
      longitude: lonSum / points.length
    };
  }

  /** Calculate distance between two coordinates in meters */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}
