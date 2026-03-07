#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DFRobot_ENS160.h>
#include <Adafruit_AHTX0.h>

// Tentaremos os dois endereços possíveis
DFRobot_ENS160_I2C ens160(&Wire, 0x53); 
Adafruit_AHTX0 aht;

const char* ssid = "Theo house";
const char* password = "l1d2d3r4";

// URLs do seu Ngrok
const char* serverUrl = "https://pussly-nubbly-yong.ngrok-free.dev/api/sensors/data";
const char* configUrl = "https://pussly-nubbly-yong.ngrok-free.dev/api/config/intervalo";

// Variável que armazena o tempo (começa com 10 segundos)
int intervaloEspera = 10000; 

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println("\n--- INICIANDO DIAGNOSTICO COMPLETO ---");

  // Inicia I2C nos pinos confirmados
  Wire.begin(6, 7); 
  delay(100);

  // 1. Verificação do AHT21
  if (!aht.begin()) {
    Serial.println("[ERRO] AHT21 nao detectado!");
  } else {
    Serial.println("[ OK ] AHT21 encontrado (Endereço 0x38)");
  }

  // 2. Verificação do ENS160
  Serial.println("Buscando ENS160 no endereco 0x53...");
  if (ens160.begin() == 0) {
    Serial.println("[ OK ] ENS160 encontrado em 0x53!");
  } else {
    Serial.println("[AVISO] Falha em 0x53. Tentando endereco 0x52...");
    ens160 = DFRobot_ENS160_I2C(&Wire, 0x52);
    if (ens160.begin() == 0) {
      Serial.println("[ OK ] ENS160 encontrado em 0x52!");
    } else {
      Serial.println("[ERRO CRITICO] ENS160 nao responde em nenhum endereço!");
    }
  }

  ens160.setPWRMode(ENS160_STANDARD_MODE);
  
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Conectado!");
}

void loop() {
  uint8_t status = ens160.getENS160Status();
  Serial.printf("Status ENS160: %d (0=OK, 1=Warmup, 2=Initial, 3=Invalid)\n", status);

  if (WiFi.status() == WL_CONNECTED) {
    
    // =========================================================
    // CLIENTE SEGURO PARA O NGROK HTTPS
    // =========================================================
    WiFiClientSecure client;
    client.setInsecure(); // Permite conectar no HTTPS do Ngrok

    HTTPClient http;

    // =========================================================
    // 1. CONSULTAR O INTERVALO NO SERVIDOR (GET)
    // =========================================================
    http.begin(client, configUrl);
    http.addHeader("ngrok-skip-browser-warning", "true");
    int httpCodeConfig = http.GET();
    
    Serial.printf("\n--- CONSULTA DE TEMPO ---\n");
    Serial.printf("Codigo HTTP: %d\n", httpCodeConfig);
    
    if (httpCodeConfig > 0) {
      String payloadConfig = http.getString();
      Serial.println("Texto recebido do servidor: " + payloadConfig);
      
      // Usa a biblioteca Json v7
      JsonDocument docConfig;
      DeserializationError error = deserializeJson(docConfig, payloadConfig);
      
      if (!error) {
        // Tenta extrair a variável 'intervalo'
        int segundos = docConfig["intervalo"].as<int>();
        Serial.printf("Numero extraido do JSON: %d\n", segundos);
        
        if (segundos >= 5) {
          intervaloEspera = segundos * 1000;
          Serial.printf("=> Tempo da ESP32 atualizado para: %d segundos!\n", segundos);
        } else {
          Serial.println("=> O numero e menor que 5 (ou 0), mantendo o tempo antigo.");
        }
      } else {
        Serial.print("ERRO ao ler JSON: ");
        Serial.println(error.c_str());
      }
    } else {
      Serial.printf("Erro na requisicao GET: %s\n", http.errorToString(httpCodeConfig).c_str());
    }
    http.end();
    Serial.println("-------------------------\n");

    // =========================================================
    // 2. LER SENSORES
    // =========================================================
    sensors_event_t humidity, temp;
    aht.getEvent(&humidity, &temp);
    ens160.setTempAndHum(temp.temperature, humidity.relative_humidity);

    uint16_t co2 = ens160.getECO2();
    uint16_t tvoc = ens160.getTVOC();
    uint8_t aqi = ens160.getAQI();

    Serial.printf("CO2: %u | TVOC: %u | AQI: %u | T: %.1fC\n", co2, tvoc, aqi, temp.temperature);

    // =========================================================
    // 3. ENVIAR DADOS (POST)
    // =========================================================
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("ngrok-skip-browser-warning", "true");

    JsonDocument doc;
    doc["sala_id"] = 2;  // ID da sua sala no banco de dados
    doc["co2"] = co2;
    doc["tvoc"] = tvoc;
    doc["aqi"] = aqi;
    doc["temperature"] = temp.temperature;
    doc["humidity"] = humidity.relative_humidity;

    String payload;
    serializeJson(doc, payload);
    int httpCode = http.POST(payload);
    Serial.printf("Envio HTTP POST: %d\n", httpCode);
    http.end(); 
  }
  
  Serial.printf("Aguardando %d segundos...\n\n", intervaloEspera / 1000);
  delay(intervaloEspera); 
}
