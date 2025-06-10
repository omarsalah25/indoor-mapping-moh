import React, { useState, useRef } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { MapViewStore, MiMapView } from '@mappedin/react-native-sdk'; // No need for TGetVenueOptions in JS
import { logMessage } from './logger'; // Import logMessage for logging

// Mappedin venue options
const venueOptions = {
  venue: 'mappedin-demo-mall',
  clientId: '5eab30aa91b055001a68e996',
  clientSecret: 'RJyRXKcryCMy4erZqqCbuB1NbR66QTGNXVE0x3Pg6oCIlUR1',
};

const BlueDotWithBeacon = () => {
  const mapView = useRef(null); // We don't need MapViewStore type in JSX
  const [departure, setDeparture] = useState(null); // No type definition needed in JS
  const [destination, setDestination] = useState(null); // No type definition needed in JS

  // Handle first map load
  const onFirstMapLoaded = () => {
    // Enable Blue Dot functionality
    mapView.current?.BlueDot.enable({
      smoothing: false,
      showBearing: true,
    });
    
    // Optionally, set initial departure and destination (you can remove this if not required)
    const departureLocation = mapView.current?.venueData?.locations.find(
      (l) => l.name === 'Uniqlo'
    );
    const destinationLocation = mapView.current?.venueData?.locations.find(
      (l) => l.name === 'Microsoft'
    );
    
    if (departureLocation && destinationLocation) {
      setDeparture(departureLocation);
      setDestination(destinationLocation);
      const directions = departureLocation?.directionsTo(destinationLocation);
      if (directions) {
        mapView.current?.Journey.draw(directions);
      }
    }
  };

  // Handle map click and update departure/destination
  const onClick = ({ position }) => {
    mapView.current?.overrideLocation({
      coords: {
        accuracy: 3,
        latitude: position.latitude,
        longitude: position.longitude,
        floorLevel: mapView.current?.currentMap?.elevation,
      },
    });

    // If departure is not set, set it to clicked position
    if (!departure) {
      setDeparture({
        coords: {
          latitude: position.latitude,
          longitude: position.longitude,
          floorLevel: mapView.current?.currentMap?.elevation,
        },
      });
      mapView.current?.setPolygonColor(position, 'red');
      logMessage(`Set departure location: ${JSON.stringify(position)}`);
    } else if (!destination) {
      // If destination is not set, set it to clicked position
      setDestination({
        coords: {
          latitude: position.latitude,
          longitude: position.longitude,
          floorLevel: mapView.current?.currentMap?.elevation,
        },
      });
      logMessage(`Set destination location: ${JSON.stringify(position)}`);

      // Calculate and draw directions if both departure and destination are set
      if (departure) {
        const directions = departure?.directionsTo(destination);
        if (directions) {
          mapView.current?.Journey.draw(directions);
        }
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
        onFirstMapLoaded={onFirstMapLoaded}
        onClick={onClick}
      />
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
});

export default BlueDotWithBeacon;
