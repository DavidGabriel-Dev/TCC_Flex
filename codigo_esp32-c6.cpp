#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "VOID";
const char* password = "ameliafeia123";
// ROTA COMPLETA DO SEU SISTEMA
const char* serverUrl = "http://192.168.1.185:5000/api/sensors/data"; 

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000); 
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[ESP32] Conectado e pronto para enviar!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Gerando JSON com as chaves exatas do seu modelo Python
    StaticJsonDocument<200> doc;
    doc["co2"] = random(400, 1000);
    doc["tvoc"] = random(0, 200);
    doc["aqi"] = random(1, 5);
    doc["temperature"] = 25.0 + (random(-10, 10) / 10.0);
    doc["humidity"] = 50.0 + (random(-20, 20) / 10.0);

    String payload;
    serializeJson(doc, payload);

    Serial.print("Enviando: "); Serial.println(payload);
    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      Serial.printf("Resposta: %d\n", httpCode);
    } else {
      Serial.printf("Erro: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
  delay(5000); // Envia a cada 10 segundos
}