import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Mappedin, MappedinLocation, MappedinNode, MiMapView } from '@mappedin/react-native-sdk'; // Adjust import if needed
import { getDistance } from 'geolib'; // Import geolib functions

// Mappedin venue options
const venueOptions = {
  venue: 'mappedin-demo-mall',
  clientId: '5eab30aa91b055001a68e996',
  clientSecret: 'RJyRXKcryCMy4erZqqCbuB1NbR66QTGNXVE0x3Pg6oCIlUR1',
};

// Actual beacon coordinates in lat/lng
const BEACON_LOCATIONS = {
  b1: { lat: 43.86075771092588, lon: -78.94538735432709 },
  b2: { lat: 43.859799995967985, lon: -78.94826448563617 },
  b3: { lat: 43.863055783993474, lon: -78.9520008328918 },
  b4: { lat: 43.86471370652424, lon: -78.94418325452146 },
};

// Trilateration function using geodesic distances
function trilaterate(beacons) {
  const distances = beacons.map((b) => b.d); // Get distances from beacons
  const positions = beacons.map((b) => ({ latitude: b.lat, longitude: b.lon })); // Get positions

  // Here, use geolib to estimate the point of intersection
  const estimatedPosition = getIntersectionOfCircles(positions, distances);
  return estimatedPosition;
}

// Function to get intersection of 4 circles using geolib (simplified)
function getIntersectionOfCircles(beacons, distances) {
  const p1 = beacons[0];
  const p2 = beacons[1];
  const p3 = beacons[2];
  const p4 = beacons[3];

  // Use simple average position of the 4 points as an estimate for trilateration
  const averageLat = (p1.latitude + p2.latitude + p3.latitude + p4.latitude) / 4;
  const averageLon = (p1.longitude + p2.longitude + p3.longitude + p4.longitude) / 4;

  // You could also apply more complex algorithms like the least-squares method for better precision
  return { lat: averageLat, lon: averageLon };
}

const BlueDotWithBeacon = () => {
  const mapView = useRef(null);
  const [position, setPosition] = useState(null);
  const [distances, setDistances] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false); // Track map loaded state

  useEffect(() => {
    // Only run trilateration logic after map is loaded
    if (!mapLoaded) return;

    // Simulate beacon distances in meters for trilateration
    const b1 = { ...BEACON_LOCATIONS.b1, d: 0 };
    const b2 = { ...BEACON_LOCATIONS.b2, d: 0 };
    const b3 = { ...BEACON_LOCATIONS.b3, d: 0 };
    const b4 = { ...BEACON_LOCATIONS.b4, d: 0 };

    // Perform trilateration using the beacons and their distances
    const pos = trilaterate([b1, b2, b3, b4]);
    if (pos) {
      // Successfully estimated position from trilateration
      setPosition(pos);
      console.log(`Trilaterated Position: lat=${pos.lat.toFixed(5)}, lon=${pos.lon.toFixed(5)}`);

      // Calculate distances from the estimated position to all beacons
      const distances = Object.entries(BEACON_LOCATIONS).map(([id, { lat, lon }]) => {
        const distance = getDistance(
          { latitude: pos.lat, longitude: pos.lon }, // Estimated position
          { latitude: lat, longitude: lon }          // Beacon position
        );
        return { id, distance };
      });

      // Set the distances state to render them
      setDistances(distances);

      // Ensure mapView exists before using it
      if (!mapView.current) return;

      // Enable BlueDot after position calculation
      mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true });

      // Override location with estimated position
      mapView.current.overrideLocation({
        timestamp: Date.now(),
        coords: {
          latitude: pos.lat,
          longitude: pos.lon,
          accuracy: 1,
          floorLevel: 0,
        },
      });

      // Add floor markers using the actual beacon lat/lng values
      Object.entries(BEACON_LOCATIONS).forEach(([id, { lat, lon }]) => {

        // Create a coordinate using the lat/lng values
        const coordinate = mapView.current?.currentMap.createCoordinate(lat, lon);

        if (coordinate) {
          mapView.current?.createMarker(coordinate,   `<div style="background-color:red; width:10px; height:10px; border-radius:50%;">${id}</div>`, {
            anchor: 'center', // Anchor the marker at the center
            rank: 'always-visible', // Ensure marker is always visible
          });
        }
      });
    }
  }, [mapLoaded]); // Only run the logic when map is loaded

  // Handle the map click event and update the blue dot position
  const handleMapClick = (event) => {
    console.log('Map clicked:', event);
    const clickedCoordinate = event.position;

    if (clickedCoordinate) {
      // Update position
      const newPos = { lat: clickedCoordinate.latitude, lon: clickedCoordinate.longitude };
      setPosition(newPos);

      // Recalculate distances from new position to all beacons
      const newDistances = Object.entries(BEACON_LOCATIONS).map(([id, { lat, lon }]) => {
        const distance = getDistance(
          { latitude: newPos.lat, longitude: newPos.lon }, // New position
          { latitude: lat, longitude: lon }                // Beacon position
        );
        return { id, distance };
      });

      // Set new distances
      setDistances(newDistances);

      // Update BlueDot position
      if (mapView.current) {
        mapView.current.overrideLocation({
          timestamp: Date.now(),
          coords: {
            latitude: newPos.lat,
            longitude: newPos.lon,
            accuracy: 1,
            floorLevel: 0,
          },
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.fullView}>
      <MiMapView
        style={styles.mapView}
        key="mappedin"
        ref={mapView}
        options={venueOptions}


     // Uncomment the following block to find the closest node to "New York Fries" and draw directions
        //  onFirstMapLoaded={() => {
        //   // Get all locations from the MapView
        //   const locations = mapView.current?.venueData?.locations;

        //   // Check if locations are available
        //   if (locations) {
        //     // Find the "New York Fries" location
        //     const nyFriesLocation = locations.find(location => location.name === "New York Fries");

        //     if (nyFriesLocation) {
        //       const nodes = nyFriesLocation.nodes; // Get nodes for "New York Fries"
        //       let closestNode = null;
        //       let minDistance = Infinity;

        //       // Ensure position is available (this should come from your BlueDot or similar)
        //       const position = { x: 100, y: 200 }; // Replace with actual position from BlueDot

        //       // Calculate distance to each node
        //       for (const node of nodes) {
        //         if (node) {  // Use node's
        //           const dx = node.x - position.x;  // Calculate difference in x coordinates
        //           const dy = node.y - position.y;  // Calculate difference in y coordinates
        //           const distance = Math.sqrt(dx * dx + dy * dy);  // Calculate Euclidean distance

        //           // Update the closest node if this one is closer
        //           if (distance < minDistance) {
        //             minDistance = distance;
        //             closestNode = node;
        //           }
        //         }
        //       }

        //       if (closestNode) {
        //         console.log('Closest Node:', closestNode);
        //         console.log('Min Distance:', minDistance);

        //         // Now, create a departure node at the current position of the Blue Dot
        //         // Using a valid MappedinNode structure for the BlueDot position
        //         const departureNode = {
        //           x: position.x, y: position.y,  // Correct structure with mapCoordinate
        //           name: "BlueDot Node",  // Name the node
        //           id: "blueDotNodeId",   // Unique ID for the new node
        //         };

        //         // Ensure we have a departure and destination
        //         if (departureNode && closestNode) {
        //           // Fetch directions between departure node and closest node
        //           const directions = mapView.current?.getDirections(departureNode, closestNode);  // Get directions

        //           if (directions) {
        //             mapView.current?.Journey.draw(directions);  // Draw the directions on the map
        //           } else {
        //             console.log('No directions found.');
        //           }
        //         }
        //       } else {
        //         console.log('No closest node found.');
        //       }
        //     } else {
        //       console.log('New York Fries location not found.');
        //     }
        //   } else {
        //     console.log('Venue data is unavailable.');
        //   }

        //   // Enable Blue Dot with settings
        //   if (mapView.current) {
        //     mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true, accuracy: 50 });
        //   }

        //   // Set mapLoaded to true to trigger useEffect
        //   setMapLoaded(true);
        // }}

        onFirstMapLoaded={() => {
          console.log(mapView.current.Camera.position);
          const {lat, lon} = mapView.current.Camera.position;
          // const departure = mapView.current?.BlueDot.getLocation();
            const departure = mapView.current?.venueData?.locations.find(
            (l) => l.name === 'Uniqlo',
          );

          // console.log('Departure:', departure);
          const destination = mapView.current?.venueData?.locations.find(
            (l) => l.name === 'Microsoft',
          );
          console.log('Departure:', departure);
          console.log('Destination:', destination);
          if (!departure || !destination) {
            return;
          }
          const directions = departure?.directionsTo(destination);
          if (directions) {
            mapView.current?.Journey.draw(directions);
          }
          if (mapView.current) {
            mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true, accuracy: 50 });
          }
          setMapLoaded(true); // Set mapLoaded to true to trigger useEffect

        }}
      
        onClick={handleMapClick} // Listen to map press events
      />
      {position && (
        <View style={styles.positionOverlay}>
          <Text style={{ fontWeight: 'bold' }}>Estimated Position:</Text>
          <Text>
            Latitude: {position.lat.toFixed(5)}, Longitude: {position.lon.toFixed(5)}
          </Text>
        </View>
      )}
      {distances && (
        <View style={styles.distanceOverlay}>
          <Text style={{ fontWeight: 'bold' }}>Distances from Estimated Position:</Text>
          {distances.map(({ id, distance }) => (
            <Text key={id}>{`${id}: ${distance} meters`}</Text>
          ))}
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
  positionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    elevation: 5,
  },
  distanceOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 8,
    elevation: 5,
  },
});

export default BlueDotWithBeacon;
