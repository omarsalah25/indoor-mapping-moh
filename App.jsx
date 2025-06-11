import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MiMapView } from '@mappedin/react-native-sdk'; // Adjust import if needed

// Mappedin venue options
const venueOptions = {
  venue: 'mappedin-demo-mall',
  clientId: '5eab30aa91b055001a68e996',
  clientSecret: 'RJyRXKcryCMy4erZqqCbuB1NbR66QTGNXVE0x3Pg6oCIlUR1',
};

// Fake beacons with x, y in meters (example)
const BEACON_LOCATIONS = {
  beacon1: { x: 20, y: 10 },
  beacon2: { x: 30, y: 10 },
  beacon3: { x: 10, y: 20 },
};

// Helper: Convert fake meters to approximate lat/lng
const convertToLatLng = (x, y) => ({
  latitude: 43.86045771092588 + y * 0.00001,
  longitude:-78.94244735432709 + (-x * 0.00001),
});

// Trilateration function for 3 beacons to estimate position
function trilaterate(b1, b2, b3) {
  const { x: x1, y: y1, d: d1 } = b1;
  const { x: x2, y: y2, d: d2 } = b2;
  const { x: x3, y: y3, d: d3 } = b3;

  const A = 2 * (x2 - x1);
  const B = 2 * (y2 - y1);
  const C = d1 ** 2 - d2 ** 2 - x1 ** 2 + x2 ** 2 - y1 ** 2 + y2 ** 2;
  const D = 2 * (x3 - x2);
  const E = 2 * (y3 - y2);
  const F = d2 ** 2 - d3 ** 2 - x2 ** 2 + x3 ** 2 - y2 ** 2 + y3 ** 2;

  const denom = A * E - D * B;
  if (denom === 0) return null; // In case of no solution

  const x = (C * E - F * B) / denom;
  const y = (A * F - C * D) / denom;
  return { x, y };
}

const BlueDotWithBeacon = () => {
  const mapView = useRef(null);
  const [position, setPosition] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false); // Track map loaded state

  useEffect(() => {
    // Only run trilateration logic after map is loaded
    if (!mapLoaded) return;

    // Simulate beacon distances in meters for trilateration
    const b1 = { ...BEACON_LOCATIONS.beacon1, d: 6 };
    const b2 = { ...BEACON_LOCATIONS.beacon2, d: 7 };
    const b3 = { ...BEACON_LOCATIONS.beacon3, d: 5 };

    const pos = trilaterate(b1, b2, b3);
    if (pos) {
      // Successfully estimated position from trilateration
      setPosition(pos);
      console.log(`Trilaterated Position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}`);

      // Ensure mapView exists before using it
      if (!mapView.current) return;

      // Enable BlueDot after position calculation
      mapView.current.BlueDot.enable({ smoothing: false, showBearing: true });

      // Convert the estimated position to lat/lng and override the user location
      const coords = convertToLatLng(pos.x, pos.y);
      console.log(coords) ;
      mapView.current.overrideLocation({
        timestamp: Date.now(),
        coords: {
          ...coords,
          accuracy: 1,
          floorLevel: 0,
        },
      });

      // Add floor markers for each beacon using `createCoordinate` and `createMarker`
      Object.entries(BEACON_LOCATIONS).forEach(([id, { x, y }]) => {
        const { latitude, longitude } = convertToLatLng(x, y);
          console.log(id);

        // Create a coordinate using `createCoordinate`
        const coordinate = mapView.current?.currentMap.createCoordinate(latitude, longitude);

        if (coordinate) {
          // Add a marker for each beacon using `createMarker`
          mapView.current?.createMarker(coordinate, `<div style="${styles.beacon}">${id}</div>`, {
            anchor: 'center',  // Anchor the marker at the center
            rank: 'always-visible',  // Ensure marker is always visible
          });
        }
      });
    }
  }, [mapLoaded]); // Only run the logic when map is loaded

  return (
    <SafeAreaView style={styles.fullView}>
      <MiMapView
        style={styles.mapView}
        key="mappedin"
        ref={mapView}
        options={venueOptions}
        onFirstMapLoaded={() => {
          // Map is loaded, enable BlueDot and trigger marker logic
          setMapLoaded(true); // Set mapLoaded to true to trigger useEffect
          if (mapView.current) {
            mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true ,accuracy:50});
          }
        }}
      />
      {position && (
        <View style={styles.positionOverlay}>
          <Text style={{ fontWeight: 'bold' }}>Estimated Position:</Text>
          <Text>X: {position.x.toFixed(2)} meters, Y: {position.y.toFixed(2)} meters</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullView: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  beacon: {
    backgroundColor: 'red',
    color: 'green',
  },
  positionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    elevation: 5,
  },
});

export default BlueDotWithBeacon;
