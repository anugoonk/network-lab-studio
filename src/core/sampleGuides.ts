import type { Guide } from './types';

const REFERENCES = [
  { label: 'ค้นหาเอกสาร Cisco IOS (จุดเริ่มต้น)', url: 'https://www.cisco.com/c/en/us/support/index.html' },
  { label: 'HPE Aruba Networking Support (จุดเริ่มต้น)', url: 'https://networkingsupport.hpe.com/' },
];

export function officeGuide(): Guide {
  return {
    title: 'Small Office — ทำลิงก์ระหว่าง switch หยุด แล้วกู้คืนด้วย CLI',
    objective: [
      'เมื่อจบ Lab นี้ ผู้เรียนจะสามารถ:',
      '- อ่านผังและรู้ว่าพอร์ตใดคือ uplink ระหว่าง SW1 และ SW2',
      '- ใช้ CLI ของ Aruba AOS-CX ปิด/เปิดพอร์ตด้วย `shutdown` และ `no shutdown`',
      '- อธิบายได้ว่าทำไม ping PC-10 ไม่ผ่าน แต่ ping gateway (R1) ยังผ่าน',
      '- แยกให้ออกระหว่าง “ลิงก์ down” กับ “VLAN ไม่ตรงกัน” (สายยังต่อและลิงก์ยัง UP)',
    ].join('\n'),
    sections: [
      {
        heading: 'ข้อมูลของ Lab',
        body: [
          '- LAN 192.168.1.0/24, R1 = 192.168.1.1',
          '- PC-01 ถึง PC-10 = 192.168.1.101 ถึง 192.168.1.110, gateway 192.168.1.1',
          '- พอร์ตที่ใช้งานทุกตัวอยู่ใน VLAN 10 (VLAN 20 สร้างไว้แล้วสำหรับโจทย์)',
          '- Uplink: SW1 `Gi0/2` ↔ SW2 `1/1/24` · R1 `Gi0/0` ↔ SW1 `Gi0/1`',
          '- PC-01..05 ↔ SW1 `Fa0/1`..`Fa0/5` · PC-06..10 ↔ SW2 `1/1/1`..`1/1/5`',
        ].join('\n'),
      },
      {
        heading: 'เริ่มต้น',
        body: [
          '1. ดับเบิลคลิก **PC-01** เพื่อเปิด Terminal',
          '2. พิมพ์ `ping 192.168.1.110` และ `ping 192.168.1.1` (ต้องสำเร็จทั้งคู่)',
        ].join('\n'),
      },
      {
        heading: 'ฝึก: ทำให้ลิงก์ระหว่าง switch หยุด',
        body: [
          '1. ดับเบิลคลิก **SW2** (Aruba) เพื่อเปิด Console',
          '2. พิมพ์ `configure terminal`',
          '3. พิมพ์ `interface 1/1/24`',
          '4. พิมพ์ `shutdown` — สายระหว่าง switch จะเป็นสีแดง `✕ DOWN`',
          '5. กลับไป PC-01: `ping 192.168.1.110` (ต้องไม่ผ่าน) แต่ `ping 192.168.1.1` ยังผ่าน เพราะ R1 ต่อกับ SW1',
          '6. เปิดแท็บ **Lab Inspector** เพื่ออ่านเหตุผลของผลทดสอบ',
        ].join('\n'),
      },
      {
        heading: 'กู้คืน',
        body: ['1. กลับไป Console ของ SW2 แล้วพิมพ์ `no shutdown`', '2. `ping 192.168.1.110` อีกครั้ง (ต้องสำเร็จ)'].join('\n'),
      },
      {
        heading: 'ฝึกเพิ่ม: VLAN ไม่ตรงกัน',
        body: [
          '1. ที่ SW2: `configure terminal` → `interface 1/1/5` → `vlan access 20`',
          '2. PC-01 ping PC-10 ไม่ผ่าน ทั้งที่สายยังต่อและลิงก์ยัง UP',
          '3. กู้คืนด้วย `vlan access 10`',
        ].join('\n'),
      },
      {
        heading: 'เมื่อเสร็จ',
        body: [
          '- งานถูกบันทึกอัตโนมัติในเบราว์เซอร์ และสลับไปทำ Lab อื่นได้จาก **Lab Manager**',
          '- กด **Export** เพื่อเก็บเป็นไฟล์ JSON (รวม Guide นี้)',
          '- ค้นหาคำสั่งเพิ่มเติมที่แท็บ **Command Library**',
        ].join('\n'),
      },
    ],
    resources: REFERENCES,
  };
}

export function interVlanGuide(): Guide {
  return {
    title: 'Inter-VLAN — Trunk, Router-on-a-stick และ Static Route',
    objective: [
      'เมื่อจบ Lab นี้ ผู้เรียนจะสามารถ:',
      '- อธิบายและตรวจ trunk 802.1Q (allowed VLAN, native VLAN) ระหว่าง Cisco และ Aruba',
      '- ตั้งค่า router-on-a-stick ด้วย sub-interface และ `encapsulation dot1Q`',
      '- ใช้ static route และ default route และอธิบายปัญหาขากลับ',
      '- ตั้ง SVI บน Aruba ให้ switch เป็น gateway ของ VLAN',
    ].join('\n'),
    sections: [
      {
        heading: 'ข้อมูลของ Lab',
        body: [
          '- VLAN 10 = 192.168.10.0/24 (PC-A, PC-C) · VLAN 20 = 192.168.20.0/24 (PC-B, PC-D)',
          '- R1 `Gi0/0` ↔ SW1 `Gi0/1` เป็น trunk ใช้ sub-interface `Gi0/0.10` และ `Gi0/0.20`',
          '- SW1 `Gi0/2` ↔ SW2 `1/1/24` เป็น trunk (allowed 10,20)',
          '- R1 `Gi0/1` 10.0.0.1/30 ↔ R2 `Gi0/0` 10.0.0.2/30 · R2 `Gi0/1` 172.16.0.1/24 ↔ PC-E 172.16.0.10',
          '- R1 มี static route ไป 172.16.0.0/24 · R2 มี default route กลับมาที่ R1',
        ].join('\n'),
      },
      {
        heading: 'ตรวจว่าทำงานก่อนเริ่ม',
        body: [
          '1. PC-A ping `192.168.10.12` (VLAN เดียวกันข้าม trunk)',
          '2. PC-A ping `192.168.20.11` (ข้าม VLAN ผ่าน R1)',
          '3. PC-A ping `172.16.0.10` (ผ่าน static route และ default route)',
        ].join('\n'),
      },
      {
        heading: 'ฝึก 1: trunk ไม่อนุญาต VLAN 20',
        body: [
          '1. SW1: `enable` → `configure terminal` → `interface gi0/2`',
          '2. `switchport trunk allowed vlan remove 20`',
          '3. PC-B ping PC-D ไม่ผ่าน แต่ PC-A ping PC-C ยังผ่าน — อ่านเหตุผลใน Lab Inspector',
          '4. `show interfaces trunk` เพื่อตรวจ แล้วกู้คืนด้วย `switchport trunk allowed vlan add 20`',
        ].join('\n'),
      },
      {
        heading: 'ฝึก 2: ขากลับของ default route',
        body: [
          '1. R2: `no ip route 0.0.0.0 0.0.0.0 10.0.0.1`',
          '2. PC-A ping `172.16.0.10` ไม่ผ่าน — Inspector ระบุว่าขาไปถึงแต่ขากลับล้ม',
          '3. กู้คืนด้วย `ip route 0.0.0.0 0.0.0.0 10.0.0.1`',
        ].join('\n'),
      },
      {
        heading: 'ฝึก 3: ให้ SW2 (Aruba) เป็น gateway',
        body: [
          '1. SW2: `configure terminal` → `interface vlan 10` → `ip address 192.168.10.254/24`',
          '2. `exit` → `interface vlan 20` → `ip address 192.168.20.254/24`',
          '3. ตั้ง gateway ของ PC-C เป็น 192.168.10.254 และ PC-D เป็น 192.168.20.254 (แผงรายละเอียดของ PC)',
          '4. PC-C ping `192.168.20.12` — switch route ให้เอง',
        ].join('\n'),
      },
    ],
    resources: REFERENCES,
  };
}
