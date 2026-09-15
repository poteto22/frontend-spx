# 📖 SPX Graphics Controller (SPX-GC) - API v1 Documentation

คู่มืออธิบายการใช้งาน REST API v1 ทั้งหมดของ **SPX Graphics Controller (SPX-GC)** พร้อมตัวอย่างการเรียกใช้งานด้วย `curl` และ `JavaScript`

---

## 📌 สารบัญ (Table of Contents)
1. [ข้อมูลทั่วไป & การตั้งค่า (General Info)](#1-ข้อมูลทั่วไป--การตั้งค่า)
2. [Common API (ระบบทั่วไป & Utilities)](#2-common-api)
3. [Controller API (การควบคุม Rundown & Items)](#3-controller-api)
4. [Server API (การสั่งเล่น CG โดยตรง & บริหารจัดการข้อมูล)](#4-server-api)

---

## 1. ข้อมูลทั่วไป & การตั้งค่า

* **Base URL**: `http://localhost:5656/api/v1` (หรือ IP/Domain ของ SPX Server)
* **Authentication**: หากใน `config.json` มีการตั้งค่า `APIKey` ให้ส่ง Query Parameter `?apikey=YOUR_KEY` หรือ Header ในการเรียกใช้งาน

---

## 2. Common API

### 2.1 GET `/api/v1/version`
> **คำอธิบาย**: ตรวจสอบข้อมูลเวอร์ชันของ SPX Server, ประเภทโปรดักต์, ระบบปฏิบัติการ (OS) และ Host ID

* **Method**: `GET`
* **ตัวอย่างการใช้งาน (`curl`)**:
```bash
curl -X GET http://localhost:5656/api/v1/version
```
* **ตัวอย่างผลลัพธ์ (Response)**:
```json
{
  "vendor": "SPX Graphics",
  "product": "SPX Solo",
  "version": "1.4.0",
  "id": "A1B2C3D4E5F6",
  "os": "darwin"
}
```

---

### 2.2 GET `/api/v1/panic`
> **คำอธิบาย**: สั่งเคลียร์กราฟิกทั้งหมดออกจากหน้าจอทันทีแบบฉุกเฉิน (Clear all layers without out-animations)

* **Method**: `GET`
* **ตัวอย่างการใช้งาน (`curl`)**:
```bash
curl -X GET http://localhost:5656/api/v1/panic
```
* **ตัวอย่างผลลัพธ์**:
```json
{
  "status": 200,
  "message": "OK",
  "info": "Panic executed. Layers cleared forcefully."
}
```

---

### 2.3 GET `/api/v1/feedproxy`
> **คำอธิบาย**: ตัวกลางยิง API ดึงข้อมูล JSON/XML/RSS จากภายนอก เพื่อแก้ปัญหาติด CORS ในเบราว์เซอร์

* **Method**: `GET`
* **Query Parameters**:
  * `url` (Required): URL ของ API/RSS ปลายทาง (หากมี `&` ให้ encode เป็น `%26`)
  * `format` (Optional): `xml` หรือ `json` (ค่าเริ่มต้นคือ `json`)
* **ตัวอย่างการใช้งาน (`curl`)**:
```bash
# ดึงข้อมูล RSS Feed ข่าวเป็น XML
curl -X GET "http://localhost:5656/api/v1/feedproxy?url=https://feeds.bbci.co.uk/news/rss.xml&format=xml"
```

---

### 2.4 POST `/api/v1/feedproxy`
> **คำอธิบาย**: ตัวกลางยิง API ภายนอกรองรับการส่ง Custom Headers (เช่น Authorization Key) และ POST Body

* **Method**: `POST`
* **JSON Body**:
```json
{
  "url": "https://api.example.com/v1/data",
  "headers": {
    "Authorization": "Bearer YOUR_SECRET_TOKEN",
    "Content-Type": "application/json"
  },
  "postBody": "{\"matchId\":\"12345\"}"
}
```
* **ตัวอย่างการใช้งาน (`curl`)**:
```bash
curl -X POST http://localhost:5656/api/v1/feedproxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/v1/data",
    "headers": {
      "Authorization": "Bearer YOUR_SECRET_TOKEN"
    }
  }'
```

---

## 3. Controller API

### 3.1 การควบคุมการเล่น (Item Control)

#### GET `/api/v1/item/play`
> **คำอธิบาย**: สั่ง Play ไอเทมที่กำลังเลือก (Focus) อยู่ในปัจจุบันบน Controller UI

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/play`

#### GET `/api/v1/item/continue`
> **คำอธิบาย**: สั่ง Continue (ส่งสเต็ปถัดไป) ให้ไอเทมที่กำลังเลือกอยู่

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/continue`

#### GET `/api/v1/item/stop`
> **คำอธิบาย**: สั่ง Stop ไอเทมที่กำลังเลือกอยู่

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/stop`

#### GET `/api/v1/item/play/:id`
> **คำอธิบาย**: สั่ง Play ไอเทมเฉพาะเจาะจงตาม `itemID`

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/play/1699991234`

#### GET `/api/v1/item/continue/:id`
> **คำอธิบาย**: สั่ง Continue ไอเทมเฉพาะเจาะจงตาม `itemID`

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/continue/1699991234`

#### GET `/api/v1/item/stop/:id`
> **คำอธิบาย**: สั่ง Stop ไอเทมเฉพาะเจาะจงตาม `itemID`

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/item/stop/1699991234`

---

### 3.2 การย้ายโฟกัส (Focus Control)

* **GET `/api/v1/rundown/focusFirst`**: เลื่อนโฟกัสไปไอเทมแรกสุด
  * `curl http://localhost:5656/api/v1/rundown/focusFirst`
* **GET `/api/v1/rundown/focusNext`**: เลื่อนโฟกัสไปไอเทมถัดไป
  * `curl http://localhost:5656/api/v1/rundown/focusNext`
* **GET `/api/v1/rundown/focusPrevious`**: เลื่อนโฟกัสไปไอเทมก่อนหน้า
  * `curl http://localhost:5656/api/v1/rundown/focusPrevious`
* **GET `/api/v1/rundown/focusLast`**: เลื่อนโฟกัสไปไอเทมสุดท้าย
  * `curl http://localhost:5656/api/v1/rundown/focusLast`
* **GET `/api/v1/rundown/focusByID/:id`**: เลื่อนโฟกัสไปยังไอเทมตาม ID
  * `curl http://localhost:5656/api/v1/rundown/focusByID/1699991234`

---

### 3.3 การจัดการคิวงาน & สั่งงานพิเศษ (Rundown & Invoke)

#### GET `/api/v1/rundown/load?file=ProjectName/RundownName`
> **คำอธิบาย**: สั่งให้ Controller เปิด/โหลดไฟล์ Rundown ที่ระบุ

* **ตัวอย่าง (`curl`)**:
```bash
curl -X GET "http://localhost:5656/api/v1/rundown/load?file=MyFirstProject/MyFirstRundown"
```

#### GET `/api/v1/rundown/stopAllLayers`
> **คำอธิบาย**: สั่งอนิเมชัน Out (Stop) ออกจากหน้าจอทุก Layer ที่ใช้งานอยู่

* **ตัวอย่าง (`curl`)**:
```bash
curl -X GET http://localhost:5656/api/v1/rundown/stopAllLayers
```

#### GET `/api/v1/invokeTemplateFunction`
> **คำอธิบาย**: สั่งเรียกใช้ฟังก์ชัน Custom JavaScript ที่เขียนไว้อยู่ใน CG Template

* **Query Parameters**: `webplayout`, `function`, `params`, `playserver`, `playchannel`, `playlayer`
* **ตัวอย่าง (`curl`)**:
```bash
curl -X GET "http://localhost:5656/api/v1/invokeTemplateFunction?webplayout=1&function=changeThemeColor&params=red"
```

#### GET `/api/v1/invokeExtensionFunction`
> **คำอธิบาย**: สั่งเรียกใช้ฟังก์ชันใน SPX Extension เสริมผ่าน Socket Messaging System

* **Query Parameters**: `function`, `params`
* **ตัวอย่าง (`curl`)**:
```bash
curl -X GET "http://localhost:5656/api/v1/invokeExtensionFunction?function=sendCmd&params=incrementNumber"
```

---

## 4. Server API

### 4.1 POST / GET `/api/v1/directplayout`
> **คำอธิบาย**: สั่งเล่น/หยุด/อัปเดตกราฟิก CG โดยตรงโดยไม่ต้องสร้างไอเทมบน Rundown

* **Method**: `POST` หรือ `GET`
* **JSON Body Parameters**:
  * `command`: `"play"`, `"stop"`, `"next"`, `"update"`
  * `relativeTemplatePath` หรือ `relpath`: Path ของไฟล์ HTML เทมเพลต (เช่น `pack/lower_third.html`)
  * `webplayoutLayer` หรือ `webplayout`: หมายเลข Layer (เช่น `"1"`, `"10"`)
  * `out`: `"manual"` หรือตัวเลขมิลลิวินาทีสำหรับ Auto-stop (เช่น `"5000"`)
  * `DataFields`: อาร์เรย์ของข้อมูล Key-Value
  * `updateRundownItem` (Optional): อัปเดตสถานะปุ่ม Play/Stop บนหน้า UI
* **ตัวอย่างการใช้งาน (`curl`)**:
```bash
curl -X POST http://localhost:5656/api/v1/directplayout \
  -H "Content-Type: application/json" \
  -d '{
    "command": "play",
    "relativeTemplatePath": "mypack/title.html",
    "webplayoutLayer": "1",
    "out": "5000",
    "DataFields": [
      { "field": "f0", "value": "ข่าวเด่นวันนี้" },
      { "field": "f1", "value": "สำนักข่าว SPX News" }
    ]
  }'
```

---

### 4.2 GET `/api/v1/controlRundownItemByID`
> **คำอธิบาย**: สั่งควบคุมไอเทมจากไฟล์ Rundown ที่กำหนดผ่าน Query Parameter

* **Query Parameters**: `file` (Project/Rundown), `item` (itemID), `command` (`play`|`stop`|`next`)
* **ตัวอย่าง (`curl`)**:
```bash
curl -X GET "http://localhost:5656/api/v1/controlRundownItemByID?file=MyProject/FirstRundown&item=1699991234&command=play"
```

---

### 4.3 กลุ่มดึงรายชื่อและข้อมูล (Projects, Rundowns, Templates)

#### GET `/api/v1/getprojects`
> **คำอธิบาย**: คืนค่ารายชื่อ Projects ทั้งหมดใน `DATAROOT/`

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/getprojects`
* **Response**: `["MyFirstProject", "SportsShow", "News2026"]`

#### GET `/api/v1/getrundowns?project=MyProject`
> **คำอธิบาย**: คืนค่ารายชื่อไฟล์ Rundowns ทั้งหมดใน Project ที่กำหนด

* **ตัวอย่าง (`curl`)**: `curl "http://localhost:5656/api/v1/getrundowns?project=MyFirstProject"`
* **Response**: `["MorningNews", "EveningNews"]`

#### GET `/api/v1/allrundowns`
> **คำอธิบาย**: คืนค่าโครงสร้าง Projects และ Rundowns ทั้งหมดในระบบ

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/allrundowns`
* **Response**:
```json
[
  { "project": "MyFirstProject", "rundowns": ["MorningNews", "EveningNews"] },
  { "project": "SportsShow", "rundowns": ["Match01"] }
]
```

#### GET `/api/v1/gettemplates?project=MyProject`
> **คำอธิบาย**: คืนค่ารายการ Templates และการตั้งค่าจากโปรไฟล์ของ Project

* **ตัวอย่าง (`curl`)**: `curl "http://localhost:5656/api/v1/gettemplates?project=MyFirstProject"`

#### GET `/api/v1/getlayerstate`
> **คำอธิบาย**: ตรวจสอบสถานะการ On-air ของ Layers ปัจจุบันในความจำ

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/getlayerstate`

---

### 4.4 กลุ่มจัดการไฟล์ JSON & Scripts

#### GET `/api/v1/rundown/get`
> **คำอธิบาย**: คืนค่าข้อมูล JSON ของ Rundown ปัจจุบันที่โหลดอยู่ในความจำ (RAM)

* **ตัวอย่าง (`curl`)**: `curl http://localhost:5656/api/v1/rundown/get`

#### GET `/api/v1/rundown/json?project=MyProject&rundown=FirstRundown`
> **คำอธิบาย**: คืนค่าเนื้อหา JSON ของไฟล์ Rundown ที่ระบุ

* **ตัวอย่าง (`curl`)**: `curl "http://localhost:5656/api/v1/rundown/json?project=MyProject&rundown=FirstRundown"`

#### POST `/api/v1/rundown/json`
> **คำอธิบาย**: สร้างหรืออัปเดตไฟล์ Rundown (JSON) ใหม่ผ่าน API

* **ตัวอย่าง (`curl`)**:
```bash
curl -X POST http://localhost:5656/api/v1/rundown/json \
  -H "Content-Type: application/json" \
  -d '{
    "project": "MyProject",
    "file": "AutoGeneratedRundown.json",
    "content": {
      "comment": "Generated via API",
      "templates": []
    }
  }'
```

#### GET `/api/v1/executeScript?file=script.bat`
> **คำอธิบาย**: สั่งรันไฟล์ Shell Script / Batch File ที่อยู่ในโฟลเดอร์ `ASSETS/scripts/`

* **ตัวอย่าง (`curl`)**: `curl "http://localhost:5656/api/v1/executeScript?file=start_timer.bat"`

#### GET `/api/v1/getFileList?assetsfolder=excel`
> **คำอธิบาย**: คืนค่ารายชื่อไฟล์ในโฟลเดอร์ย่อยของ `ASSETS/` (เช่น `excel`, `images`)

* **ตัวอย่าง (`curl`)**: `curl "http://localhost:5656/api/v1/getFileList?assetsfolder=excel"`

#### POST `/api/v1/saveCustomJSON`
> **คำอธิบาย**: สร้างหรือบันทึกไฟล์ JSON ข้อมูลใดๆ ไปยังโฟลเดอร์ `ASSETS/json/<subfolder>/<filename>`

* **ตัวอย่าง (`curl`)**:
```bash
curl -X POST http://localhost:5656/api/v1/saveCustomJSON \
  -H "Content-Type: application/json" \
  -d '{
    "subfolder": "myApp",
    "filename": "config.json",
    "content": {
      "autoPlay": true,
      "theme": "dark"
    }
  }'
```
