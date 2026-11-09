# Network Lab Studio

เว็บแอปฝึกออกแบบ Network Diagram และฝึกใช้ Network CLI แนวทางเดียวกับ Cisco Packet Tracer — ลากอุปกรณ์ วางสาย เปิด Console พิมพ์คำสั่ง แล้วดูผลต่อเครือข่ายที่วาดไว้ทันที
UI เป็นภาษาไทย ส่วนคำสั่ง CLI ชื่อพอร์ต และ output ของอุปกรณ์เป็นภาษาอังกฤษ

> ทุกคำสั่งทำงานกับ **อุปกรณ์จำลองภายในแอปเท่านั้น** — input ของผู้ใช้ไม่ถูกส่งไปรันใน shell ของเครื่อง host (parser จับคู่กับทะเบียนคำสั่งใน TypeScript เท่านั้น)

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
npx playwright install chromium  # ครั้งแรกเท่านั้น (หรือกำหนด PW_CHROMIUM=path\to\chrome.exe)
npm run e2e                      # ทดสอบ flow หลักผ่าน UI จริงด้วย Playwright (build + preview ให้อัตโนมัติ)
```

## วิธีใช้งานโดยย่อ

1. เปิดแอป — ระบบโหลด **Sample Lab “Small Office – Cisco & Aruba”** ให้ทันที (ครั้งต่อไปจะเปิดงานล่าสุดที่ auto-save ไว้)
2. คลิกอุปกรณ์เพื่อดูรายละเอียด (ชื่อ รุ่นจำลอง พอร์ต IP VLAN) · **ดับเบิลคลิก** เพื่อเปิด Console/Terminal
3. เพิ่มอุปกรณ์: ลากจาก Palette ซ้ายลง canvas (หรือคลิกที่รายการ)
4. ต่อสาย: ลากจุดกลมด้านขวาของอุปกรณ์ไปยังอุปกรณ์อื่น (หรือปุ่ม **เชื่อมสาย**) แล้วเลือกพอร์ตต้นทาง/ปลายทาง — พอร์ตที่มีสายแล้วเลือกซ้ำไม่ได้
5. แผงขวามี 3 แท็บ: **รายละเอียด** · **Console** · **Lab Inspector** (อธิบายเหตุผลผล ping ให้ผู้เรียน แยกจาก output ใน terminal)
6. ปุ่ม “ซ่อน Palette” / “ซ่อนแผงขวา” ขยายพื้นที่วาด · **Fit view** ปรับมุมมอง · ล้อเมาส์ = zoom, ลากพื้นหลัง = pan
7. แท็บ **Command Library** ค้นหา/กรองคำสั่ง และกด “ใส่ใน Console” (ไม่รันให้ — ผู้ใช้กด Enter เอง)

### การแสดงสถานะลิงก์ (ไม่พึ่งสีอย่างเดียว)

| สถานะ | ความหมาย | แสดงผล |
|---|---|---|
| มีสายเชื่อม | มี cable ระหว่างสองพอร์ต | เส้นบน canvas |
| ลิงก์ใช้งานได้ | มีสาย **และ** พอร์ตทั้งสองฝั่งไม่ถูก shutdown | เส้นเขียวทึบ + ป้าย `✓ UP` |
| ลิงก์ down | มีสายแต่มีอย่างน้อยหนึ่งฝั่งถูก shutdown | เส้นแดงประ + ป้าย `✕ DOWN` + ชื่อพอร์ตที่ถูก shutdown มี `⏻` |

ลิงก์ที่ up แต่ VLAN ไม่ตรงกัน ยังแสดงเป็น UP (ถูกต้อง — ปัญหาอยู่ที่ VLAN ไม่ใช่ลิงก์) ให้ดูเหตุผลที่ Lab Inspector

## Sample Lab: Small Office – Cisco & Aruba

| อุปกรณ์ | รุ่นจำลอง | พอร์ตที่ใช้ |
|---|---|---|
| R1 | Cisco IOS Router | `GigabitEthernet0/0` = 192.168.1.1/24 → SW1 `GigabitEthernet0/1` |
| SW1 | Cisco IOS L2 Switch | `Gi0/1` (→R1), `Gi0/2` (→SW2 uplink), `Fa0/1`–`Fa0/5` = PC-01..05 |
| SW2 | Aruba AOS-CX L2 Switch | `1/1/24` (uplink ←SW1 `Gi0/2`), `1/1/1`–`1/1/5` = PC-06..PC-10 |
| PC-01..PC-10 | PC | 192.168.1.101–110 /24, gateway 192.168.1.1 |

พอร์ตที่ใช้งานทั้งหมดบน SW1/SW2 เป็น access VLAN 10 (รวมลิงก์ SW1↔SW2 ทั้งสองฝั่ง และลิงก์ไป R1 แบบ untagged) VLAN 20 (GUEST) ถูกสร้างไว้แล้วบน switch ทั้งสองสำหรับโจทย์ฝึก

**โจทย์ฝึก — ทำให้ลิงก์ระหว่าง switch หยุด แล้วกู้คืนด้วย CLI** (มีในแท็บ Lab Inspector):

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

## ขอบเขตของรุ่นแรก

**รองรับ**

- Ethernet point-to-point, access VLAN (untagged), IPv4 + subnet mask, default gateway
- การทดสอบ reachability ด้วย ICMP echo (`ping`) — คำนวณใหม่จาก topology + config ปัจจุบันทุกครั้ง: ตรวจสาย, admin state ของพอร์ตทั้งสองฝั่ง, สมาชิก VLAN ของแต่ละ switch, เส้นทางขากลับ; ป้องกัน loop ด้วย visited set
- PC ใน subnet เดียวกันสื่อสารกันโดยตรง; ปลายทางนอก subnet ต้องผ่าน default gateway ที่เป็น router จริงบนลิงก์ที่เข้าถึงได้; router ส่งต่อระหว่าง subnet ที่ต่อกับ routed interface ของตัวเอง (connected routes)
- CLI แยกตามระบบปฏิบัติการ (Cisco IOS / Aruba AOS-CX / PC) ต่อ device ละ config, CLI mode และ command history; ย่อคำสั่งได้ (`conf t`, `int gi0/1`); `?` แสดงคำสั่งใน mode ปัจจุบัน; `do show ...` ใน config mode
- Auto-save ลง `localStorage`, Export/Import JSON (มี `schemaVersion`, ตรวจชนิดข้อมูล พอร์ต และการอ้างอิงอุปกรณ์ก่อนนำเข้า)

**ยังไม่รองรับ (ตั้งใจตัดออกจากรุ่นแรก)**

- Trunk/802.1Q tagging, VTP, Spanning Tree (การต่อ loop ไม่ทำให้ค้าง แต่ไม่มี STP block พอร์ตให้), LACP/port-channel
- IPv6, DHCP, DNS, ARP table/MAC address table, static/dynamic routing (RIP/OSPF/…), ACL, NAT
- SVI / management IP บน switch (ดังนั้น ping switch ไม่ได้ และ switch ไม่ใช่ปลายทางของ ping), `interface range`, `show interfaces <name>` บน Cisco, `reload`
- ping ใช้ ICMP echo แบบสรุปผล (ไม่มี TTL/fragmentation จริง และ latency เป็นค่าคงที่)

## รุ่น/เวอร์ชันอ้างอิงของ CLI profile และสถานะการตรวจสอบ

| Profile | รุ่นจำลอง | เวอร์ชันอ้างอิง |
|---|---|---|
| Cisco IOS Router | Cisco ISR 2911 | IOS 15.4(3)M |
| Cisco IOS L2 Switch | Catalyst 2960-24TT | IOS 15.0(2)SE |
| Aruba AOS-CX L2 Switch | Aruba CX 6100 24G | ArubaOS-CX 10.10 |

พฤติกรรมเริ่มต้นที่เลียนแบบของจริง: พอร์ต router (Cisco) และพอร์ต AOS-CX เริ่มต้นเป็น **shutdown**; พอร์ต Catalyst เริ่มต้นเป็น up (VLAN 1); พอร์ต AOS-CX เริ่มต้นเป็น **routed** จึงต้องสั่ง `no routing` ก่อนใช้ `vlan access`; Cisco `switchport access vlan N` จะสร้าง VLAN ให้อัตโนมัติพร้อมข้อความเตือนตาม IOS 15.0

> **สถานะการตรวจสอบ syntax (ตรงตามจริง):** ไม่สามารถเข้าถึงเอกสารทางการของ HPE Aruba (AOS-CX Command Reference) และ Cisco ได้ในรอบพัฒนานี้ จึงตรวจได้เพียงบางส่วนจากแหล่งรอง (ฟอรัม Airheads/Aruba Community และ mirror ของ AOS-CX 10.10 Layer-2 guide): ยืนยันได้ว่า `vlan access <id>` คู่กับ `no shutdown` / `no routing` เป็นรูปแบบที่ใช้จริง และคอลัมน์ของ `show interface brief` (Port, Native VLAN, Mode, Type, Enabled, Status, Reason, Speed, Description) กับ Reason "Administratively down" ตรงกับของจริง
> - ข้อควรระวัง: บางรุ่น AOS-CX (เช่น 6200) ไม่ต้องสั่ง `no routing` เพราะพอร์ตเริ่มต้นเป็น L2 — simulator ยึดพฤติกรรม routed-by-default ตามรุ่นอ้างอิงด้านบนเพื่อให้ผู้เรียนฝึกขั้นตอนนี้
> - **ยังไม่ได้ตรวจเทียบเอกสารทางการ:** layout ของ `show vlan` (AOS-CX), ข้อความ error ของ AOS-CX (`% Unknown command.` ฯลฯ) และ output ของคำสั่ง Cisco ทั้งหมด (เขียนตามความรู้เกี่ยวกับ IOS 15.x) เป็นการประมาณ ไม่ใช่การคัดลอกทุกอักขระ — ควรตรวจเทียบก่อนใช้สอนจริง

## คำสั่งที่รองรับ

ตารางนี้สร้างจากทะเบียนคำสั่งเดียวกับที่ parser, `?` และ Command Library ใช้ (มี test ตรวจว่าตารางตรงกับทะเบียนเสมอ — สร้างใหม่ด้วย `GEN_DOCS=1 npx vitest run tests/docs.test.ts`) และทุกตัวอย่างในคอลัมน์ “ตัวอย่างที่รันได้” ถูกรันจริงใน test

<!-- COMMANDS:START -->

### Cisco IOS — Router (Cisco ISR 2911 (simulated), Cisco IOS 15.x (15.4(3)M))

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| User EXEC | `enable` | `enable` | เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #) |
| Privileged EXEC | `disable` | `disable` | กลับไป User EXEC mode |
| Privileged EXEC | `configure terminal` | `configure terminal` | เข้า Global Configuration mode เพื่อแก้ config |
| User EXEC, Privileged EXEC, Global config, Interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv → user) |
| Global config, Interface config, VLAN config | `end` | `end` | กลับ Privileged EXEC ทันทีจากทุกระดับของ config |
| Global config, Interface config, VLAN config | `do <command>` | `do show running-config` | รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode |
| Privileged EXEC | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (hostname, VLAN, interface, IP, shutdown) |
| Privileged EXEC | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory) |
| User EXEC, Privileged EXEC | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง |
| User EXEC, Privileged EXEC | `show ip interface brief` | `show ip interface brief` | สรุป IP และสถานะ (Status/Protocol) ของทุก interface บน router |
| User EXEC, Privileged EXEC | `show ip route` | `show ip route` | ดูตาราง routing (รุ่นแรกมีเฉพาะ Connected/Local) |
| User EXEC, Privileged EXEC | `ping <ip-address>` | `ping 192.168.1.101` | ทดสอบ ping จาก router ไปยัง IPv4 ปลายทาง |
| Privileged EXEC | `write memory` | `write memory` | บันทึก running-config ลง startup-config |
| Privileged EXEC | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config ลง startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname CORE1` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, VLAN config | `interface <interface>` | `interface GigabitEthernet0/1` | เข้า Interface Configuration mode ของพอร์ต router |
| Interface config | `shutdown` | `shutdown` | ปิดพอร์ต (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน) |
| Interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2) |
| Interface config | `ip address <ip-address> <subnet-mask>` | `ip address 10.0.0.1 255.255.255.0` | ตั้ง IPv4 และ subnet mask ให้ routed interface |
| Interface config | `no ip address` | `no ip address` | ลบ IP ออกจาก interface |

### Cisco IOS — Layer 2 Switch (Cisco Catalyst 2960-24TT (simulated), Cisco IOS 15.0(2)SE)

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| User EXEC | `enable` | `enable` | เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #) |
| Privileged EXEC | `disable` | `disable` | กลับไป User EXEC mode |
| Privileged EXEC | `configure terminal` | `configure terminal` | เข้า Global Configuration mode เพื่อแก้ config |
| User EXEC, Privileged EXEC, Global config, Interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv → user) |
| Global config, Interface config, VLAN config | `end` | `end` | กลับ Privileged EXEC ทันทีจากทุกระดับของ config |
| Global config, Interface config, VLAN config | `do <command>` | `do show running-config` | รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode |
| Privileged EXEC | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (hostname, VLAN, interface, IP, shutdown) |
| Privileged EXEC | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory) |
| User EXEC, Privileged EXEC | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง |
| User EXEC, Privileged EXEC | `show interfaces status` | `show interfaces status` | ดูสถานะพอร์ตของ switch (connected / notconnect / disabled) และ VLAN |
| User EXEC, Privileged EXEC | `show vlan brief` | `show vlan brief` | ดู VLAN ทั้งหมดและพอร์ตที่อยู่ในแต่ละ VLAN |
| Privileged EXEC | `write memory` | `write memory` | บันทึก running-config ลง startup-config |
| Privileged EXEC | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config ลง startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname CORE1` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, VLAN config | `interface <interface>` | `interface FastEthernet0/1` | เข้า Interface Configuration mode ของพอร์ต switch (ย่อได้ เช่น fa0/1, gi0/2) |
| Global config, Interface config, VLAN config | `vlan <vlan-id>` | `vlan 30` | สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan |
| Global config | `no vlan <vlan-id>` | `no vlan 30` | ลบ VLAN (พอร์ตที่อยู่ใน VLAN นั้นจะหยุดส่งต่อจนกว่าจะสร้างใหม่หรือย้ายพอร์ต) |
| VLAN config | `name <name>` | `name STAFF` | ตั้งชื่อ VLAN (ใช้ตัวอักษรไม่มีช่องว่าง) |
| Interface config | `shutdown` | `shutdown` | ปิดพอร์ต (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน) |
| Interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2) |
| Interface config | `switchport mode access` | `switchport mode access` | กำหนดให้พอร์ตเป็น access port (untagged VLAN เดียว) |
| Interface config | `switchport access vlan <vlan-id>` | `switchport access vlan 10` | กำหนด access VLAN ให้พอร์ต — เฟรมของพอร์ตนี้จะอยู่ใน VLAN นี้ |

### Aruba AOS-CX — Layer 2 Switch (Aruba CX 6100 24G (simulated), ArubaOS-CX 10.10)

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| Manager | `configure terminal` | `configure terminal` | เข้า Global Configuration mode (prompt เป็น (config)#) |
| Manager, Global config, Interface config, VLAN config | `exit` | `exit` | ถอยออกหนึ่งระดับ (config-if → config → priv) |
| Global config, Interface config, VLAN config | `end` | `end` | กลับ Manager mode (#) ทันทีจากทุกระดับของ config |
| Global config, Interface config, VLAN config | `do <command>` | `do show vlan` | รันคำสั่ง show จากใน config mode โดยไม่ต้องออก |
| Manager | `show running-config` | `show running-config` | ดู configuration ปัจจุบัน (VLAN, interface, shutdown, no routing, vlan access) |
| Manager | `show startup-config` | `show startup-config` | ดู config ที่บันทึกไว้ (หลัง write memory) |
| Manager | `show version` | `show version` | ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน AOS-CX อ้างอิง |
| Manager | `show interface brief` | `show interface brief` | ตารางสรุปทุกพอร์ต: Native VLAN, Mode, Enabled, Status, Reason |
| Manager | `show interface <interface>` | `show interface 1/1/1` | ดูรายละเอียดพอร์ตเดียว เช่น show interface 1/1/24 |
| Manager | `show vlan` | `show vlan` | ดู VLAN ทั้งหมดและพอร์ตที่เป็นสมาชิก (เฉพาะพอร์ตที่ no routing) |
| Manager | `write memory` | `write memory` | บันทึก running-config เป็น startup-config |
| Manager | `copy running-config startup-config` | `copy running-config startup-config` | บันทึก running-config เป็น startup-config (เทียบเท่า write memory) |
| Global config | `hostname <hostname>` | `hostname ACCESS2` | เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม) |
| Global config, Interface config, VLAN config | `vlan <vlan-id>` | `vlan 30` | สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan |
| Global config | `no vlan <vlan-id>` | `no vlan 30` | ลบ VLAN (VLAN 1 ลบไม่ได้) |
| VLAN config | `name <name>` | `name STAFF` | ตั้งชื่อ VLAN |
| Global config, Interface config, VLAN config | `interface <interface>` | `interface 1/1/1` | เข้า Interface Configuration ของพอร์ต เช่น interface 1/1/1 |
| Interface config | `shutdown` | `shutdown` | ปิดพอร์ต — ลิงก์ที่ต่อกับพอร์ตนี้จะ down |
| Interface config | `no shutdown` | `no shutdown` | เปิดพอร์ต (พอร์ต AOS-CX เริ่มต้นเป็น shutdown) |
| Interface config | `no routing` | `no routing` | เปลี่ยนพอร์ตจาก routed เป็น Layer 2 — ต้องทำก่อนใช้ vlan access |
| Interface config | `routing` | `routing` | เปลี่ยนพอร์ตกลับเป็น routed (L3) — พอร์ตจะไม่ส่งต่อ VLAN |
| Interface config | `vlan access <vlan-id>` | `vlan access 10` | กำหนด access VLAN (untagged) ให้พอร์ต L2 — VLAN ต้องถูกสร้างไว้ก่อน |
| Interface config | `description <text>` | `description UPLINK` | ตั้งคำอธิบายพอร์ต |

### PC Terminal

| Mode | Syntax | ตัวอย่างที่รันได้ | คำอธิบาย |
|---|---|---|---|
| Terminal | `ipconfig` | `ipconfig` | แสดง IPv4, subnet mask และ default gateway ของ PC |
| Terminal | `ping <ipv4>` | `ping 192.168.1.110` | ทดสอบ reachability ไปยัง IPv4 ปลายทาง (ผลเปลี่ยนตามสาย พอร์ต VLAN และ gateway ปัจจุบัน) |
| Terminal | `cls` | `cls` | ล้างหน้าจอ Terminal |
| Terminal | `help` | `help` | แสดงคำสั่งที่ PC รองรับ |

<!-- COMMANDS:END -->

## โครงสร้างโค้ด

```
src/core/            # logic ล้วน (ไม่พึ่ง React) — ทดสอบด้วย Vitest
  network.ts         # สถานะลิงก์, L2 domain (VLAN/loop-safe), routing, ping, คำอธิบายเหตุผล (ไทย)
  cli/spec.ts        # ชนิดของ registry + ตัวตรวจ parameter
  cli/cisco.ts       # คำสั่ง + output ของ Cisco IOS
  cli/aruba.ts       # คำสั่ง + output ของ Aruba AOS-CX
  cli/pc.ts          # ipconfig / ping
  cli/registry.ts    # รวมทะเบียน — แหล่งเดียวสำหรับ parser, ?, Command Library, README, tests
  cli/engine.ts      # parser/matcher (ย่อคำสั่ง, ambiguity), help, execute (ไม่เปลี่ยน config เมื่อ error)
  persist.ts         # zod schema + ตรวจอ้างอิงข้าม + localStorage + export/import
  sample.ts          # Sample Lab
src/components/      # React UI (canvas = @xyflow/react)
src/store.ts         # Zustand store — แหล่งข้อมูลเดียวที่ canvas, CLI, ping และ Inspector ใช้ร่วมกัน
tests/               # Vitest        e2e/  # Playwright
```

## ผลการทดสอบ

รันจริงเมื่อ 2026-11-09 บน Windows 11, Node 24:

| ชุดทดสอบ | ผล |
|---|---|
| `npm test` (Vitest, 4 ไฟล์) | **140/140 ผ่าน** — parser ทั้ง 3 CLI, ผิด mode/ข้าม vendor 13 กรณี (config ไม่เปลี่ยน), ทุกตัวอย่างในทะเบียนคำสั่งรันได้จริง, ping/VLAN/gateway/loop, import ผิดรูปแบบ 14 กรณี, README ตรงกับทะเบียน |
| `npm run build` | ผ่าน (tsc strict + vite) |
| `npm run e2e` (Playwright + Chromium, 12 flow) | **12/12 ผ่าน** — Sample Lab → ping → shutdown uplink → ping ล้มเหลว → no shutdown → สำเร็จ; PC-10 → VLAN 20; gateway ผิด; เพิ่ม PC ใหม่ + ต่อสาย + VLAN + IP + ping; drag จาก Palette/ต่อสายด้วยการลาก; CLI ผิด mode/vendor; reload; export/import/ไฟล์เสีย/New Lab confirm; ย่อแผง; Command Library |

หมายเหตุ: Playwright ทดสอบบน Chromium เท่านั้น และเนื้อหา output ของอุปกรณ์ยังไม่ได้เทียบกับอุปกรณ์จริง

## ข้อจำกัดที่ยังมี

- ดู “ยังไม่รองรับ” ด้านบน และหมายเหตุการตรวจ syntax
- ผลทดสอบข้าม subnet ใน Sample Lab ต้องเพิ่ม interface/subnet ที่สองด้วยตนเอง (ครอบคลุมใน unit test; ไม่มีตัวอย่างในแอป)
- ทดสอบ UI เฉพาะ desktop; ไม่ได้ปรับสำหรับมือถือ
- bundle ใหญ่ ~600 kB (ยังไม่ได้ code-split)
