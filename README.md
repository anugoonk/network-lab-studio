# Network Lab Studio

เว็บแอปฝึกออกแบบ Network Diagram และฝึกใช้ Network CLI แนวทางเดียวกับ Cisco Packet Tracer — ลากอุปกรณ์ วางสาย เปิด Console พิมพ์คำสั่ง แล้วดูผลต่อเครือข่ายที่วาดไว้ทันที
UI เป็นภาษาไทย ส่วนคำสั่ง CLI ชื่อพอร์ต และ output ของอุปกรณ์เป็นภาษาอังกฤษ

> ทุกคำสั่งทำงานกับ **อุปกรณ์จำลองภายในแอปเท่านั้น** — input ของผู้ใช้ไม่ถูกส่งไปรันใน shell ของเครื่อง host (parser จับคู่กับทะเบียนคำสั่งใน TypeScript เท่านั้น)

**ลองใช้งานออนไลน์:** https://anugoonk.github.io/network-lab-studio/ — เป็นเว็บ static ที่ deploy อัตโนมัติจาก `main` ด้วย GitHub Actions (รัน `npm test` ก่อน deploy ทุกครั้ง); งานของแต่ละคนเก็บใน `localStorage` ของเบราว์เซอร์ตัวเอง ไม่มีข้อมูลขึ้นเซิร์ฟเวอร์

## ติดตั้งและเปิดใช้งาน

ต้องมี Node.js 20+ (ทดสอบด้วย Node 24)

```bash
npm install
npm run dev          # เปิดโหมดพัฒนา  http://localhost:5173
npm run build        # type-check + production build → dist/
npm run preview      # เปิด production build  http://localhost:4173
```

## คำสั่งทดสอบ

```bash
npm test                         # unit/integration tests (Vitest) — parser, network behaviour, import/export, README sync
npx playwright install chromium  # ครั้งแรก และทุกครั้งหลังอัปเกรด @playwright/test (เบราว์เซอร์ผูกกับเวอร์ชัน; หรือกำหนด PW_CHROMIUM=path/to/chrome.exe)
npm run e2e                      # ทดสอบ flow หลักผ่าน UI จริงด้วย Playwright (build + preview ให้อัตโนมัติ)
                                 # ถ้ามี server ค้างที่พอร์ต 4173 จะหยุดพร้อมข้อความ error (กันทดสอบกับโค้ดเก่า); ตั้ง PW_REUSE_SERVER=1 ถ้าตั้งใจใช้ server ที่เปิดเอง
```

## วิธีใช้งานโดยย่อ

1. เปิดแอป — ระบบเปิดงานล่าสุด (ครั้งแรกคือ **Sample Lab “Small Office – Cisco & Aruba”**) พร้อมแผง **Lab Guide** ทางซ้าย
2. คลิกอุปกรณ์เพื่อดูรายละเอียด (ชื่อ รุ่นจำลอง พอร์ต IP VLAN) · **ดับเบิลคลิก** เพื่อเปิด Console/Terminal · คลิกพื้นที่ว่างเพื่อดู **Lab details** (เปลี่ยนชื่อ Lab ได้)
3. **เมนูซ้าย**: แถบไอคอน กดปุ่ม ☰ เพื่อขยายเป็นเมนูที่มีชื่อ — Add an object (ลากอุปกรณ์ลง canvas หรือกดที่รายการ), Nodes (รายการอุปกรณ์ กดเพื่อโฟกัส ดับเบิลคลิกเพื่อเปิด Console), Lab Guide, Lab details, Lab Manager, Command Library, เชื่อมสาย, Fit view, ซ่อนป้ายพอร์ต/สถานะ, Fullscreen, Close lab (กลับไป Lab Manager) — เมนูกับ Guide ใช้พื้นที่ซ้ายร่วมกัน (เปิดอย่างใดอย่างหนึ่ง)
4. ต่อสาย: ลากจุดกลมด้านขวาของอุปกรณ์ไปยังอุปกรณ์อื่น (หรือปุ่ม **เชื่อมสาย**) แล้วเลือกพอร์ตต้นทาง/ปลายทาง — พอร์ตที่มีสายแล้วเลือกซ้ำไม่ได้
5. แผงขวามี 3 แท็บ: **รายละเอียด** · **Console** · **Lab Inspector** (อธิบายเหตุผลผล ping ให้ผู้เรียน แยกจาก output ใน terminal)
6. ปุ่ม “ย่อแผงซ้าย” / “ซ่อนแผงขวา” ขยายพื้นที่วาด · **Fit view** ปรับมุมมอง · ล้อเมาส์ = zoom, ลากพื้นหลัง = pan
7. แท็บ **Command Library** ค้นหา/กรองคำสั่ง และกด “ใส่ใน Console” (ไม่รันให้ — ผู้ใช้กด Enter เอง)
8. แท็บ **Lab Manager** รายการ Lab ทั้งหมดที่บันทึกในเบราว์เซอร์ (ดูด้านล่าง)

### Lab Guide (ผู้สอนแก้ไขได้)

แผงคำแนะนำข้างพื้นที่วาด (เหมือนหน้าคู่มือของแล็บบน emulator): **Objective**, **ขั้นตอน** (หลายหัวข้อ) และ **Resources** (ลิงก์)

- ทุก Lab ตัวอย่างมี Guide สำเร็จรูป (โจทย์ฝึกย้ายมาอยู่ที่นี่แล้ว)
- กด **แก้ไข** เพื่อแก้ชื่อ Guide, Objective, เพิ่ม/ลบ/เลื่อนขั้นตอน, เพิ่ม/ลบลิงก์ — บันทึกอัตโนมัติพร้อม Lab และรวมอยู่ในไฟล์ Export
- Lab ที่ไม่มี Guide (เช่น Lab ว่าง) กด “สร้าง Guide” ได้; “ลบ Guide” ต้องยืนยัน
- รูปแบบข้อความ: บรรทัด `- ` = bullet, `1. ` = ลำดับเลข, `` `โค้ด` `` = ตัวอักษรโค้ด, `**หนา**`; ข้อความทั้งหมดแสดงเป็น React element (ไม่ใช้ HTML ดิบ) และลิงก์ต้องขึ้นต้น `http://` หรือ `https://` เท่านั้น (อย่างอื่น เช่น `javascript:` จะไม่แสดงเป็นลิงก์ และไฟล์ที่นำเข้าที่มีลิงก์แบบนี้จะถูกปฏิเสธ)
- ข้อจำกัด: ไม่เกิน 50 ขั้นตอน/30 ลิงก์ต่อ Lab, Objective/เนื้อหาไม่เกิน 4,000 ตัวอักษร

### Lab Manager (รายการ Lab)

ตารางแบบ file manager: ค้นหาชื่อ, เลือกหลายรายการ, ชื่อ/จำนวนอุปกรณ์และสาย/แก้ไขล่าสุด, ปุ่ม **เปิด · ทำสำเนา · Export · ลบ**

- **Lab ใหม่ / Sample / นำเข้า JSON** จากหน้านี้ = เพิ่ม Lab ใหม่ **ในรายการ** (ไม่แทนที่งานที่เปิดอยู่) การสลับ Lab ไม่ทำให้งานเดิมหาย — ทุก Lab บันทึกอัตโนมัติแยกกัน
- ปุ่ม New Lab / Open Sample Lab / Import บนแถบบนยังทำงานแบบเดิม คือ **แทนที่ Lab ที่เปิดอยู่** (มีหน้าต่างยืนยันเมื่อมีงานที่ยังไม่ได้ Export)
- การลบถามยืนยันและกู้คืนไม่ได้ (ให้ Export ก่อน); ลบ Lab ที่เปิดอยู่ = เปิด Lab ล่าสุดที่เหลือ หรือสร้าง Lab ว่างถ้าไม่เหลือ
- ข้อมูลอยู่ใน `localStorage` ของเบราว์เซอร์นี้เท่านั้น (ข้อมูลของเวอร์ชันก่อนที่เก็บ Lab เดียวถูกย้ายเข้ารายการอัตโนมัติ); ยังไม่มีโฟลเดอร์ย่อย

### การแสดงสถานะลิงก์ (ไม่พึ่งสีอย่างเดียว)

| สถานะ | ความหมาย | แสดงผล |
|---|---|---|
| มีสายเชื่อม | มี cable ระหว่างสองพอร์ต | เส้นบน canvas |
| ลิงก์ใช้งานได้ | มีสาย **และ** พอร์ตทั้งสองฝั่งไม่ถูก shutdown | เส้นน้ำเงินอมเขียว (teal) ทึบ + ป้ายเขียว `✓ UP` |
| ลิงก์ down | มีสายแต่มีอย่างน้อยหนึ่งฝั่งถูก shutdown | เส้นแดงประ + ป้าย `✕ DOWN` + ชื่อพอร์ตที่ถูก shutdown มี `⏻` · พอร์ต trunk มีป้าย `⇄T` |

ลิงก์ที่ up แต่ VLAN/trunk ไม่ตรงกัน ยังแสดงเป็น UP (ถูกต้อง — ปัญหาอยู่ที่ VLAN ไม่ใช่ลิงก์) ให้ดูเหตุผลที่ Lab Inspector

## Sample Lab: Small Office – Cisco & Aruba

| อุปกรณ์ | รุ่นจำลอง | พอร์ตที่ใช้ |
|---|---|---|
| R1 | Cisco IOS Router | `GigabitEthernet0/0` = 192.168.1.1/24 → SW1 `GigabitEthernet0/1` |
| SW1 | Cisco IOS L2 Switch | `Gi0/1` (→R1), `Gi0/2` (→SW2 uplink), `Fa0/1`–`Fa0/5` = PC-01..05 |
| SW2 | Aruba AOS-CX L2 Switch | `1/1/24` (uplink ←SW1 `Gi0/2`), `1/1/1`–`1/1/5` = PC-06..PC-10 |
| PC-01..PC-10 | PC | 192.168.1.101–110 /24, gateway 192.168.1.1 |

พอร์ตที่ใช้งานทั้งหมดบน SW1/SW2 เป็น access VLAN 10 (รวมลิงก์ SW1↔SW2 ทั้งสองฝั่ง และลิงก์ไป R1 แบบ untagged) VLAN 20 (GUEST) ถูกสร้างไว้แล้วบน switch ทั้งสองสำหรับโจทย์ฝึก

**โจทย์ฝึก — ทำให้ลิงก์ระหว่าง switch หยุด แล้วกู้คืนด้วย CLI** (มีใน Lab Guide ของ Lab นี้):

```
PC-01> ping 192.168.1.110            → Reply (สำเร็จ)
SW2#   configure terminal
SW2(config)# interface 1/1/24
SW2(config-if)# shutdown
PC-01> ping 192.168.1.110            → Destination host unreachable
PC-01> ping 192.168.1.1              → Reply (R1 ยังต่อกับ SW1)
SW2(config-if)# no shutdown
PC-01> ping 192.168.1.110            → Reply (กู้คืนแล้ว)
```

## Sample Lab 2: Inter-VLAN Routing (ปุ่ม “Sample: Inter-VLAN”)

| อุปกรณ์ | การตั้งค่า |
|---|---|
| R1 (Cisco) | `Gi0/0` ต่อ SW1 `Gi0/1` เป็น trunk-side: sub-interface `Gi0/0.10` = 192.168.10.1/24 (VLAN 10), `Gi0/0.20` = 192.168.20.1/24 (VLAN 20); `Gi0/1` = 10.0.0.1/30 ไป R2; `ip route 172.16.0.0 255.255.255.0 10.0.0.2` |
| R2 (Cisco) | `Gi0/0` = 10.0.0.2/30, `Gi0/1` = 172.16.0.1/24 ไป PC-E; default route `ip route 0.0.0.0 0.0.0.0 10.0.0.1` |
| SW1 (Cisco L2) | `Gi0/1` trunk → R1, `Gi0/2` trunk → SW2 (allowed 10,20); `Fa0/1` = VLAN 10 (PC-A), `Fa0/2` = VLAN 20 (PC-B) |
| SW2 (Aruba) | `1/1/24` trunk (allowed 10,20); `1/1/1` = VLAN 10 (PC-C), `1/1/2` = VLAN 20 (PC-D) |
| PC | PC-A .10.11, PC-B .20.11, PC-C .10.12, PC-D .20.12, PC-E 172.16.0.10 |

โจทย์ฝึกอยู่ใน Lab Guide ของ Lab นี้ (ตัด VLAN ออกจาก allowed list, ลบ default route แล้วดูขากลับล้ม, ตั้ง SVI บน SW2 ให้เป็น gateway)

## Sample Lab 3: Campus 3 Tier – Aruba CX (ปุ่ม "+ Sample: Campus 3 Tier (Aruba CX)" ใน Lab Manager)

ย่อมาจาก Lab "Campus 3 Tier L2 Access with VSX and OSPF" ของ Aruba Virtual Enablement Center (ดูตัวอย่างบน EVE-NG) ให้เหลือเฉพาะสิ่งที่ simulator นี้มี — อุปกรณ์ 7 ตัว สาย 9 เส้น ชื่ออุปกรณ์ตรงกับต้นฉบับ (SwitchX-Core-1, SwitchY-Core-2, SwitchA-VSX, SwitchB-VSX, SwitchC-Access, VPC1, VPC2)

| ชั้น | การตั้งค่า |
|---|---|
| Core (X, Y) | ลิงก์ routed `/31` ลงไป SwitchA/B (`192.168.4.8`–`.21`) และต่อกันเอง `192.168.4.24/31`; static route ไป `10.10.100.0/24`, `10.10.200.0/24` ผ่าน SwitchA |
| Distribution (A, B) | SVI VLAN 100/200 (A = `.252`, B = `.253`), trunk ISL A–B และ trunk ลง SwitchC (VLAN 100,200); default route → Core-1 |
| Access (C) | `1/1/1` trunk ไป SwitchA, `1/1/3` = VLAN 100 (VPC1 `10.10.100.11`), `1/1/4` = VLAN 200 (VPC2 `10.10.200.11`) |

**สิ่งที่ต่างจากต้นฉบับ (ไม่มีใน simulator):** VSX, Active-Gateway, LAG (ISL/RLAG), VRF keepalive, loopback และ OSPF — ใช้ static route แทน OSPF, ใช้ IP ของลิงก์ routed แทน loopback เป็นเป้าหมาย ping, SwitchA เป็น gateway เดียวของ VPC (SwitchB มี SVI ของตัวเองแต่ VPC ไม่ได้ชี้ไป) และ SwitchC ต่อกับ SwitchA ที่เดียว (ต่อสองทางโดยไม่มี VSX/STP จะเกิด loop) โจทย์ฝึกอยู่ใน Lab Guide (ping ข้าม VLAN/ข้าม core, `show ip route`, ลบ route ขากลับที่ Core-2 แล้วดูว่าขาไปถึงแต่ขากลับหาย)


### การบันทึกงานและความปลอดภัยของข้อมูล

- **Autosave:** ทุกการแก้ไขบันทึกลง `localStorage` ของเบราว์เซอร์อัตโนมัติ — การปิดหน้าไม่ทำให้งานหาย และจะ **ไม่มี** prompt "ออกจากหน้านี้?" ในกรณีปกติ
- **เมื่อเบราว์เซอร์ไม่ยอมให้บันทึก** (private mode, พื้นที่เต็ม, ถูกบล็อก): แถบเตือนสีแดงปรากฏทันทีที่เปิดหน้า พร้อมปุ่ม Export และเบราว์เซอร์จะถามยืนยันก่อนปิดหน้าถ้ามีการแก้ไขที่ยังไม่ได้ Export
- **Lab จากรุ่น/ขนาดเก่า:** switch ที่มีพอร์ต *น้อยกว่า* รุ่นปัจจุบัน (เช่น Aruba 12 พอร์ต หรือ Cisco ที่ไม่มี Fa0/13–24) นำเข้าและเปิดได้ โดยคง device ID, ชื่อพอร์ต, config และปลายสายตามที่บันทึกไว้ (CLI/ตัวเลือกพอร์ตรู้จักเฉพาะพอร์ตที่มีจริง) — ชื่อพอร์ตที่ไม่ใช่ของรุ่นนั้น และอุปกรณ์ที่ไม่มีพอร์ตเลย ยังถูกปฏิเสธ
- **ไม่ทิ้ง Lab ที่เปิดไม่ได้อย่างเงียบ ๆ:** ถ้า Lab ที่บันทึกไว้ในเบราว์เซอร์ไม่ผ่านการตรวจตอนเปิดแอป แอปจะเริ่มด้วย Lab ปกติ แต่ **เก็บสำเนาต้นฉบับไว้ก่อนที่ autosave จะเขียนทับ** (คีย์ `nls.workspace.rejected.v1` เก็บล่าสุดสูงสุด 20 รายการ) และแสดงแถบเตือนสีแดงพร้อมชื่อ Lab เหตุผล และปุ่ม "ดาวน์โหลดสำเนา" (ไฟล์ `nls-recovered-labs.json` — แต่ละรายการเป็น envelope แบบ export ปกติ แยกเป็นไฟล์เองแล้ว import ได้เมื่อแก้ปัญหาแล้ว)
- **มุมมอง canvas:** Lab ว่างเริ่มที่ zoom 1x และอุปกรณ์ตัวแรกไม่ทำให้ซูมเข้าอีกต่อไป; "Fit view" จำกัดไม่เกิน 1.25x เพื่อไม่ขยาย Lab ที่มีอุปกรณ์ 1–2 ตัวจนใหญ่เกินไป และไม่ทำอะไรเมื่อ Lab ว่าง
- **สองภาษา (TH / EN):** ปุ่ม **TH | EN** มุมซ้ายบนของแถบเมนูสลับภาษาของหน้าจอทั้งหมด (เมนู ข้อความแจ้งเตือน Command Library คำอธิบายคำสั่ง คำอธิบายผล ping/Check และข้อความ error) ค่าเริ่มต้นคือภาษาไทย และจำค่าที่เลือกไว้ในเบราว์เซอร์ การสลับ **โหลดหน้าใหม่** (Lab ถูกบันทึกก่อน แต่ transcript ใน Console และประวัติ Undo จะหาย) — ข้อควรรู้: (1) output ของอุปกรณ์ใน Console (CLI) เป็นภาษาอังกฤษเสมอตามของจริง (2) เนื้อหาที่อยู่ในตัว Lab เช่น Guide, โจทย์, คำใบ้, ชื่อ Sample **ถูกเขียนตามภาษาตอนสร้าง Lab** และเก็บเป็นข้อมูล — สลับภาษาแล้ว Lab ที่เปิดอยู่ไม่เปลี่ยนภาษา ให้สร้าง Sample ใหม่จาก Lab Manager เพื่อได้เวอร์ชันภาษาที่เลือก (3) คำแปลภาษาอังกฤษเขียนโดย AI ภาษาไทยเป็นต้นฉบับ ถ้าพบคำแปลที่ไม่เหมาะ แก้ที่ `src/i18n/en.ts` (คีย์คือข้อความไทย) (4) ไฟล์ README นี้ยังเป็นภาษาไทยอย่างเดียว
- **Tab ใน Console:** กด Tab เพื่อเติมคำที่กำลังพิมพ์ (เช่น `conf` → `configure `) ถ้าเหลือหลายตัวเลือกจะเติมส่วนที่เหมือนกัน แล้วกด Tab ซ้ำเพื่อแสดงรายการ; เติมได้ทั้งคำสั่ง ชื่อ interface (Cisco พิมพ์ย่อ `gi0/1` ได้ จะขยายเป็นชื่อเต็ม), หมายเลข VLAN ที่มีอยู่ และเป้าหมายของ `ping` (IP ที่ตั้งไว้ใน Lab ยกเว้นของเครื่องเอง) ใช้ได้กับ Cisco IOS, Aruba AOS-CX และ PC Terminal ตาม mode ปัจจุบัน ไม่เติมค่าอิสระ เช่น hostname/description/IP ที่ยังไม่มีใน Lab
- **`interface range`:** Cisco `interface range fa0/1 - 4`, `fa0/1-2 , gi0/1`, `fastethernet 0/1 - 2` และ AOS-CX `interface 1/1/1-1/1/4`, `1/1/1-4,1/1/10` เลือกหลายพอร์ตพร้อมกัน (สูงสุด 48 พอร์ต) คำสั่ง interface ที่พิมพ์ต่อไปมีผลกับทุกพอร์ต; ถ้าคำสั่งผิดพลาดจะไม่มีพอร์ตใดเปลี่ยน; `exit`/`end`/`interface …` ออกจาก range prompt เป็น `(config-if-range)#` (Cisco) หรือ `(config-if-<1/1/1-1/1/4>)#` (AOS-CX — รูปแบบ prompt ยังไม่ได้ยืนยัน) ช่วงที่เลือกถูกบันทึกในไฟล์ Lab
- **แอนิเมชันแพ็กเก็ต:** เมื่อ ping (จาก Terminal หรือแผง Inspector) จะมีจุดวิ่งตามเส้นทางขาไป (สีน้ำเงิน) แล้วขากลับ (สีเขียว) บน canvas; ถ้า ping ไม่สำเร็จจะหยุดที่จุดที่แพ็กเก็ตไปไม่ถึงพร้อมเครื่องหมาย ✕ สีแดง ปุ่มมุมขวาบนของ canvas เปิด/ปิดแอนิเมชัน และไม่แสดงเมื่อเบราว์เซอร์ตั้ง "ลดการเคลื่อนไหว" (prefers-reduced-motion) — เป็นภาพประกอบการตรวจเส้นทางที่ simulator คำนวณ ไม่ใช่การจำลองแพ็กเก็ตจริงทีละเฟรม
- **แชร์ Lab ผ่านลิงก์:** เมนู "แชร์ลิงก์ Lab" บีบอัด Lab (deflate) ลงใน URL ส่วน `#lab=…` แล้วคัดลอกให้ ผู้รับเปิดลิงก์แล้ว Lab จะถูกเพิ่มเป็น Lab ใหม่ในรายการ (Lab เดิมของผู้รับไม่ถูกแทนที่) ข้อมูลอยู่ใน fragment จึง **ไม่ถูกส่งไปที่เซิร์ฟเวอร์** และผ่านการตรวจ schema เดียวกับการนำเข้าไฟล์ (จำกัดขนาดหลังคลายบีบอัด 5 MB); ลิงก์ที่ถูกตัด/เสียจะแจ้งข้อผิดพลาดและไม่เปลี่ยนอะไร; ถ้าลิงก์ยาวเกิน 8,000 ตัวอักษรจะเตือน (แอปแชทบางตัวตัดลิงก์ — ใช้ไฟล์ Export แทน); ถ้าเบราว์เซอร์ไม่ให้เขียน clipboard จะแสดงลิงก์ในกล่องให้คัดลอกเอง; Lab ว่างไม่มีอะไรให้แชร์ ผู้รับต้องใช้เบราว์เซอร์รุ่นใหม่ที่รองรับ `DecompressionStream`
- **เครื่องมือผู้สอน:** ใน Editor ของ Challenge เลื่อน Check ขึ้น/ลง, ทำสำเนา Check (แก้ค่าต่อได้โดยลบแล้วเพิ่มใหม่ — ปัจจุบันแก้ได้เฉพาะชื่อที่แสดง), เลื่อนคำใบ้ขึ้น/ลง
- **หมายเหตุใน Console ของ AOS-CX:** ใต้ Console ของอุปกรณ์ Aruba มีกล่อง "ผลลัพธ์ AOS-CX บางส่วนเป็นค่าประมาณ" แสดงรายการที่ยังไม่ได้ยืนยัน (`show arp`, `show mac-address-table`, พฤติกรรม `vlan trunk allowed`, prompt ของ range, ค่าเริ่มต้นของพอร์ต)
- **ชื่อ tab ของเบราว์เซอร์** ตามชื่อ Lab และมี `●` นำหน้าเมื่อมีการแก้ไขที่ยังไม่ได้ Export ไฟล์ (เหมือนป้าย "● ยังไม่ได้ Export" ที่แถบตำแหน่ง) — งานยังบันทึกอัตโนมัติอยู่ ไม่ได้หมายความว่าจะหาย
- **คัดลอก config:** ปุ่ม "คัดลอก config" ที่แผงรายละเอียดอุปกรณ์และหัว Console (router/switch เท่านั้น) คัดลอก running-config ไปที่ clipboard — ต้องให้เบราว์เซอร์อนุญาตการเขียน clipboard ไม่เช่นนั้นจะแจ้งให้ใช้ `show running-config` แทน


## ตาราง ARP / MAC, ตรวจ IP ซ้ำ และ Challenge mode

- **คำสั่งใหม่:** Cisco `show ip arp` (router/switch) และ `show mac address-table` (switch); Aruba `show arp` และ `show mac-address-table`; PC `arp -a`
- **คำนวณจาก topology + config ปัจจุบันทุกครั้ง** (ไม่ใช่ข้อความตายตัว): MAC ของแต่ละพอร์ตสร้างจาก hash ของรหัสอุปกรณ์ + ชื่อพอร์ต (คงที่ข้ามการบันทึก/โหลด); switch เรียนรู้ MAC ตาม VLAN และพอร์ตขาเข้าจริง (trunk, router-on-a-stick, SVI); ย้ายพอร์ตไป VLAN อื่น / shutdown / ถอดสาย แล้วตารางเปลี่ยนทันที
- **ข้อจำกัดที่ต้องรู้:** เป็นภาพ *steady-state* — สมมติว่าทุกอินเทอร์เฟซที่มี IP และลิงก์ up เคยส่งเฟรมแล้ว จึงไม่จำลองการเรียนรู้ทีละขั้น, aging, ARP แบบ on-demand หรือคอลัมน์ Age ที่แท้จริง (Age แสดง `-` สำหรับ IP ของตัวเอง และ `0` สำหรับรายการอื่น)
- **ตรวจ IP ซ้ำ:** นับเฉพาะ IP เดียวกันบนอินเทอร์เฟซที่อยู่ L2 domain เดียวกันและลิงก์ up (IP เดียวกันคนละ VLAN/คนละส่วนที่ route กัน ไม่นับ); แสดงป้าย "⚠ IP ซ้ำ" บน canvas และรายการในแท็บ Inspector; IOS พิมพ์ `%IP-4-DUPADDR: Duplicate address … on <interface>, sourced by <MAC>` หลัง `ip address` / `no shutdown` ที่ทำให้เกิดการซ้ำ; `ipconfig` ของ PC แสดง `(Duplicate)` ต่อท้าย IP
- **Challenge mode:** ผู้สอนเพิ่ม Check ได้ 7 ชนิด — ping ได้/ไม่ได้, ลิงก์ up, บรรทัดใน running-config, trunk ส่ง VLAN, พอร์ตเปิด/ปิด, มีเส้นทางใน routing table, ไม่มี IP ซ้ำ — ทุกชนิดตรวจจาก Lab จริง และผลที่แสดงไม่เฉลยสาเหตุ (ข้อควรระวัง: Check แบบ "บรรทัดใน running-config" อ่านแล้วอาจเฉลยคำตอบ ใช้ตามความเหมาะสม)
- **โจทย์ Challenge สำเร็จรูป 3 ข้อ** (เมนู `Challenge ▾` บนแถบบน และปุ่มใน Lab Manager) — ทุกข้อมี Guide, Check และจุดเริ่มต้นสำหรับรีเซ็ต:
  1. **Inter-VLAN เสีย** — trunk ไม่อนุญาต VLAN 20, R2 ไม่มี default route, gateway ของ PC-C ผิด
  2. **IP ซ้ำ + VLAN ผิด + พอร์ตปิด** (Small Office) — ใช้ `show mac address-table` / `show ip arp` / Inspector หาเครื่องที่ผิด
  3. **Campus + ISP** — ใช้ Layer 3 Switch (DSW1, AOS-CX) เป็น gateway, Cisco access switch, ISP router, Server, Laptop และ AP: SVI VLAN 20 ถูก shutdown, DSW1 ไม่มี default route, ISP1 ไม่มี route ขากลับของ VLAN 10 — ปัญหาซ้อนกัน แก้ทีละชั้นจึงจะเห็นชั้นถัดไป
- **รีเซ็ตโจทย์:** ปุ่ม "↺ รีเซ็ตโจทย์" (ถามยืนยันก่อน) คืนอุปกรณ์/สาย/config/ตำแหน่งเป็นสถานะเริ่มต้นของโจทย์ — เก็บ Guide และ Check ไว้, ล้างผลตรวจและ transcript, รีเซ็ต session CLI ของอุปกรณ์ที่ config เปลี่ยน และ **ย้อนกลับด้วย Undo ได้ในขั้นเดียว** จุดเริ่มต้นถูกบันทึกในไฟล์ Lab (Export/Import ไปด้วย และตรวจความถูกต้องตอน import); ผู้สอนสร้างโจทย์เองจะได้จุดเริ่มต้นเป็นสถานะ Lab ตอนกด "สร้างโจทย์" และกด "ใช้สถานะ Lab ตอนนี้เป็นจุดเริ่มต้น" ซ้ำได้ใน Editor
- **คำใบ้ (Hint):** โจทย์มีคำใบ้ได้สูงสุด 10 ข้อ เรียงจากกว้างไปแคบ ผู้เรียนกด "💡 ขอใบ้" เพื่อเปิดทีละข้อ (ข้อสุดท้ายของโจทย์ตัวอย่างทั้ง 3 เป็นเฉลย) จำนวนที่เปิดแล้วคงอยู่ขณะสลับแผง/โหมดแก้ไข และเริ่มใหม่เมื่อเปิด Lab อื่น ผู้สอนเพิ่ม/แก้/ลบคำใบ้ได้ใน Editor ของ Challenge; คำใบ้อยู่ในไฟล์ Lab (Export/Import ไปด้วย, ไฟล์เก่าที่ไม่มีคำใบ้ยังเปิดได้)
- **บั๊กที่พบระหว่างทำโจทย์ที่ 3 และแก้แล้ว:** พอร์ต routed ของ AOS-CX ที่ต่อกับ router โดยตรง (uplink /30) ไม่ถูกนับเป็นปลายทาง L3 ทำให้ ping ขากลับจาก router มาหา L3 switch ล้มทั้งที่ config ถูก
- **สถานะการตรวจ output:** `show ip arp` (Cisco) ตรวจกับเอกสารทางการแล้ว (หัวคอลัมน์, `-` = local); `show mac address-table` ตรวจกับตัวอย่างจาก Cisco Community (ไม่ใช่เอกสารทางการ); `%IP-4-DUPADDR` ตรวจกับ Cisco Community KB; **Aruba `show arp` / `show mac-address-table`, Windows `arp -a` และ `(Duplicate)` เขียนจากความจำ ยังไม่ได้ยืนยัน** — ระยะห่างคอลัมน์เป็นการประมาณ


## ขอบเขต

**รองรับ**

- Ethernet point-to-point, access VLAN (untagged) และ **802.1Q trunk** (allowed VLAN list, native VLAN), IPv4 + subnet mask, default gateway
- **Router-on-a-stick**: sub-interface (`interface gi0/0.10` + `encapsulation dot1Q 10`) บน Cisco router
- **SVI** (`interface vlan N`): บน Aruba AOS-CX ทำให้ switch route ระหว่าง VLAN ได้ (เป็น gateway ของ VLAN); บน Cisco 2960 (L2 switch) เป็น management IP เท่านั้น + `ip default-gateway` (ไม่ route ระหว่าง VLAN ตามของจริง)
- **Static route / default route** บน Cisco router (`ip route net mask next-hop`) และ Aruba (`ip route a.b.c.d/len next-hop`); route จะใช้ได้ก็ต่อเมื่อ next hop อยู่ใน subnet ของ interface ที่ up/up; Aruba routed port ตั้ง IP ได้ (`routing` + `ip address`)
- การทดสอบ reachability ด้วย ICMP echo (`ping`) — คำนวณใหม่จาก topology + config ปัจจุบันทุกครั้ง: ตรวจสาย, admin state ของพอร์ตทั้งสองฝั่ง, VLAN/trunk/allowed/native ของแต่ละ switch (การ tag/untag ระหว่างลิงก์), sub-interface, SVI, routing table (connected + static) และเส้นทางขากลับ; ป้องกัน loop ด้วย visited set (และจำกัดจำนวน hop ของ routing)
- PC ใน subnet เดียวกันสื่อสารกันโดยตรง; ปลายทางนอก subnet ต้องผ่าน default gateway ที่เป็นอุปกรณ์ L3 (router หรือ Aruba switch) บนลิงก์ที่เข้าถึงได้; อุปกรณ์ที่ไม่ใช่ L3 (PC, Cisco L2 switch) ไม่ส่งต่อแพ็กเก็ต
- CLI แยกตามระบบปฏิบัติการ (Cisco IOS / Aruba AOS-CX / PC) ต่อ device ละ config, CLI mode และ command history; ย่อคำสั่งได้ (`conf t`, `int gi0/1`); `?` แสดงคำสั่งใน mode ปัจจุบัน; `do show ...` ใน config mode
- Auto-save ลง `localStorage` (หลาย Lab ใน Lab Manager), Export/Import JSON (มี `schemaVersion`, ตรวจชนิดข้อมูล พอร์ต trunk/sub-interface/SVI/route และการอ้างอิงอุปกรณ์ก่อนนำเข้า; ไฟล์เก่าก่อนมี trunk/SVI ยังนำเข้าได้)

**ยังไม่รองรับ (ตั้งใจตัดออก)**

- DTP (การเจรจา trunk อัตโนมัติ — Cisco `dynamic auto` ถือเป็น access), VTP, Spanning Tree (การต่อ loop ไม่ทำให้ค้าง แต่ไม่มี STP block พอร์ตให้), LACP/port-channel
- IPv6, DHCP, DNS, dynamic routing (RIP/OSPF/EIGRP), metric/administrative distance ของ route (static แสดงเป็น [1/0] คงที่), recursive next hop (next hop ต้องอยู่ใน subnet ที่ต่อตรง), ACL, NAT, VRF (ARP/MAC table รองรับแล้วแบบ steady-state ดูหัวข้อ "ตาราง ARP / MAC…" ด้านล่าง; ไม่มีการจำลอง ARP แบบ on-demand/aging)
- `ip routing` บน Cisco L2 switch (ตามของจริง Catalyst 2960 ไม่ route), `show interfaces <name>` บน Cisco, `reload`
- ping ใช้ ICMP echo แบบสรุปผล (ไม่มี TTL/fragmentation จริง และ latency เป็นค่าคงที่)

## รุ่น/เวอร์ชันอ้างอิงของ CLI profile และสถานะการตรวจสอบ

| Profile | รุ่นจำลอง | เวอร์ชันอ้างอิง |
|---|---|---|
| Cisco IOS Router | Cisco ISR 2911 | IOS 15.4(3)M |
| Cisco IOS L2 Switch | Catalyst 2960-24TT | IOS 15.0(2)SE |
| Aruba AOS-CX L2 Switch | Aruba CX 6100 24G | ArubaOS-CX 10.10 |

พฤติกรรมเริ่มต้นที่เลียนแบบของจริง (ตามที่เข้าใจ ยังไม่ได้ยืนยันกับเอกสาร): พอร์ต router (Cisco) และพอร์ต AOS-CX เริ่มต้นเป็น **shutdown**; พอร์ต Catalyst เริ่มต้นเป็น up (VLAN 1); พอร์ต AOS-CX เริ่มต้นเป็น **routed** จึงต้องสั่ง `no routing` ก่อนใช้ `vlan access`; Cisco `switchport access vlan N` จะสร้าง VLAN ให้อัตโนมัติพร้อมข้อความเตือนตาม IOS 15.0

> **สถานะการตรวจสอบ syntax และ output (อัปเดต 2026-11-09, ตรงตามจริง)** — แบ่งตามระดับหลักฐาน:
>
> **ตรวจกับเอกสารทางการของ Cisco แล้ว (cisco.com — Catalyst 2960/2960-X config & command reference, IOS IP Routing reference):**
> - `switchport trunk allowed vlan {add | all | except | remove}` และรูปแบบ vlan-list ไม่มีช่องว่าง; ค่าเริ่มต้น "ทุก VLAN" (1-4094); native VLAN เริ่มต้น 1
> - `show interfaces trunk` มี 4 ตารางและหัวคอลัมน์ตรงกับของจริง (Port/Mode/Encapsulation/Status/Native vlan; Vlans allowed on trunk; … allowed and active in management domain; … in spanning tree forwarding state and not pruned)
> - `show ip route`: legend บรรทัดแรก (`Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP`), `Gateway of last resort`, การจัดกลุ่มตาม classful network (`… is variably subnetted, N subnets, M masks` / `… is subnetted, N subnets`) และรูปแบบบรรทัด static `S  net [1/0] via next-hop` — แก้ให้ตรงตามนี้แล้วในรอบนี้
> - **ที่ยังเป็นการประมาณ:** ระยะห่างคอลัมน์ของ `show interfaces status` / `show vlan brief` (เอกสาร 2960 ไม่มีตัวอย่างตารางให้เทียบ), `show version`, ข้อความ ping/error ของ IOS (ตรงตามที่รู้จักทั่วไป แต่ยังไม่ได้เทียบกับหน้าเอกสาร)
>
> **Aruba AOS-CX — เอกสารทางการเข้าไม่ได้:** เซิร์ฟเวอร์ `arubanetworking.hpe.com` ตอบ HTTP 403 และหน้า `support.hpe.com` ไม่คืนเนื้อหา จึงตรวจได้เพียง (1) สรุปจากผลค้นหาที่อ้างหน้าเอกสาร AOS-CX CLI Bank และ (2) transcript จริงจาก "AOS-CX Simulator VSX Lab Guide" (arubase.club) ซึ่งเป็น output จากสวิตช์ AOS-CX จริง:
> - ยืนยัน: `vlan trunk allowed <list|all>` / `no vlan trunk allowed <list>`, `vlan trunk native <id>`, `vlan access <id>` คู่กับ `no routing`, running-config แบบ `vlan 1,100` / `interface 1/1/1` / `no shutdown` / `no routing` / `vlan access 100`, `interface vlan100` + `ip address a.b.c.d/len`, ชื่อ prompt `config-if-vlan` และคอลัมน์ `show vlan` (VLAN, Name, Status, Reason, Type, Interfaces) กับการยุบพอร์ตเป็นช่วง
> - **แก้แล้วในรอบนี้:** `show ip interface brief` ใช้ layout จริง (`Interface / IP Address / Interface Status` + `link/admin`, พอร์ต routed ที่ไม่มี IP แสดง `No Address`, พอร์ต L2 ไม่แสดง) — ระยะห่างคอลัมน์ยังเป็นการประมาณเพราะ PDF ทำให้ช่องว่างเพี้ยน
> - **`vlan trunk allowed` (แก้แล้ว ยังไม่ยืนยันกับเอกสารทางการ):** บทความ blog ของบุคคลที่สามรายงานว่าคำสั่งนี้บน AOS-CX **เพิ่ม** VLAN เข้ารายการเดิม และผลค้นหาสรุปว่า command reference ของ HPE ระบุว่ารูป `no` "ลบ VLAN ออกจาก trunk" ซึ่งสอดคล้องกัน (ผมยังไม่ได้เปิดอ่านหน้านั้นเอง) — simulator จึง **เพิ่มต่อจากรายการเดิม** (ถ้าพอร์ตเป็น `all` อยู่ จะเหลือเฉพาะที่ระบุ, ลบด้วย `no vlan trunk allowed <list>`) แต่หน้า command reference เข้าไม่ได้ (HTTP 403) จึงยังไม่เห็นข้อความที่ยืนยันตรง ๆ ว่าเพิ่มหรือแทนที่ — ควรตรวจกับสวิตช์/emulator จริง
> - **ยังไม่ยืนยัน:** สถานะเริ่มต้นของ SVI (sim ตั้งเป็น up; เอกสารที่เข้าถึงได้เพียงแสดงตัวอย่างที่สั่ง `no shutdown` ชัดเจน), ข้อความ error ของ AOS-CX (`% Unknown command.` ฯลฯ), layout ของ `show ip route` (รุ่น 10.x ต่างกันมีทั้งแบบตารางและแบบ `via …`), ตัวอย่างผลลัพธ์ของ `ping` และ `show interface <port>`
>
> **คำแนะนำ:** ถ้าใช้สอนหรือเตรียมสอบ ให้ตรวจ output ที่ติดป้าย "ยังไม่ยืนยัน" กับอุปกรณ์/emulator จริงก่อน

## คำสั่งที่รองรับ

ตารางนี้สร้างจากทะเบียนคำสั่งเดียวกับที่ parser, `?` และ Command Library ใช้ (มี test ตรวจว่าตารางตรงกับทะเบียนเสมอ — สร้างใหม่ด้วย `GEN_DOCS=1 npx vitest run tests/docs.test.ts`) และทุกตัวอย่างในคอลัมน์ “ตัวอย่างที่รันได้” ถูกรันจริงใน test

<!-- COMMANDS:START -->

### Cisco IOS — Router (Cisco ISR 2911 (simulated), Cisco IOS 15.x (15.4(3)M))

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| User EXEC | `enable` | `enable` | เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #) |
| Privileged EXEC | `disable` | `disable` | กลับไป User EXEC mode |
| Privileged EXEC | `configure terminal` | `configure terminal` | เข้า Global Configuration mode เพื่อแก้ config |
| User EXEC, Privileged EXEC, Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv → user) |
| Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `end` | `end` | กลับ Privileged EXEC ทันทีจากทุกระดับของ config |
| Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `do <command>` | `do show running-config` | รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode |
| Privileged EXEC | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (hostname, VLAN, interface, trunk, IP, route, shutdown) |
| Privileged EXEC | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory) |
| User EXEC, Privileged EXEC | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง |
| User EXEC, Privileged EXEC | `show ip interface brief` | `show ip interface brief` | สรุป IP และสถานะ (Status/Protocol) ของ interface — router แสดงพอร์ตและ sub-interface, switch แสดง Vlan SVI ด้วย |
| User EXEC, Privileged EXEC | `show ip arp` | `show ip arp` | ดูตาราง ARP (IP → MAC) ของอุปกรณ์ — แสดงเครื่องใน L2 domain เดียวกันที่ลิงก์ up (ไม่จำลองการเรียนรู้/หมดอายุ) Age "-" คือ IP ของตัวเอง |
| User EXEC, Privileged EXEC | `show ip route` | `show ip route` | ดูตาราง routing: C/L (connected), S (static), S* (default route) |
| User EXEC, Privileged EXEC | `ping <ip-address>` | `ping 192.168.1.101` | ทดสอบ ping จาก router/switch (ที่มี IP หรือ SVI) ไปยัง IPv4 ปลายทาง |
| Privileged EXEC | `write memory` | `write memory` | บันทึก running-config ลง startup-config |
| Privileged EXEC | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config ลง startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname CORE1` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, Sub-interface config | `interface <interface>` | `interface GigabitEthernet0/1` | เข้า Interface Configuration ของพอร์ต router หรือ sub-interface (เช่น gi0/0.10 — สร้างให้อัตโนมัติ) |
| Global config | `no interface <interface>` | `no interface GigabitEthernet0/0.10` | ลบ sub-interface (ลบพอร์ตจริงไม่ได้) |
| Global config | `ip route <network> <route-mask> <next-hop>` | `ip route 172.16.0.0 255.255.255.0 10.0.0.2` | เพิ่ม static route ไปยังเครือข่ายปลายทางผ่าน next hop (default route = 0.0.0.0 0.0.0.0 <next-hop>) |
| Global config | `no ip route <network> <route-mask> <next-hop>` | `no ip route 172.16.0.0 255.255.255.0 10.0.0.2` | ลบ static route |
| Interface config, Sub-interface config, VLAN interface config | `shutdown` | `shutdown` | ปิดพอร์ต/sub-interface/SVI (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config, Sub-interface config, VLAN interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน) |
| Interface config, Sub-interface config, VLAN interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2) |
| Sub-interface config | `encapsulation dot1Q <vlan-id>` | `encapsulation dot1Q 10` | กำหนดให้ sub-interface รับ-ส่งเฟรม tagged VLAN นี้ (router-on-a-stick) — ต้องทำก่อนตั้ง IP |
| Interface config, Sub-interface config | `ip address <ip-address> <subnet-mask>` | `ip address 10.0.0.1 255.255.255.0` | ตั้ง IPv4 และ subnet mask ให้ routed interface หรือ sub-interface |
| Interface config, Sub-interface config | `no ip address` | `no ip address` | ลบ IP ออกจาก interface หรือ sub-interface |

### Cisco IOS — Layer 2 Switch (Cisco Catalyst 2960-24TT (simulated), Cisco IOS 15.0(2)SE)

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| User EXEC | `enable` | `enable` | เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #) |
| Privileged EXEC | `disable` | `disable` | กลับไป User EXEC mode |
| Privileged EXEC | `configure terminal` | `configure terminal` | เข้า Global Configuration mode เพื่อแก้ config |
| User EXEC, Privileged EXEC, Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv → user) |
| Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `end` | `end` | กลับ Privileged EXEC ทันทีจากทุกระดับของ config |
| Global config, Interface config, Sub-interface config, VLAN interface config, VLAN config | `do <command>` | `do show running-config` | รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode |
| Privileged EXEC | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (hostname, VLAN, interface, trunk, IP, route, shutdown) |
| Privileged EXEC | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory) |
| User EXEC, Privileged EXEC | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง |
| User EXEC, Privileged EXEC | `show ip interface brief` | `show ip interface brief` | สรุป IP และสถานะ (Status/Protocol) ของ interface — router แสดงพอร์ตและ sub-interface, switch แสดง Vlan SVI ด้วย |
| User EXEC, Privileged EXEC | `show ip arp` | `show ip arp` | ดูตาราง ARP (IP → MAC) ของอุปกรณ์ — แสดงเครื่องใน L2 domain เดียวกันที่ลิงก์ up (ไม่จำลองการเรียนรู้/หมดอายุ) Age "-" คือ IP ของตัวเอง |
| User EXEC, Privileged EXEC | `show mac address-table` | `show mac address-table` | ดูตาราง MAC ของ switch: MAC อยู่ VLAN ไหน เรียนรู้จากพอร์ตไหน (ไม่จำลอง aging; STATIC CPU = MAC ของ SVI ตัวเอง) |
| User EXEC, Privileged EXEC | `show interfaces status` | `show interfaces status` | ดูสถานะพอร์ตของ switch (connected / notconnect / disabled) และ VLAN (trunk แสดงเป็น trunk) |
| User EXEC, Privileged EXEC | `show interfaces trunk` | `show interfaces trunk` | ดูพอร์ตที่เป็น trunk, native VLAN และ VLAN ที่อนุญาต/ใช้งานอยู่ |
| User EXEC, Privileged EXEC | `show vlan brief` | `show vlan brief` | ดู VLAN ทั้งหมดและพอร์ต access ที่อยู่ในแต่ละ VLAN (trunk ไม่แสดงในตารางนี้) |
| User EXEC, Privileged EXEC | `ping <ip-address>` | `ping 192.168.1.101` | ทดสอบ ping จาก router/switch (ที่มี IP หรือ SVI) ไปยัง IPv4 ปลายทาง |
| Privileged EXEC | `write memory` | `write memory` | บันทึก running-config ลง startup-config |
| Privileged EXEC | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config ลง startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname CORE1` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, VLAN interface config, VLAN config | `interface <interface>` | `interface FastEthernet0/1` | เข้า Interface Configuration mode ของพอร์ต switch (ย่อได้ เช่น fa0/1, gi0/2) |
| Global config, Interface config, VLAN interface config, VLAN config | `interface range <port-range>` | `interface range FastEthernet0/1 - 4` | เลือกหลายพอร์ตพร้อมกัน เช่น interface range fa0/1 - 10 หรือ fa0/1 - 4 , gi0/1 — คำสั่งที่พิมพ์ต่อไปใช้กับทุกพอร์ตในช่วง |
| Global config, Interface config, VLAN interface config, VLAN config | `interface vlan <vlan-id>` | `interface vlan 10` | สร้าง/เข้า SVI (Vlan interface) เพื่อตั้ง IP จัดการของ switch (L2 switch ไม่ route ระหว่าง VLAN) |
| Global config | `no interface vlan <vlan-id>` | `no interface vlan 10` | ลบ SVI |
| Global config, Interface config, VLAN interface config, VLAN config | `vlan <vlan-id>` | `vlan 30` | สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan |
| Global config | `no vlan <vlan-id>` | `no vlan 30` | ลบ VLAN (พอร์ตที่อยู่ใน VLAN นั้นจะหยุดส่งต่อจนกว่าจะสร้างใหม่หรือย้ายพอร์ต) |
| VLAN config | `name <name>` | `name STAFF` | ตั้งชื่อ VLAN (ใช้ตัวอักษรไม่มีช่องว่าง) |
| Global config | `ip default-gateway <ip-address>` | `ip default-gateway 192.168.10.1` | ตั้ง default gateway ของ L2 switch (ใช้กับ SVI สำหรับจัดการข้าม subnet) |
| Global config | `no ip default-gateway` | `no ip default-gateway` | ลบ default gateway ของ switch |
| Interface config, Sub-interface config, VLAN interface config | `shutdown` | `shutdown` | ปิดพอร์ต/sub-interface/SVI (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config, Sub-interface config, VLAN interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน) |
| Interface config, Sub-interface config, VLAN interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2) |
| Interface config | `switchport mode access` | `switchport mode access` | กำหนดให้พอร์ตเป็น access port (untagged VLAN เดียว) |
| Interface config | `switchport mode trunk` | `switchport mode trunk` | กำหนดให้พอร์ตเป็น 802.1Q trunk (ส่งหลาย VLAN แบบ tagged; native VLAN แบบ untagged) |
| Interface config | `switchport access vlan <vlan-id>` | `switchport access vlan 10` | กำหนด access VLAN ให้พอร์ต — เฟรมของพอร์ตนี้จะอยู่ใน VLAN นี้ |
| Interface config | `switchport trunk allowed vlan <vlan-list>` | `switchport trunk allowed vlan 10,20` | กำหนดรายการ VLAN ที่ trunk อนุญาต (แทนที่ทั้งรายการ) เช่น 10,20,30-40 |
| Interface config | `switchport trunk allowed vlan all` | `switchport trunk allowed vlan all` | อนุญาตทุก VLAN บน trunk (ค่าเริ่มต้น) |
| Interface config | `switchport trunk allowed vlan add <vlan-list>` | `switchport trunk allowed vlan add 30` | เพิ่ม VLAN เข้ารายการที่อนุญาต (ไม่ลบของเดิม) |
| Interface config | `switchport trunk allowed vlan remove <vlan-list>` | `switchport trunk allowed vlan remove 20` | ถอด VLAN ออกจากรายการที่อนุญาต |
| Interface config | `switchport trunk native vlan <vlan-id>` | `switchport trunk native vlan 99` | กำหนด native VLAN (เฟรม untagged ของ trunk) — ต้องตรงกันทั้งสองฝั่ง |
| Interface config | `no switchport trunk allowed vlan` | `no switchport trunk allowed vlan` | คืนค่า allowed vlan เป็นทุก VLAN |
| Interface config | `no switchport trunk native vlan` | `no switchport trunk native vlan` | คืนค่า native VLAN เป็น 1 |
| VLAN interface config | `ip address <ip-address> <subnet-mask>` | `ip address 192.168.10.2 255.255.255.0` | ตั้ง IP จัดการให้ SVI (L2 switch ใช้เป็น management address ไม่ใช่ gateway ของ VLAN) |
| VLAN interface config | `no ip address` | `no ip address` | ลบ IP ออกจาก SVI |

### Aruba AOS-CX — Layer 2 Switch (Aruba CX 6100 24G (simulated), ArubaOS-CX 10.10)

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| Manager | `configure terminal` | `configure terminal` | เข้า Global Configuration mode (prompt เป็น (config)#) |
| Manager, Global config, Interface config, VLAN interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv) |
| Global config, Interface config, VLAN interface config, VLAN config | `end` | `end` | กลับ Manager mode (#) ทันทีจากทุกระดับของ config |
| Global config, Interface config, VLAN interface config, VLAN config | `do <command>` | `do show vlan` | รันคำสั่ง show จากใน config mode โดยไม่ต้องออก |
| Manager | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (VLAN, interface, trunk, SVI, route) |
| Manager | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ (หลัง write memory) |
| Manager | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน AOS-CX อ้างอิง |
| Manager | `show interface brief` | `show interface brief` | ตารางสรุปทุกพอร์ต: Native VLAN, Mode (access/trunk/routed), Enabled, Status, Reason |
| Manager | `show interface <interface>` | `show interface 1/1/1` | ดูรายละเอียดพอร์ตเดียว เช่น show interface 1/1/24 (รวม allowed VLAN ของ trunk) |
| Manager | `show vlan` | `show vlan` | ดู VLAN ทั้งหมดและพอร์ตที่เป็นสมาชิก (access และ trunk ที่อนุญาต VLAN นั้น; เฉพาะพอร์ตที่ no routing) |
| Manager | `show ip interface brief` | `show ip interface brief` | สรุป IP ของ routed port และ VLAN interface (SVI) พร้อมสถานะ up/down |
| Manager | `show arp` | `show arp` | ดูตาราง ARP (IP → MAC) ของ switch — เฉพาะ SVI/พอร์ต routed ที่ up; แสดงเครื่องใน L2 domain เดียวกัน (ไม่จำลองการเรียนรู้/หมดอายุ) |
| Manager | `show mac-address-table` | `show mac-address-table` | ดูตาราง MAC ของ switch: MAC อยู่ VLAN ไหน เรียนรู้จากพอร์ตไหน (ไม่จำลอง aging) |
| Manager | `show ip route` | `show ip route` | ดูตาราง routing: C/L (connected), S (static) |
| Manager | `ping <ip-address>` | `ping 192.168.1.1` | ทดสอบ ping จาก switch (ที่มี SVI/routed port) ไปยัง IPv4 ปลายทาง |
| Manager | `write memory` | `write memory` | บันทึก running-config เป็น startup-config |
| Manager | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config เป็น startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname ACCESS2` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, VLAN interface config, VLAN config | `vlan <vlan-id>` | `vlan 30` | สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan |
| Global config | `no vlan <vlan-id>` | `no vlan 30` | ลบ VLAN (VLAN 1 ลบไม่ได้) |
| VLAN config | `name <name>` | `name STAFF` | ตั้งชื่อ VLAN |
| Global config, Interface config, VLAN interface config, VLAN config | `interface <interface>` | `interface 1/1/1` | เข้า Interface Configuration ของพอร์ต เช่น interface 1/1/1 |
| Global config, Interface config, VLAN interface config, VLAN config | `interface <if-range>` | `interface 1/1/1-1/1/4` | เลือกหลายพอร์ตพร้อมกัน เช่น interface 1/1/1-1/1/4 หรือ 1/1/1-4,1/1/10 — คำสั่งที่พิมพ์ต่อไปใช้กับทุกพอร์ตในช่วง |
| Global config, Interface config, VLAN interface config, VLAN config | `interface vlan <vlan-id>` | `interface vlan 10` | สร้าง/เข้า VLAN interface (SVI) ให้ switch route ระหว่าง VLAN — VLAN ต้องถูกสร้างไว้ก่อน |
| Global config | `no interface vlan <vlan-id>` | `no interface vlan 10` | ลบ VLAN interface |
| Global config | `ip route <prefix> <next-hop>` | `ip route 172.16.0.0/24 192.168.1.1` | เพิ่ม static route แบบ prefix/ความยาว เช่น 172.16.0.0/24 ผ่าน next hop (default route = 0.0.0.0/0) |
| Global config | `no ip route <prefix> <next-hop>` | `no ip route 172.16.0.0/24 192.168.1.1` | ลบ static route |
| Interface config, VLAN interface config | `shutdown` | `shutdown` | ปิดพอร์ต/VLAN interface — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config, VLAN interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (พอร์ต AOS-CX เริ่มต้นเป็น shutdown) |
| Interface config | `no routing` | `no routing` | เปลี่ยนพอร์ตจาก routed เป็น Layer 2 — ต้องทำก่อนใช้ vlan access / vlan trunk |
| Interface config | `routing` | `routing` | เปลี่ยนพอร์ตกลับเป็น routed (L3) — พอร์ตจะไม่ส่งต่อ VLAN แต่ตั้ง IP ได้ |
| Interface config | `vlan access <vlan-id>` | `vlan access 10` | กำหนด access VLAN (untagged) ให้พอร์ต L2 — VLAN ต้องถูกสร้างไว้ก่อน (ถ้าเป็น trunk จะกลับเป็น access) |
| Interface config | `vlan trunk allowed <vlan-list>` | `vlan trunk allowed 10,20` | ตั้งพอร์ตเป็น trunk และ **เพิ่ม** VLAN ที่อนุญาต เช่น 10,20,30-40 — เพิ่มต่อจากรายการเดิม ไม่ได้แทนที่ทั้งรายการ (ตามข้อมูลที่พบ ยังไม่ได้ยืนยันกับเอกสารทางการ); ถ้าพอร์ตกำลังอนุญาตทุก VLAN (all) จะเหลือเฉพาะรายการที่ระบุ; ลบออกด้วย no vlan trunk allowed |
| Interface config | `no vlan trunk allowed <vlan-list>` | `no vlan trunk allowed 20` | ลบ VLAN ออกจากรายการที่ trunk อนุญาต (ถ้าตอนนี้เป็น all จะกลายเป็น 1-4094 ยกเว้นที่ระบุ) |
| Interface config | `vlan trunk allowed all` | `vlan trunk allowed all` | ตั้งพอร์ตเป็น trunk ที่อนุญาตทุก VLAN |
| Interface config | `vlan trunk native <vlan-id>` | `vlan trunk native 99` | ตั้งพอร์ตเป็น trunk และกำหนด native VLAN (untagged) — ต้องตรงกันทั้งสองฝั่ง |
| Interface config, VLAN interface config | `ip address <cidr>` | `ip address 192.168.10.1/24` | ตั้ง IPv4 แบบ a.b.c.d/ความยาว ให้ routed port หรือ VLAN interface (SVI) — SVI ทำให้ switch เป็น gateway ของ VLAN |
| Interface config, VLAN interface config | `no ip address` | `no ip address` | ลบ IP ออกจาก interface |
| Interface config, VLAN interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต |

### PC Terminal

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| Terminal | `ipconfig` | `ipconfig` | แสดง IPv4, subnet mask และ default gateway ของ PC |
| Terminal | `ping <ipv4>` | `ping 192.168.1.110` | ทดสอบ reachability ไปยัง IPv4 ปลายทาง (ผลเปลี่ยนตามสาย พอร์ต VLAN และ gateway ปัจจุบัน) |
| Terminal | `arp -a` | `arp -a` | ดูตาราง ARP ของ PC (IP → MAC ของเครื่องใน L2 เดียวกัน ไม่จำลองการเรียนรู้/หมดอายุ) |
| Terminal | `cls` | `cls` | ล้างหน้าจอ Terminal |
| Terminal | `help` | `help` | แสดงคำสั่งที่ PC รองรับ |

<!-- COMMANDS:END -->

## โครงสร้างโค้ด

```
src/core/            # logic ล้วน (ไม่พึ่ง React) — ทดสอบด้วย Vitest
  network.ts         # สถานะลิงก์, L2 domain (VLAN/trunk/loop-safe), L3 interface (port/sub-interface/SVI), routing, ping, คำอธิบายเหตุผล (ไทย)
  cli/spec.ts        # ชนิดของ registry + ตัวตรวจ parameter
  cli/cisco.ts       # คำสั่ง + output ของ Cisco IOS
  cli/aruba.ts       # คำสั่ง + output ของ Aruba AOS-CX
  cli/pc.ts          # ipconfig / ping
  cli/registry.ts    # รวมทะเบียน — แหล่งเดียวสำหรับ parser, ?, Command Library, README, tests
  cli/engine.ts      # parser/matcher (ย่อคำสั่ง, ambiguity), help, execute (ไม่เปลี่ยน config เมื่อ error)
  persist.ts         # zod schema (รวม Guide) + ตรวจอ้างอิงข้าม + workspace หลาย Lab ใน localStorage + export/import
  guide.ts           # ตัวช่วย Guide (parser ข้อความ, ตรวจลิงก์, เลื่อนรายการ)
  sampleGuides.ts    # Guide ของ Lab ตัวอย่าง
  sample.ts          # Sample Lab (Small Office, Inter-VLAN)
src/components/      # React UI (canvas = @xyflow/react): LeftDock (เมนู/Guide), GuidePanel, FileManager, Canvas, Console, ...
src/store.ts         # Zustand store — แหล่งข้อมูลเดียวที่ canvas, CLI, ping และ Inspector ใช้ร่วมกัน
tests/               # Vitest        e2e/  # Playwright
```

## ผลการทดสอบ

รันจริงเมื่อ 2026-11-09 บน Windows 11, Node 24:

| ชุดทดสอบ | ผล |
|---|---|
| `npm test` (Vitest, 19 ไฟล์) | **474/474 ผ่าน** — parser ทั้ง 3 CLI, ผิด mode/ข้าม vendor/ข้ามชนิดอุปกรณ์, ping/L2/L3/trunk/SVI/route, undo/redo, challenge (7 ชนิด Check), ตาราง ARP/MAC และ IP ซ้ำ, อุปกรณ์ 10 ชนิด, บันทึก/นำเข้า, README ตรงกับทะเบียนคำสั่ง |
| `npm run build` | ผ่าน (tsc strict + vite) |
| `npm run e2e` (Playwright + Chromium, 75 flow) | **75/75 ผ่าน** — flow เครือข่าย/CLI/บันทึก/นำเข้า-ส่งออก, Lab Guide/เมนู/Lab Manager, อุปกรณ์ 10 ชนิด, Challenge ทั้ง 3 ข้อ + รีเซ็ต + คำใบ้, Sample Campus 3 Tier, สองภาษา TH/EN, Tab completion, interface range, แอนิเมชันแพ็กเก็ต, แชร์ลิงก์, เครื่องมือผู้สอน, undo/redo, autosave/คัดลอก config/ชื่อ tab, Lab พอร์ตน้อย/สำเนา Lab ที่เปิดไม่ได้/zoom ของ canvas ว่าง, ตาราง ARP/MAC และป้าย IP ซ้ำ |

หมายเหตุ: Playwright ทดสอบบน Chromium เท่านั้น และเนื้อหา output ของอุปกรณ์ยังไม่ได้เทียบกับอุปกรณ์จริง

## ข้อจำกัดที่ยังมี

- ดู “ยังไม่รองรับ” ด้านบน และหมายเหตุการตรวจ syntax
- Cisco `dynamic auto` ไม่เจรจา trunk (ถือเป็น access) — ต้องตั้ง `switchport mode trunk` ทั้งสองฝั่งให้ชัดเจน
- SVI บน Aruba เริ่มต้นเป็น up (ยังไม่ยืนยันกับของจริง)
- ทดสอบ UI เฉพาะ desktop; ไม่ได้ปรับสำหรับมือถือ
- bundle ใหญ่ ~600 kB (ยังไม่ได้ code-split)
- Lab Manager เก็บใน `localStorage` ของเบราว์เซอร์เดียว (ไม่ sync ข้ามเครื่อง, ไม่มีโฟลเดอร์ย่อย) และ `localStorage` มีขีดจำกัดขนาดประมาณ 5 MB — ถ้าเต็ม การบันทึกอัตโนมัติจะล้มเงียบ ๆ ให้ Export ไฟล์ไว้เป็นระยะ
- Guide ไม่รองรับรูปภาพ/ตาราง (ข้อความ bullet/ลำดับเลข/โค้ดเท่านั้น)
