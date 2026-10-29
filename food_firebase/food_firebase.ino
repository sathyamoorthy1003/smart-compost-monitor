/*
  Smart Food-Waste-to-Compost Monitor
  ESP32 + DHT22 + Soil Moisture + Fan Relay + Firebase (REST API)

  Sends sensor data to Firebase Realtime Database using the built-in
  HTTPClient library (no extra library needed).

  Libraries needed (install via Arduino Library Manager):
  - Adafruit GFX Library
  - Adafruit SSD1306
  - DHT sensor library (Adafruit)

  Board: ESP32 DevKit V1  |  Core: esp32 v3.x
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ===== WiFi Credentials =====
const char* WIFI_SSID = "Nothing";       // Your 2.4 GHz WiFi
const char* WIFI_PASS = "87654322";

// ESP32's own WiFi (connect your phone to this)
const char* AP_SSID = "Compost-Monitor";
const char* AP_PASS = "12345678";

// ===== Firebase REST API =====
// Database URL (no trailing slash)
const char* FIREBASE_HOST = "https://bengaluru-climate-default-rtdb.asia-southeast1.firebasedatabase.app";

// ===== Pins =====
#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define RELAY_PIN 25

// ===== OLED =====
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WebServer server(80);

// Active LOW relay
const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

const float FAN_ON_TEMP = 30.0;

bool fanState = false;
float temperature = NAN;
float humidity = NAN;
int moisturePercent = 0;

unsigned long lastRead = 0;
const unsigned long READ_INTERVAL = 2000;

unsigned long lastFirebaseUpdate = 0;
const unsigned long FIREBASE_INTERVAL = 5000; // Send to Firebase every 5 seconds

bool firebaseOk = false;

// ---------- Web page (local) ----------
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Food Compost Monitor</title>
<style>
  body{font-family:Arial,sans-serif;background:#111;color:#eee;margin:0;padding:16px;text-align:center}
  h2{margin:8px 0 16px}
  .card{background:#1e1e1e;border-radius:12px;padding:16px;margin:10px auto;max-width:360px}
  .label{font-size:14px;color:#aaa}
  .value{font-size:34px;font-weight:bold;margin-top:4px}
  .on{color:#4caf50}.off{color:#f44336}
  #status{font-size:12px;color:#777;margin-top:12px}
  .firebase-status{font-size:11px;color:#0ea5e9;margin-top:4px}
</style>
</head>
<body>
  <h2>Food Compost Monitor</h2>
  <div class="card"><div class="label">Temperature</div><div class="value" id="t">--</div></div>
  <div class="card"><div class="label">Humidity</div><div class="value" id="h">--</div></div>
  <div class="card"><div class="label">Soil Moisture</div><div class="value" id="m">--</div></div>
  <div class="card"><div class="label">Fan (ON above 30 C)</div><div class="value" id="f">--</div></div>
  <div id="status">Connecting...</div>
  <div class="firebase-status" id="fb">Firebase: checking...</div>
<script>
function update(){
  var x = new XMLHttpRequest();
  x.onreadystatechange = function(){
    if (x.readyState == 4){
      if (x.status == 200){
        var d = JSON.parse(x.responseText);
        document.getElementById('t').textContent = (d.temp === null) ? 'Sensor Error' : d.temp.toFixed(1) + ' C';
        document.getElementById('h').textContent = (d.hum === null) ? 'Sensor Error' : d.hum.toFixed(1) + ' %';
        document.getElementById('m').textContent = d.moisture + ' %';
        var f = document.getElementById('f');
        f.textContent = d.fan ? 'ON' : 'OFF';
        f.className = 'value ' + (d.fan ? 'on' : 'off');
        document.getElementById('status').textContent = 'Updated: ' + new Date().toLocaleTimeString();
        document.getElementById('fb').textContent = 'Firebase: ' + (d.firebase ? 'Connected' : 'Not connected');
      } else {
        document.getElementById('status').textContent = 'Connection lost...';
      }
    }
  };
  x.open('GET', '/data', true);
  x.send();
}
update();
setInterval(update, 2000);
</script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send_P(200, "text/html", INDEX_HTML);
}

void handleData() {
  String json = "{";
  json += "\"temp\":" + (isnan(temperature) ? String("null") : String(temperature, 1)) + ",";
  json += "\"hum\":" + (isnan(humidity) ? String("null") : String(humidity, 1)) + ",";
  json += "\"moisture\":" + String(moisturePercent) + ",";
  json += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  json += "\"firebase\":" + String(firebaseOk ? "true" : "false");
  json += "}";
  server.send(200, "application/json", json);
}

// ---------- WiFi ----------
void startWiFi() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleep(false);

  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP started. Connect to '");
  Serial.print(AP_SSID);
  Serial.print("' and open http://");
  Serial.println(WiFi.softAPIP());

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.display();

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Hotspot connected. Open http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Hotspot not connected (check 2.4 GHz). AP still works.");
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("AP: Compost-Monitor");
  display.println("pass: 12345678");
  display.println("http://192.168.4.1");
  if (WiFi.status() == WL_CONNECTED) {
    display.println("Hotspot IP:");
    display.println(WiFi.localIP());
  }
  display.display();
  delay(4000);
}

// ---------- Firebase (REST API via HTTPClient) ----------
void sendToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    firebaseOk = false;
    return;
  }

  // Build JSON payload
  String json = "{";
  json += "\"temp\":" + (isnan(temperature) ? String("0") : String(temperature, 1)) + ",";
  json += "\"hum\":" + (isnan(humidity) ? String("0") : String(humidity, 1)) + ",";
  json += "\"moisture\":" + String(moisturePercent) + ",";
  json += "\"fan\":" + String(fanState ? "true" : "false");
  json += "}";

  // PUT to /compost/current.json (overwrites current readings)
  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/compost/current.json";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(json);

  if (httpCode == 200) {
    Serial.println("Firebase: data sent OK");
    firebaseOk = true;
  } else {
    Serial.print("Firebase error, HTTP code: ");
    Serial.println(httpCode);
    String response = http.getString();
    Serial.println(response);
    firebaseOk = false;
  }
  http.end();

  // Also POST to /compost/history.json (appends to history list)
  HTTPClient http2;
  String histUrl = String(FIREBASE_HOST) + "/compost/history.json";

  // Add a timestamp field (epoch millis from ESP32)
  String histJson = "{";
  histJson += "\"temp\":" + (isnan(temperature) ? String("0") : String(temperature, 1)) + ",";
  histJson += "\"hum\":" + (isnan(humidity) ? String("0") : String(humidity, 1)) + ",";
  histJson += "\"moisture\":" + String(moisturePercent) + ",";
  histJson += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  histJson += "\"ts\":" + String(millis());
  histJson += "}";

  http2.begin(histUrl);
  http2.addHeader("Content-Type", "application/json");
  http2.POST(histJson);
  http2.end();
}

// ---------- Sensors ----------
void readSensors() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  int soilRaw = analogRead(SOIL_PIN);
  moisturePercent = map(soilRaw, 4095, 1500, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  if (!isnan(temperature)) {
    fanState = (temperature > FAN_ON_TEMP);
  }
  digitalWrite(RELAY_PIN, fanState ? RELAY_ON : RELAY_OFF);
}

void printSerial() {
  Serial.println("-------------------------");
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22 sensor error!");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }
  Serial.print("Soil moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");
  Serial.print("Fan: ");
  Serial.println(fanState ? "ON" : "OFF");
  Serial.print("Firebase: ");
  Serial.println(firebaseOk ? "Connected" : "Not connected");
}

void updateOLED() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);

  display.println("FOOD COMPOST MONITOR");
  display.println("--------------------");

  display.print("Temp: ");
  if (isnan(temperature)) display.println("Sensor Error");
  else { display.print(temperature, 1); display.println(" C"); }

  display.print("Humidity: ");
  if (isnan(humidity)) display.println("Sensor Error");
  else { display.print(humidity, 1); display.println(" %"); }

  display.print("Moisture: ");
  display.print(moisturePercent);
  display.println(" %");

  display.print("Fan: ");
  display.println(fanState ? "ON" : "OFF");

  display.println("--------------------");
  display.print(firebaseOk ? "FB:OK " : "FB:-- ");
  display.println("192.168.4.1");

  display.display();
}

// ---------- Arduino ----------
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  analogReadResolution(12);

  dht.begin();
  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED initialization failed!");
    while (true) delay(1000);
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Food Waste Monitor");
  display.println("Initializing...");
  display.display();
  delay(1000);

  startWiFi();

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
  Serial.println("Web server started");

  readSensors();
}

void loop() {
  server.handleClient();

  if (millis() - lastRead >= READ_INTERVAL) {
    lastRead = millis();
    readSensors();
    printSerial();
    updateOLED();
  }

  // Send data to Firebase at a slower rate
  if (millis() - lastFirebaseUpdate >= FIREBASE_INTERVAL) {
    lastFirebaseUpdate = millis();
    sendToFirebase();
  }
}
