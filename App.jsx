import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Platform, PermissionsAndroid, DeviceEventEmitter, Text, View } from 'react-native';
import Beacons from 'react-native-beacons-manager';
import { MiMapView } from '@mappedin/react-native-sdk';
import { logMessage } from './logger';

// Mappedin venue options
const venueOptions = {
  venue: 'mappedin-demo-mall',
  clientId: '5eab30aa91b055001a68e996',
  clientSecret: 'RJyRXKcryCMy4erZqqCbuB1NbR66QTGNXVE0x3Pg6oCIlUR1',
};

// Define your known beacons and their physical coordinates (x, y) in meters
const BEACON_LOCATIONS = {
  'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0:0:0': { x: 5, y: 10 },
  'E2C56DB5-DFFB-48D2-B060-D0F5A71096E1:0:0': { x: 15, y: 10 },
  'B9407F30-F5F8-466E-AFF9-25556B57FE6D:1:102': { x: 10, y: 20 },
};

// Trilateration math using three beacons
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
  if (denom === 0) return null;

  const x = (C * E - F * B) / denom;
  const y = (A * F - C * D) / denom;
  return { x, y };
}

const BlueDotWithBeacon = () => {
  const mapView = useRef(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const startBeaconScan = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);
          if (
            granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            logMessage('Location permission denied');
            return;
          }
          Beacons.detectIBeacons();
          Beacons.startRangingBeaconsInRegion('REGION1', 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0');
        } else {
          Beacons.requestWhenInUseAuthorization();
          Beacons.startRangingBeaconsInRegion({
            identifier: 'REGION1',
            uuid: 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
          });
        }

        DeviceEventEmitter.addListener('beaconsDidRange', (data) => {
          const beacons = data.beacons
            .filter((b) => b.accuracy > 0 && b.rssi < 0)
            .map((b) => {
              const key = `${b.uuid.toUpperCase()}:${b.major}:${b.minor}`;
              const loc = BEACON_LOCATIONS[key];
              return loc ? { ...loc, d: b.accuracy } : null;
            })
            .filter(Boolean);

          if (beacons.length >= 3) {
            // Use only first 3 for trilateration
            const pos = trilaterate(beacons[0], beacons[1], beacons[2]);
            if (pos) {
              setPosition(pos);
              logMessage(`Trilaterated position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}`);

              // Enable BlueDot if not enabled yet
              mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true });

              // Override the blue dot location on the Mappedin map
              mapView.current?.overrideLocation({
                timestamp: Date.now(),
                coords: {
                  latitude: 43.6532 + pos.y * 0.00001, // Adjust this scaling to your map's real lat/lng scale
                  longitude: -79.3832 + pos.x * 0.00001,
                  accuracy: 1,
                  floorLevel: 0,
                },
              });
            }
          }
        });
      } catch (err) {
        logMessage(`Error initializing beacons: ${err}`);
      }
    };

    startBeaconScan();

    return () => {
      Beacons.stopRangingBeaconsInRegion('REGION1');
      DeviceEventEmitter.removeAllListeners('beaconsDidRange');
    };
  }, []);

  return (
    <SafeAreaView style={styles.fullView}>
      <MiMapView
        style={styles.mapView}
        key="mappedin"
        ref={mapView}
        options={venueOptions}
        onFirstMapLoaded={() => {
          mapView.current?.BlueDot.enable({ smoothing: false, showBearing: true });
        }}
      />
      {position && (
        <View style={styles.positionOverlay}>
          <Text>Estimated Position:</Text>
          <Text>
            X: {position.x.toFixed(2)}, Y: {position.y.toFixed(2)}
          </Text>
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
  },
});

export default BlueDotWithBeacon;
