import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { BleManager } from "react-native-ble-plx";

const manager = new BleManager();

export default function App() {
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Procurando ESP32_BLE...");

  const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
  const CHARACTERISTIC_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

  const scanAndConnect = async () => {
    setStatus("🔎 Escaneando...");

    manager.startDeviceScan(null, null, async (error, scannedDevice) => {
      if (error) {
        console.error(error);
        setStatus("Erro ao escanear");
        return;
      }

      if (scannedDevice && scannedDevice.name === "ESP32_BLE") {
        setStatus("Encontrado! Conectando...");
        manager.stopDeviceScan();

        try {
          const connectedDevice = await scannedDevice.connect();
          setDevice(connectedDevice);
          setConnected(true);
          setStatus("Conectado ao ESP32_BLE");

          await connectedDevice.discoverAllServicesAndCharacteristics();

          connectedDevice.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
              if (error) {
                console.error(error);
                return;
              }

              const value = atob(characteristic.value);
              setStatus(`Mensagem do ESP32: ${value}`);
            }
          );
        } catch (e) {
          console.error(e);
          setStatus("Falha na conexão");
        }
      }
    });
  };

  const sendCommand = async (command) => {
    if (!device) return;

    try {
      const base64Command = btoa(command);
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Command
      );
      setStatus(`Comando enviado: ${command}`);
    } catch (e) {
      console.error(e);
      setStatus("Falha ao enviar comando");
    }
  };

  const disconnect = async () => {
    if (device) {
      await device.cancelConnection();
      setDevice(null);
      setConnected(false);
      setStatus("Desconectado");
    }
  };

  useEffect(() => {
    const requestPermissionsAndScan = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn("Permissões BLE não concedidas");
          setStatus("Permissões não concedidas");
          return;
        }
      }

      scanAndConnect();
    };

    requestPermissionsAndScan();
    return () => manager.destroy();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CONTROLE PARA ESP32</Text>
      <Text style={styles.status}>{status}</Text>

      {connected ? (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4CAF50" }]}
            onPress={() => sendCommand("1")}
          >
            <Text style={styles.buttonText}>Ligar LED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#F44336" }]}
            onPress={() => sendCommand("2")}
          >
            <Text style={styles.buttonText}>Desligar LED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#607D8B" }]}
            onPress={disconnect}
          >
            <Text style={styles.buttonText}>Desconectar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={scanAndConnect}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#229559",
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: "#0d5e04ff",
    marginBottom: 30,
    textAlign: "center",
  },
  buttons: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#229559",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
