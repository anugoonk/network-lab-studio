import type { Guide } from './types';
import { tx } from '../i18n';

const references = () => [
  { label: tx('ค้นหาเอกสาร Cisco IOS (จุดเริ่มต้น)'), url: 'https://www.cisco.com/c/en/us/support/index.html' },
  { label: tx('HPE Aruba Networking Support (จุดเริ่มต้น)'), url: 'https://networkingsupport.hpe.com/' },
];

export function officeGuide(): Guide {
  return {
    title: tx('Small Office — ทำลิงก์ระหว่าง switch หยุด แล้วกู้คืนด้วย CLI'),
    objective: [
      tx('เมื่อจบ Lab นี้ ผู้เรียนจะสามารถ:'),
      tx('- อ่านผังและรู้ว่าพอร์ตใดคือ uplink ระหว่าง SW1 และ SW2'),
      tx('- ใช้ CLI ของ Aruba AOS-CX ปิด/เปิดพอร์ตด้วย `shutdown` และ `no shutdown`'),
      tx('- อธิบายได้ว่าทำไม ping PC-10 ไม่ผ่าน แต่ ping gateway (R1) ยังผ่าน'),
      tx('- แยกให้ออกระหว่าง “ลิงก์ down” กับ “VLAN ไม่ตรงกัน” (สายยังต่อและลิงก์ยัง UP)'),
    ].join('\n'),
    sections: [
      {
        heading: tx('ข้อมูลของ Lab'),
        body: [
          '- LAN 192.168.1.0/24, R1 = 192.168.1.1',
          tx('- PC-01 ถึง PC-10 = 192.168.1.101 ถึง 192.168.1.110, gateway 192.168.1.1'),
          tx('- พอร์ตที่ใช้งานทุกตัวอยู่ใน VLAN 10 (VLAN 20 สร้างไว้แล้วสำหรับโจทย์)'),
          '- Uplink: SW1 `Gi0/2` ↔ SW2 `1/1/24` · R1 `Gi0/0` ↔ SW1 `Gi0/1`',
          '- PC-01..05 ↔ SW1 `Fa0/1`..`Fa0/5` · PC-06..10 ↔ SW2 `1/1/1`..`1/1/5`',
        ].join('\n'),
      },
      {
        heading: tx('เริ่มต้น'),
        body: [
          tx('1. ดับเบิลคลิก **PC-01** เพื่อเปิด Terminal'),
          tx('2. พิมพ์ `ping 192.168.1.110` และ `ping 192.168.1.1` (ต้องสำเร็จทั้งคู่)'),
        ].join('\n'),
      },
      {
        heading: tx('ฝึก: ทำให้ลิงก์ระหว่าง switch หยุด'),
        body: [
          tx('1. ดับเบิลคลิก **SW2** (Aruba) เพื่อเปิด Console'),
          tx('2. พิมพ์ `configure terminal`'),
          tx('3. พิมพ์ `interface 1/1/24`'),
          tx('4. พิมพ์ `shutdown` — สายระหว่าง switch จะเป็นสีแดง `✕ DOWN`'),
          tx('5. กลับไป PC-01: `ping 192.168.1.110` (ต้องไม่ผ่าน) แต่ `ping 192.168.1.1` ยังผ่าน เพราะ R1 ต่อกับ SW1'),
          tx('6. เปิดแท็บ **Lab Inspector** เพื่ออ่านเหตุผลของผลทดสอบ'),
        ].join('\n'),
      },
      {
        heading: tx('กู้คืน'),
        body: [tx('1. กลับไป Console ของ SW2 แล้วพิมพ์ `no shutdown`'), tx('2. `ping 192.168.1.110` อีกครั้ง (ต้องสำเร็จ)')].join('\n'),
      },
      {
        heading: tx('ฝึกเพิ่ม: VLAN ไม่ตรงกัน'),
        body: [
          tx('1. ที่ SW2: `configure terminal` → `interface 1/1/5` → `vlan access 20`'),
          tx('2. PC-01 ping PC-10 ไม่ผ่าน ทั้งที่สายยังต่อและลิงก์ยัง UP'),
          tx('3. กู้คืนด้วย `vlan access 10`'),
        ].join('\n'),
      },
      {
        heading: tx('เมื่อเสร็จ'),
        body: [
          tx('- งานถูกบันทึกอัตโนมัติในเบราว์เซอร์ และสลับไปทำ Lab อื่นได้จาก **Lab Manager**'),
          tx('- กด **Export** เพื่อเก็บเป็นไฟล์ JSON (รวม Guide นี้)'),
          tx('- ค้นหาคำสั่งเพิ่มเติมที่แท็บ **Command Library**'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}

export function interVlanGuide(): Guide {
  return {
    title: tx('Inter-VLAN — Trunk, Router-on-a-stick และ Static Route'),
    objective: [
      tx('เมื่อจบ Lab นี้ ผู้เรียนจะสามารถ:'),
      tx('- อธิบายและตรวจ trunk 802.1Q (allowed VLAN, native VLAN) ระหว่าง Cisco และ Aruba'),
      tx('- ตั้งค่า router-on-a-stick ด้วย sub-interface และ `encapsulation dot1Q`'),
      tx('- ใช้ static route และ default route และอธิบายปัญหาขากลับ'),
      tx('- ตั้ง SVI บน Aruba ให้ switch เป็น gateway ของ VLAN'),
    ].join('\n'),
    sections: [
      {
        heading: tx('ข้อมูลของ Lab'),
        body: [
          '- VLAN 10 = 192.168.10.0/24 (PC-A, PC-C) · VLAN 20 = 192.168.20.0/24 (PC-B, PC-D)',
          tx('- R1 `Gi0/0` ↔ SW1 `Gi0/1` เป็น trunk ใช้ sub-interface `Gi0/0.10` และ `Gi0/0.20`'),
          tx('- SW1 `Gi0/2` ↔ SW2 `1/1/24` เป็น trunk (allowed 10,20)'),
          '- R1 `Gi0/1` 10.0.0.1/30 ↔ R2 `Gi0/0` 10.0.0.2/30 · R2 `Gi0/1` 172.16.0.1/24 ↔ PC-E 172.16.0.10',
          tx('- R1 มี static route ไป 172.16.0.0/24 · R2 มี default route กลับมาที่ R1'),
        ].join('\n'),
      },
      {
        heading: tx('ตรวจว่าทำงานก่อนเริ่ม'),
        body: [
          tx('1. PC-A ping `192.168.10.12` (VLAN เดียวกันข้าม trunk)'),
          tx('2. PC-A ping `192.168.20.11` (ข้าม VLAN ผ่าน R1)'),
          tx('3. PC-A ping `172.16.0.10` (ผ่าน static route และ default route)'),
        ].join('\n'),
      },
      {
        heading: tx('ฝึก 1: trunk ไม่อนุญาต VLAN 20'),
        body: [
          '1. SW1: `enable` → `configure terminal` → `interface gi0/2`',
          '2. `switchport trunk allowed vlan remove 20`',
          tx('3. PC-B ping PC-D ไม่ผ่าน แต่ PC-A ping PC-C ยังผ่าน — อ่านเหตุผลใน Lab Inspector'),
          tx('4. `show interfaces trunk` เพื่อตรวจ แล้วกู้คืนด้วย `switchport trunk allowed vlan add 20`'),
        ].join('\n'),
      },
      {
        heading: tx('ฝึก 2: ขากลับของ default route'),
        body: [
          '1. R2: `no ip route 0.0.0.0 0.0.0.0 10.0.0.1`',
          tx('2. PC-A ping `172.16.0.10` ไม่ผ่าน — Inspector ระบุว่าขาไปถึงแต่ขากลับล้ม'),
          tx('3. กู้คืนด้วย `ip route 0.0.0.0 0.0.0.0 10.0.0.1`'),
        ].join('\n'),
      },
      {
        heading: tx('ฝึก 3: ให้ SW2 (Aruba) เป็น gateway'),
        body: [
          '1. SW2: `configure terminal` → `interface vlan 10` → `ip address 192.168.10.254/24`',
          '2. `exit` → `interface vlan 20` → `ip address 192.168.20.254/24`',
          tx('3. ตั้ง gateway ของ PC-C เป็น 192.168.10.254 และ PC-D เป็น 192.168.20.254 (แผงรายละเอียดของ PC)'),
          tx('4. PC-C ping `192.168.20.12` — switch route ให้เอง'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}

export function troubleshootGuide(): Guide {
  return {
    title: tx('Troubleshooting — ออฟฟิศ Inter-VLAN เสีย'),
    objective: [
      tx('เมื่อจบโจทย์นี้ ผู้เรียนจะสามารถ:'),
      tx('- ไล่หาสาเหตุจากอาการ (ping ไม่ผ่าน) ทีละชั้น: สาย/พอร์ต → VLAN/trunk → gateway → route'),
      tx('- ใช้ `show` และ Lab Inspector ยืนยันสาเหตุก่อนแก้'),
    ].join('\n'),
    sections: [
      {
        heading: tx('สถานการณ์'),
        body: [
          tx('Lab นี้คือเครือข่าย Inter-VLAN (ดูรายละเอียดที่ Sample: Inter-VLAN) แต่มีบางอย่างถูกแก้ผิดไป'),
          tx('ผู้ใช้แจ้งอาการ: บางเครื่องคุยกันไม่ได้ และบางเครื่องออกไปยังเครือข่ายอีกฝั่งไม่ได้'),
        ].join('\n'),
      },
      {
        heading: tx('กติกา'),
        body: [
          tx('1. เปิดแผง **Challenge** แล้วกด **Check** เพื่อดูว่ายังไม่ผ่านข้อไหน'),
          tx('2. Check บอกเฉพาะ "ผ่าน/ไม่ผ่าน" ไม่บอกสาเหตุ — ต้องหาเอง'),
          tx('3. ห้ามลบหรือเปลี่ยนสาย แก้ได้เฉพาะ config ของอุปกรณ์'),
          tx('4. กด Check ซ้ำได้ไม่จำกัด'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}

export function dupIpGuide(): Guide {
  return {
    title: tx('Troubleshooting — IP ซ้ำ, VLAN ผิด และพอร์ตปิด'),
    objective: [
      tx('เมื่อจบโจทย์นี้ ผู้เรียนจะสามารถ:'),
      tx('- ใช้ตาราง MAC และ ARP หาว่าเครื่องไหนอยู่พอร์ตไหน/VLAN ไหน และ IP ซ้ำกับใคร'),
      tx('- แยกอาการ "ต่อไม่ติดเลย" (VLAN ผิด/พอร์ตปิด) ออกจาก "ติดๆ ดับๆ" (IP ซ้ำ)'),
    ].join('\n'),
    sections: [
      {
        heading: tx('สถานการณ์'),
        body: [
          tx('ออฟฟิศ Small Office (ดูรายละเอียดที่ Open Sample Lab) ผู้ใช้แจ้งว่า'),
          tx('- เครื่องหนึ่งฝั่ง SW2 ต่อเครือข่ายไม่ได้เลย แม้สายต่ออยู่'),
          tx('- อีกเครื่องไฟลิงก์ดับ'),
          tx('- ระบบแจ้งเตือนว่ามี IP ซ้ำอยู่ในเครือข่าย'),
        ].join('\n'),
      },
      {
        heading: tx('เครื่องมือที่ช่วยได้'),
        body: [
          tx('- Inspector → **ตรวจ IP ซ้ำ** และป้าย ⚠ บนอุปกรณ์'),
          tx('- SW1 (Cisco): `show mac address-table` — MAC ของแต่ละเครื่องอยู่ VLAN/พอร์ตไหน'),
          '- SW2 (Aruba): `show mac-address-table`, `show interface brief`, `show vlan`',
          tx('- R1: `show ip arp` — เห็นว่า IP หนึ่งตอบด้วย MAC ใดบ้าง'),
          '- PC: `ipconfig`, `arp -a`',
        ].join('\n'),
      },
      {
        heading: tx('กติกา'),
        body: [
          tx('1. กด **Check** เพื่อดูว่ายังไม่ผ่านข้อไหน (บอกแค่ผ่าน/ไม่ผ่าน)'),
          tx('2. ห้ามลบหรือเปลี่ยนสาย แก้ได้เฉพาะ config/IP ของอุปกรณ์'),
          tx('3. ถ้าแก้พังจนไปต่อไม่ได้ กด **รีเซ็ตโจทย์** เพื่อกลับสถานะเริ่มต้น (ย้อนกลับด้วย Undo ได้)'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}

export function campus3Guide(): Guide {
  return {
    title: 'Campus 3 Tier (Aruba CX) — Core / Distribution / Access',
    objective: [
      tx('Lab นี้ย่อมาจาก "Campus 3 Tier L2 Access with VSX and OSPF" ของ Aruba Virtual Enablement Center ให้เหลือเฉพาะสิ่งที่ simulator นี้มี เมื่อจบ ผู้เรียนจะสามารถ:'),
      tx('- อ่านผัง 3 ชั้น (Core / Distribution / Access) และรู้ว่า gateway ของแต่ละ VLAN อยู่ที่ใด'),
      tx('- อธิบายลิงก์ routed แบบ /31 ระหว่างสวิตช์ และตั้ง `ip address` บนพอร์ตที่เป็น routed'),
      tx('- ใช้ `show ip route` ไล่ดูว่า route ไหนเป็น connected (C) หรือ static (S)'),
      tx('- เห็นว่าทำไมแต่ละฝั่งต้องมี route ทั้ง "ขาไป" และ "ขากลับ"'),
    ].join('\n'),
    sections: [
      {
        heading: tx('สิ่งที่ต่างจาก Lab ต้นฉบับ (ของ Aruba)'),
        body: [
          tx('- **ไม่มี VSX / Active-Gateway:** SwitchA เป็น gateway ของทั้งสอง VLAN (`.252`) ส่วน SwitchB มี SVI ของตัวเอง (`.253`) แต่ VPC ชี้ไปที่ SwitchA'),
          tx('- **ไม่มี LAG (ISL, RLAG) และ VRF keepalive:** ใช้สายเดี่ยวและ trunk ธรรมดา'),
          tx('- **ไม่มี loopback และ OSPF:** ใช้ static route แทน และใช้ IP ของลิงก์ routed แทน loopback เป็นเป้าหมาย ping'),
          tx('- **Access switch ต่อกับ SwitchA ที่เดียว:** ถ้าต่อสองทางโดยไม่มี VSX/STP จะเกิด loop ชั้น 2'),
        ].join('\n'),
      },
      {
        heading: tx('ที่อยู่และพอร์ต'),
        body: [
          tx('- VLAN 100 = `10.10.100.0/24` (SwitchA `.252`, SwitchB `.253`) · VPC1 = `10.10.100.11` ต่อ SwitchC `1/1/3`'),
          tx('- VLAN 200 = `10.10.200.0/24` (SwitchA `.252`, SwitchB `.253`) · VPC2 = `10.10.200.11` ต่อ SwitchC `1/1/4`'),
          '- Core-1 `1/1/1` ↔ SwitchA `1/1/1` = `192.168.4.8/31` (.8 / .9) · Core-1 `1/1/2` ↔ SwitchB `1/1/1` = `192.168.4.12/31`',
          '- Core-2 `1/1/1` ↔ SwitchA `1/1/2` = `192.168.4.16/31` · Core-2 `1/1/2` ↔ SwitchB `1/1/2` = `192.168.4.20/31`',
          '- Core-1 `1/1/3` ↔ Core-2 `1/1/3` = `192.168.4.24/31` (.24 / .25)',
          '- SwitchA `1/1/3` ↔ SwitchB `1/1/3` = trunk VLAN 100,200 · SwitchA `1/1/4` ↔ SwitchC `1/1/1` = trunk VLAN 100,200',
        ].join('\n'),
      },
      {
        heading: tx('Routing (static แทน OSPF)'),
        body: [
          '- SwitchA: default route → Core-1 `192.168.4.8` · SwitchB: default route → Core-1 `192.168.4.12`',
          tx('- Core-1 และ Core-2: route ไป `10.10.100.0/24` และ `10.10.200.0/24` ผ่าน SwitchA (`.9` / `.17`)'),
        ].join('\n'),
      },
      {
        heading: tx('ลองทำ'),
        body: [
          tx('1. ดับเบิลคลิก **VPC1** แล้ว `ping 10.10.100.252` (gateway) และ `ping 10.10.200.11` (VPC2 ข้าม VLAN ผ่าน SwitchA)'),
          tx('2. จาก VPC1 `ping 192.168.4.8` (Core-1) และ `ping 192.168.4.25` (Core-2 ผ่าน Core-1) แล้วดูเส้นทางขาไป/ขากลับใน **Lab Inspector**'),
          tx('3. ที่ **SwitchX-Core-1** พิมพ์ `show ip route` แล้วหาบรรทัด `S` (static) กับ `C` (connected)'),
          tx('4. ที่ **SwitchY-Core-2** ลอง `configure terminal` → `no ip route 10.10.100.0/24 192.168.4.17` แล้ว ping จาก VPC1 ไป `192.168.4.25` อีกครั้ง — ขาไปถึง Core-2 แต่ขากลับหายไป (Core-2 ไม่รู้เส้นทางกลับไป VLAN 100) ดูผลใน Lab Inspector แล้ว `ip route 10.10.100.0/24 192.168.4.17` เพื่อแก้คืน'),
          tx('5. ใช้ `show vlan` / `show interface brief` บน SwitchC ดูว่า VPC1/VPC2 อยู่ VLAN ไหน'),
        ].join('\n'),
      },
    ],
    resources: [
      { label: tx('Aruba Virtual Enablement Center (Lab ต้นฉบับที่ย่อมา)'), url: 'https://networkingsupport.hpe.com/' },
      ...references(),
    ],
  };
}

export function campusGuide(): Guide {
  return {
    title: tx('Campus + ISP — L3 Switch เป็น gateway'),
    objective: [
      tx('เมื่อจบโจทย์นี้ ผู้เรียนจะสามารถ:'),
      tx('- ไล่ปัญหาแบบหลายชั้น: gateway (SVI) → default route → route ขากลับที่ฝั่ง ISP'),
      tx('- ใช้ Lab Inspector อ่านว่า ping ล้มที่ขาไปหรือขากลับ'),
      tx('- ตั้งค่า SVI และ default route บน L3 switch (AOS-CX) และ static route บน router (IOS)'),
    ].join('\n'),
    sections: [
      {
        heading: tx('ผังเครือข่าย'),
        body: [
          tx('- **DSW1** (Layer 3 Switch, AOS-CX): `vlan10` = 192.168.10.1/24, `vlan20` = 192.168.20.1/24 เป็น gateway · `1/1/1` trunk ไป SW1 · `1/1/24` = 10.1.1.2/30 ไป ISP1'),
          tx('- **SW1** (Cisco access): `Gi0/1` trunk ไป DSW1 · `Fa0/1` PC-01 (VLAN 10) · `Fa0/2` LAP-01 (VLAN 20) · `Fa0/3` AP1 (อุปกรณ์วาดอย่างเดียว ไม่มี CLI)'),
          tx('- **ISP1** (router จำลอง ISP): `Gi0/1` = 10.1.1.1/30 · `Gi0/0` = 203.0.113.1/24 ไป **SRV-01** 203.0.113.10'),
        ].join('\n'),
      },
      {
        heading: tx('สถานการณ์'),
        body: [
          tx('เพิ่ง cutover โครงสร้างใหม่ ผู้ใช้ทุก VLAN เข้า SRV-01 ไม่ได้ และผู้ใช้ VLAN 20 แม้แต่ gateway ก็ยังไม่ตอบ'),
          tx('มีปัญหามากกว่าหนึ่งจุด บางจุดจะเห็นก็ต่อเมื่อแก้จุดก่อนหน้าแล้ว'),
        ].join('\n'),
      },
      {
        heading: tx('ใบ้ (อ่านเมื่อติดจริง ๆ)'),
        body: [
          tx('- ใช้ `show ip interface brief` และ `show ip route` ที่ DSW1 / ISP1 ก่อนเดา'),
          tx('- ping ที่ผ่านขาไปแต่ไม่กลับ = ฝั่งปลายทางไม่รู้เส้นทางกลับ'),
          tx('- คำสั่ง Aruba ใช้ CIDR (`ip route 0.0.0.0/0 <next-hop>`) ส่วน Cisco ใช้ mask'),
        ].join('\n'),
      },
      {
        heading: tx('กติกา'),
        body: [
          tx('1. กด **Check** เพื่อดูผลรวม (บอกแค่ผ่าน/ไม่ผ่าน ไม่บอกสาเหตุ)'),
          tx('2. ห้ามลบหรือเปลี่ยนสาย'),
          tx('3. กด **รีเซ็ตโจทย์** เพื่อกลับสถานะเริ่มต้นได้ทุกเมื่อ'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}

export function campus3ChallengeGuide(): Guide {
  return {
    title: tx('Troubleshooting — Campus 3 Tier (Aruba CX)'),
    objective: [
      tx('เมื่อจบโจทย์นี้ ผู้เรียนจะสามารถ:'),
      tx('- ไล่ปัญหาตามชั้น: Access → Distribution → Core โดยเริ่มจาก gateway ของแต่ละ VLAN'),
      tx('- ใช้ `show vlan` / `show interface` / `show ip route` บน AOS-CX หาจุดผิด'),
      tx('- แยกปัญหา "ขาไป" (ไม่มี route/next-hop ผิด) ออกจาก "ขากลับ" (ปลายทางไม่รู้จักเครือข่ายต้นทาง)'),
    ].join('\n'),
    sections: [
      {
        heading: tx('สถานการณ์'),
        body: [
          tx('Lab Campus 3 Tier (ดูรายละเอียดที่ Open Sample Lab) เพิ่งถูกแก้ config ผู้ใช้แจ้งว่า'),
          tx('- เครื่องใน VLAN 200 (VPC2) ออกจาก access switch ไม่ได้เลย'),
          tx('- เครื่องใน VLAN 100 (VPC1) ติดต่อ Core-1 ได้ แต่ไปไม่ถึง Core-2'),
        ].join('\n'),
      },
      {
        heading: tx('กติกา'),
        body: [
          tx('1. กด **Check** เพื่อดูว่ายังไม่ผ่านข้อไหน (บอกแค่ผ่าน/ไม่ผ่าน)'),
          tx('2. ห้ามลบหรือเปลี่ยนสาย แก้ได้เฉพาะ config ของอุปกรณ์'),
          tx('3. ถ้าแก้พังจนไปต่อไม่ได้ กด **รีเซ็ตโจทย์** เพื่อกลับสถานะเริ่มต้น (ย้อนกลับด้วย Undo ได้)'),
        ].join('\n'),
      },
    ],
    resources: references(),
  };
}
