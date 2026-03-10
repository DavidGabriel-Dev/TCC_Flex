#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DFRobot_ENS160.h>
#include <Adafruit_AHTX0.h>
#include <Preferences.h> 

DFRobot_ENS160_I2C ens160(&Wire, 0x53); 
Adafruit_AHTX0 aht;

Preferences preferences;

String adminUser = "";
String adminPass = "";
String ssid = "";
String password = "";
String serverUrl = "";
String configUrl = "";
int salaId = 2; 

int intervaloEspera = 10000; 
unsigned long ultimaLeitura = 0; 

bool usuarioLogado = false; 

bool autenticar();
void abrirMenuSerial();
void testarWiFi();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  preferences.begin("meu-tcc", false); 
  adminUser = preferences.getString("adminUser", "Admin");
  adminPass = preferences.getString("adminPass", "20260316");
  ssid = preferences.getString("ssid", "");
  password = preferences.getString("password", "");
  serverUrl = preferences.getString("serverUrl", "");
  configUrl = preferences.getString("configUrl", "");
  
  salaId = preferences.getInt("salaId", 2); 
  preferences.end(); 

  Serial.println("  SISTEMA DE MONITORAMENTO INICIADO");
  Serial.println("Para abrir o Menu a qualquer momento, digite 'C' e aperte Enter.");

  Wire.begin(6, 7); 
  delay(100);
  aht.begin();
  if (ens160.begin() != 0) {
    ens160 = DFRobot_ENS160_I2C(&Wire, 0x52);
    ens160.begin();
  }
  ens160.setPWRMode(ENS160_STANDARD_MODE);
  
  if (ssid != "") {
    WiFi.begin(ssid.c_str(), password.c_str());
    Serial.println("\nTentando conectar ao WiFi em segundo plano...");
  } else {
    Serial.println("\n[AVISO] Nenhum WiFi configurado. Digite 'C' para configurar.");
  }

  ultimaLeitura = millis() - intervaloEspera; 
}

void loop() {
  
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'c' || c == 'C') {
      
      bool acessoPermitido = false;

      if (usuarioLogado == true) {
        acessoPermitido = true; 
      } else {
        if (autenticar()) {
          usuarioLogado = true; 
          acessoPermitido = true;
        }
      }

      if (acessoPermitido) {
        abrirMenuSerial(); 
        
        if (ssid != "") {
          Serial.println("Conectando ao WiFi...");
          WiFi.begin(ssid.c_str(), password.c_str());
        }
      }
    }
  }

  if (millis() - ultimaLeitura >= intervaloEspera) {
    ultimaLeitura = millis(); 

    sensors_event_t humidity, temp;
    aht.getEvent(&humidity, &temp);
    ens160.setTempAndHum(temp.temperature, humidity.relative_humidity);

    uint16_t co2 = ens160.getECO2();
    uint16_t tvoc = ens160.getTVOC();
    uint8_t aqi = ens160.getAQI();

    if (co2 == 0 || co2 == 65535) {
      ens160.setPWRMode(ENS160_STANDARD_MODE);
      delay(1000); 
      co2 = ens160.getECO2();
      tvoc = ens160.getTVOC();
      aqi = ens160.getAQI();
    }

    Serial.printf("CO2: %u | TVOC: %u | T: %.1fC | Umi: %.1f%% | Status WiFi: %s\n", 
                  co2, tvoc, temp.temperature, humidity.relative_humidity,
                  (WiFi.status() == WL_CONNECTED ? "CONECTADO" : "DESCONECTADO"));

    if (WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure client;
      client.setInsecure();
      HTTPClient http;

      if (configUrl != "") {
        http.begin(client, configUrl.c_str());
        if (http.GET() > 0) {
          JsonDocument docConfig;
          if (!deserializeJson(docConfig, http.getString())) {
            int segundos = docConfig["intervalo"].as<int>();
            if (segundos >= 5) intervaloEspera = segundos * 1000;
          }
        }
        http.end();
      } else {
        Serial.println("[AVISO] URL de tempo não configurada. Mantendo 10s.");
      }

      if (co2 > 0 && co2 < 65535) {
        if (serverUrl != "") {
          http.begin(client, serverUrl.c_str());
          http.addHeader("Content-Type", "application/json");

          JsonDocument doc;
          doc["sala_id"] = salaId;
          doc["co2"] = co2;
          doc["tvoc"] = tvoc;
          doc["aqi"] = aqi;
          doc["temperature"] = temp.temperature;
          doc["humidity"] = humidity.relative_humidity;

          String payload;
          serializeJson(doc, payload);
          http.POST(payload);
          http.end(); 
        } else {
          Serial.println("[AVISO] URL de envio de dados vazia. Pulando envio.");
        }
      }
    }
  }
}


bool autenticar() {
  while (Serial.available()) Serial.read(); 
  Serial.println("\n--- AUTENTICACAO DE ADMINISTRADOR ---");
  
  Serial.print("Usuario: ");
  while (!Serial.available()) delay(10);
  String u = Serial.readStringUntil('\n'); u.trim(); Serial.println(u); 
  
  Serial.print("Senha: ");
  while (!Serial.available()) delay(10);
  String p = Serial.readStringUntil('\n'); p.trim(); Serial.println("********"); 
  
  if (u == adminUser && p == adminPass) {
    Serial.println("\n[OK] ACESSO PERMITIDO!");
    return true;
  } else {
    Serial.println("\n[ERRO] CREDENCIAIS INVALIDAS!");
    return false;
  }
}


void abrirMenuSerial() {
  while (Serial.available()) Serial.read(); 
  
  while (true) {
    Serial.println("\n============= MENU DE CONFIGURACAO =============");
    Serial.println("1 - Configurar WiFi (SSID e Senha)");
    Serial.println("2 - Testar Conexao WiFi");
    Serial.println("3 - Configurar ID da Sala (Numero)");
    Serial.println("4 - Configurar URLs do Servidor");
    Serial.println("5 - Alterar Senha de Administrador");
    Serial.println("6 - Ver Valores Salvos");
    Serial.println("7 - Fazer Logout (Bloquear Menu)");
    Serial.println("S - Sair do Menu e Voltar a Ler Sensores");
    Serial.print("Escolha: ");

    while (!Serial.available()) { delay(10); } 
    String opcao = Serial.readStringUntil('\n'); opcao.trim(); Serial.println(opcao);

    preferences.begin("meu-tcc", false); 

    if (opcao == "1") {
      Serial.print("Novo SSID: ");
      while (!Serial.available()) { delay(10); }
      ssid = Serial.readStringUntil('\n'); ssid.trim();
      preferences.putString("ssid", ssid); 
      
      Serial.print("Nova Senha WiFi: ");
      while (!Serial.available()) { delay(10); }
      password = Serial.readStringUntil('\n'); password.trim();
      preferences.putString("password", password); 
      Serial.println("\n[OK] Salvo!");
    } 
    else if (opcao == "2") {
      testarWiFi(); 
    }
    else if (opcao == "3") {
      Serial.print("ID desta Sala: ");
      while (!Serial.available()) { delay(10); }
      String id_str = Serial.readStringUntil('\n');
      salaId = id_str.toInt();
      preferences.putInt("salaId", salaId); 
      Serial.println("[OK] Salvo!");
    }
    else if (opcao == "4") {
      Serial.print("url de envio de dados: ");
      while (!Serial.available()) { delay(10); }
      serverUrl = Serial.readStringUntil('\n'); serverUrl.trim();
      preferences.putString("serverUrl", serverUrl); 

      Serial.print("url de envio de intervalo de tempo: ");
      while (!Serial.available()) { delay(10); }
      configUrl = Serial.readStringUntil('\n'); configUrl.trim();
      preferences.putString("configUrl", configUrl); 
      Serial.println("\n[OK] Salvo!");
    }
    else if (opcao == "5") {
      Serial.print("NOVA Senha Admin: ");
      while (!Serial.available()) { delay(10); }
      adminPass = Serial.readStringUntil('\n'); adminPass.trim();
      preferences.putString("adminPass", adminPass); 
      Serial.println("\n[OK] Salvo!");
    }
    else if (opcao == "6") {
      Serial.println("\n--- VALORES ATUAIS ---");
      Serial.println("Admin Usuario: " + adminUser);
      Serial.println("SSID:          " + ssid);
      Serial.println("ID Sala:       " + String(salaId));
      Serial.println("URL Envio:     " + serverUrl);
      Serial.println("URL Tempo:     " + configUrl);
    }
    else if (opcao == "7") {
      Serial.println("\n[LOGOUT] Menu bloqueado. Sera necessario senha para acessar novamente.");
      usuarioLogado = false; 
      preferences.end();
      break; 
    }
    else if (opcao == "S" || opcao == "s") {
      Serial.println("\nFechando Menu e retomando leituras...");
      preferences.end();
      break; 
    }
    
    preferences.end(); 
  }
}

void testarWiFi() {
  if (ssid == "") {
    Serial.println("\n[ERRO] SSID vazio. Configure primeiro (Opcao 1).");
    return;
  }
  Serial.print("\nTestando rede '"); Serial.print(ssid); Serial.println("'...");
  WiFi.begin(ssid.c_str(), password.c_str());
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) { 
    delay(500); Serial.print("."); tentativas++;
  }
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[SUCESSO] Conectado! IP: " + WiFi.localIP().toString());
    WiFi.disconnect(); 
  } else {
    Serial.println("\n[FALHA] Verifique SSID e Senha.");
  }
}
