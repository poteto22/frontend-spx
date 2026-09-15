# SPX-CG Controller (Front-End Workspace)

ระบบควบคุมกราฟิกการออกอากาศ (Broadcast Graphics Management Interface) สำหรับ **SPX Graphics Control** ออกแบบมาเพื่อให้ผู้ควบคุมรายการออกอากาศ (Broadcast Operators) สามารถจัดการ สร้าง และควบคุมคิวรายการ Rundown กราฟิกได้อย่างสะดวก รวดเร็ว และแม่นยำ

---

## 🌟 คุณสมบัติหลัก (Key Features)

- **ดีไซน์ Light Theme แบบทันสมัย (Modern Light UI)**
  - ออกแบบอินเทอร์เฟซให้สะอาด ชัดเจน สบายตา พร้อมระบบแสดงผลแบบการ์ด ปุ่มควบคุมขนาดใหญ่ และป้ายสถานะ ON-AIR / IDLE ที่เด่นชัด

- **4 หน้าจอหลักสำหรับการทำงาน (4 Dedicated Workspaces)**
  1. **1. Main Rundown**: หน้าจอ Dashboard สรุปภาพรวมรายการ CG ทั้งหมด พร้อมแสดงผลกราฟิกที่กำลัง ON-AIR แบบ Real-time
  2. **2. สร้าง Rundown**: พื้นที่สร้าง เพิ่ม แก้ไข คัดลอก ลบ และจัดลำดับรายการ CG พร้อมระบบ นำเข้า (Import) / ส่งออก (Export) ไฟล์ JSON
  3. **3. ควบคุม Rundown**: แผงควบคุมการออกอากาศหลัก (Main Broadcast Control Desk) พร้อมปุ่มสั่งเล่นขนาดใหญ่ **PLAY ON-AIR**, **NEXT / STEP**, **STOP**, แผงพรีวิว JSON Payload และรายการคิว
  4. **4. ตั้งค่า (Settings)**: หน้าจอตั้งค่าการเชื่อมต่อ SPX Graphics Server (API Endpoint & API Key)

- **ระบบลากเปลี่ยนลำดับรายการ (Drag & Drop Reordering)**
  - ผู้ใช้งานสามารถคลิกลากไอคอน Grip Handle บนการ์ดรายการในหน้าควบคุม Rundown และหน้าสร้าง Rundown เพื่อสลับลำดับคิวได้ทันที

- **ระบบบันทึกอัตโนมัติ (Debounced Auto-Save)**
  - เมื่อมีการแก้ไข เพิ่ม ลบ หรือเปลี่ยนลำดับรายการ ระบบจะบันทึกข้อมูลไปยัง `data/rundown.json` บนดิสก์โดยอัตโนมัติ

- **รองรับฟิลด์ว่าง (Optional Blank Head & Headbar Support)**
  - ช่อง **Head (หัวเรื่อง)** และ **Head Bar Image** สามารถเว้นว่าง (`""`) ได้ สำหรับกรณี CG ที่ต้องการแสดงผลเฉพาะพาดหัวหลัก (Topic)

- **การตรวจจับไฟล์พาสเซตอัตโนมัติ (Dynamic Asset Scanning & Configuration)**
  - อ่านค่าตัวเลือกจาก `data/config.json` และทำการสแกนไฟล์ภาพใน `./assets/bar/` และ `./assets/head/` เพื่อสร้างรายการตัวเลือกใน Dropdown แบบไดนามิก

- **การจับคู่ข้อมูลตาม Item ID ออกอากาศ (Item-Specific Playout Matching)**
  - รองรับการแยกสั่งเล่นและตอบรับข้อมูลรายรายการตาม `itemID` ผ่าน Backend API (`POST /api/active-item`) เพื่อป้องกันปัญหากราฟิกเล่นซ้อนกัน

---

## 📡 สเปกของ API (API Specifications)

### 1. `GET /mainbar` (หรือ URL ของ template itemID)
ส่งคืนค่า JSON ข้อมูลกราฟิกปัจจุบันที่กำลังเลือกหรือสั่งเล่นอยู่ สำหรับให้ไฟล์ HTML Template (`New-bar4.html`) ดึงข้อมูลไปแสดงผล:

```json
{
  "head": "หัวเรื่อง",
  "topic": "มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ",
  "mainbar": "./assets/bar/MAIN BAR.png",
  "headbar": "./assets/head/top-bar-1.png"
}
```

### 2. Endpoints อื่นๆ
- `GET /api/config` - ดึงข้อมูลโครงสร้างคอนฟิกและรายชื่อไฟล์ใน `./assets/`
- `GET /api/items` - ดึงรายการคิว Rundown ทั้งหมด
- `POST /api/items` - บันทึกรายการคิว Rundown
- `POST /api/active-item` - กำหนดรายการ CG ที่กำลังแอ็กทีฟ

---

## 🚀 วิธีการติดตั้งและเปิดใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- **Node.js**: เวอร์ชั่น 14.x ขึ้นไป

### ขั้นตอนการรันระบบ

1. **ดาวน์โหลด / Clone repository**
   ```bash
   git clone https://github.com/poteto22/frontend-spx.git
   cd frontend-spx
   ```

2. **เปิดเซิร์ฟเวอร์ (Node Server)**
   ```bash
   node server.js
   ```

3. **เข้าใช้งานผ่าน Web Browser**
   เปิดเบราว์เซอร์ไปที่:
   ```
   http://localhost:8080/
   ```

---

## 📂 โครงสร้างไดเรกทอรี (Directory Structure)

```
CG-Front/
├── index.html                 # หน้าแรกหลักของระบบ (HTML5 Single Page Web App)
├── server.js                  # Node.js Server บริการ API และ Static Files
├── README.md                  # เอกสารสรุปโปรเจกต์
├── Requirement.MD             # เอกสารข้อกำหนดของระบบ
├── spx_api_v1_documentation.md# เอกสารอ้างอิง API ของ SPX Graphics
├── assets/                    # โฟลเดอร์เก็บไฟล์ภาพกราฟิก
│   ├── bar/                   # ภาพ Main Bar background (.png)
│   └── head/                  # ภาพ Head Bar badge (.png)
├── css/                       # ไฟล์สไตล์ลิ่ง (Vanilla CSS)
│   ├── main.css               # Design System, Design Tokens & Light Theme
│   ├── components.css         # UI Components, Cards, Badges, Drag-and-Drop
│   └── responsive.css         # Responsive rules
├── data/                      # โฟลเดอร์ข้อมูล Local Storage
│   ├── config.json            # ไฟล์คอนฟิกรายการตัวเลือก Dropdowns
│   └── rundown.json           # ไฟล์บันทึกคิวรายการ Rundown ปัจจุบัน
├── js/                        # JavaScript Source Code (ES Modules)
│   ├── app.js                 # Application Entry Point & Navigation Controller
│   ├── store.js               # Central State Management & Auto-Save logic
│   ├── api.js                 # SPX API Client integration
│   ├── components/            # UI Components (Editor dialog, Header, etc.)
│   └── views/                 # View Modules (MainRundown, CreateRundown, Controller, Settings)
└── Example/                   # ตัวอย่างไฟล์เทมเพลต HTML กราฟิก (New-bar4.html)
```

---

## 📄 License & License Notice
พัฒนาขึ้นสำหรับใช้งานร่วมกับระบบ **SPX Graphics Control**
