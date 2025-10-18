#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic* pCharacteristic;
bool deviceConnected = false;
int ledPin = 13;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("📱 Dispositivo conectado");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("❌ Dispositivo desconectado");
    pServer->startAdvertising();
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String valor = pChar->getValue();
    Serial.println("📩 Recebido: " + valor);

    if (valor == "1") {
      digitalWrite(ledPin, HIGH);
      pChar->setValue("LED ligado");
    } else if (valor == "2") {
      digitalWrite(ledPin, LOW);
      pChar->setValue("LED desligado");
    }

    pChar->notify(); // Envia resposta para o app
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);

  BLEDevice::init("ESP32_BLE");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  Serial.println("✅ BLE pronto e visível como ESP32_BLE");
}

void loop() {
  // Opcional: enviar status do LED periodicamente
  if (deviceConnected) {
    String status = "LED " + String(digitalRead(ledPin) ? "ligado" : "desligado");
    pCharacteristic->setValue(status);
    pCharacteristic->notify();
  }

  delay(1000);
}
