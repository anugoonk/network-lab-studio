# Certification Development Roadmap: Network Lab Studio

> **วันที่:** 2026-11-13
> **ประเภท:** CERT-Q3 และ CERT-Q4a (CDP verify) เสร็จแล้ว; phase อื่นเป็นข้อเสนอและต้องขออนุมัติแยก
> **อ้างอิง:** `CERTIFICATION_GAP_ANALYSIS.md` (สูตร, สถานะ), `CCNA_OBJECTIVE_MATRIX.md`, `NETWORK_PLUS_OBJECTIVE_MATRIX.md`
> **Baseline:** main = production `51251c0` (CERT-P0-1a evidence, 2026-11-16: CCNA v1.1 5.3 MISSING → PARTIAL; CERT-Q4a at `950fb0c`; CERT-Q3 at `3e00c13`) · CCNA v1.1 **20.5% / Lab 30.8%** · CCNA v2.0 **17.4% / 19.6%** · N+ **20.7% / 28.4%** (ก่อน Q4a: 19.0/27.4 · 15.4/17.6 · 20.6/28.2)

## 0. หลักการจัดลำดับ

ให้น้ำหนักตามลำดับนี้:
1. coverage ของ objective CCNA และ N+ ถ่วงด้วยน้ำหนัก domain ทางการ
2. คุณค่าของการฝึกมือ (Lab)
3. ประโยชน์ร่วมกันของทั้งสอง exam **และ CCNA v2.0** (เริ่มสอบประมาณ ก.พ. 2027)
4. ความซับซ้อน, ความเสี่ยงต่อ regression (fingerprint 2,029 / audit 197/220) และความเข้ากับสถาปัตยกรรมเดิม (engine เป็น pure function ของ Lab, state แบบ steady-state, schema เพิ่มได้แค่ field แบบ optional)

**ตัวเลข uplift** มาจากการตั้งรายการที่ phase นั้นแก้ (ตาม mapping item → phase ใน matrix) เป็น VERIFIED แล้วคำนวณใหม่ด้วยสูตรเดิม จึงเป็น **upper bound** ที่ถือว่าทำครบพร้อม test
- uplift ของแต่ละ phase **บวกกันตรงๆ ไม่ได้** ให้ดูตารางสะสม (หัวข้อ 1.2)
- **ไม่ได้รับประกัน** ว่า phase ใดจะเพิ่ม coverage ได้จริงก่อนจะตรวจ mapping กับ objective ซ้ำเมื่อออกแบบรายละเอียด
- phase ที่ uplift เป็น 0 (เช่น Q1) ยังมีคุณค่าด้านการสอน แต่สูตรไม่นับ เพราะไม่เปลี่ยนสถานะของ objective

**กฎที่ใช้กับทุก phase** (ตาม `PROJECT_RESUME_CHECKPOINT.md` หัวข้อ F):
- ทำใน worktree และ branch แยก, commit เฉพาะไฟล์ของ phase
- รัน tsc, unit, E2E ทั้งชุด, build, audit (ต้องไม่มี regression) และ fingerprint (ต้องเหมือนเดิมทุก byte สำหรับ Lab ที่ไม่ได้ใช้ฟีเจอร์ใหม่)
- ผ่าน CI `ci/<phase>` ก่อน deploy ด้วย ff, ตรวจ sha256 ของ bundle และรัน smoke บน production
- **ถ้าต้องแก้ engine หรือ schema ต้องหยุดขออนุมัติก่อน** · schema ใหม่ต้องเป็น optional field เพื่อให้ Lab เดิมเปิดได้

## 1. สรุปภาพรวม

### 1.1 Uplift ของแต่ละ phase (ทำ phase นั้นอย่างเดียว · upper bound · จุดเปอร์เซ็นต์)

| Phase | CCNA v1.1 Overall / Lab (รายการ) | CCNA v2.0 Overall / Lab (รายการ) | N+ Overall / Lab (รายการ) |
|---|---:|---:|---:|
| CERT-Q1 | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) |
| CERT-Q2 | +2.5 / +0.0 (21) | +1.3 / +0.0 (8) | +2.4 / +0.0 (52) |
| CERT-Q3 (completed; included in baseline) | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) |
| CERT-Q4 (ส่วนที่เหลือหลัง Q4a: LLDP/config → VERIFIED; ก่อน Q4a +2.2/+4.4 · +5.0/+5.0 · +0.3/+0.3) | +1.3 / +2.7 (1) | +3.0 / +3.0 (1) | +0.2 / +0.2 (1) |
| CERT-P0-1 | +3.3 / +5.3 (3) | +5.7 / +5.5 (2) | +1.5 / +3.6 (3) |
| CERT-P0-2 | +1.5 / +4.2 (1) | +2.9 / +3.6 (1) | +5.6 / +2.7 (9) |
| CERT-P0-3 | +3.0 / +3.2 (4) | +2.9 / +3.6 (1) | +0.6 / +0.4 (1) |
| CERT-P0-4 | +2.5 / +3.0 (4) | +5.7 / +8.0 (2) | +2.0 / +4.2 (4) |
| CERT-P0-5 | +7.8 / +12.0 (9) | +3.0 / +3.4 (1) | +1.3 / +1.3 (3) |
| CERT-P0-6 | +2.5 / +2.7 (6) | +5.0 / +5.0 (4) | +1.9 / +3.2 (6) |
| CERT-P0-7 | +2.4 / +3.2 (3) | +1.0 / +1.1 (1) | +0.3 / +0.3 (1) |
| CERT-P1-1 | +4.1 / +6.3 (6) | +4.6 / +6.1 (2) | +1.2 / +1.3 (2) |
| CERT-P1-2 | +1.2 / +0.0 (2) | +2.9 / +3.6 (1) | +1.8 / +2.8 (3) |
| CERT-P1-3 | +2.2 / +4.4 (1) | +1.3 / +1.2 (1) | +0.5 / +0.8 (1) |
| CERT-P1-4 | +1.5 / +4.2 (1) | +2.9 / +3.6 (5) | +0.7 / +2.0 (1) |
| CERT-P1-5 | +2.0 / +5.3 (2) | +0.6 / +0.6 (1) | +3.2 / +4.7 (6) |
| CERT-P1-6 | +2.9 / +2.8 (3) | +2.7 / +1.5 (2) | +1.4 / +2.3 (3) |
| CERT-P2-1 | +11.2 / +6.4 (11) | +4.4 / +0.8 (5) | +6.2 / +8.5 (12) |
| CERT-P2-2 | +5.0 / +0.0 (1) | +5.0 / +2.9 (1) | +1.1 / +0.9 (2) |
| CERT-P2-3 | +0.9 / +2.7 (1) | +2.1 / +3.0 (1) | +0.4 / +0.5 (2) |
| CERT-P2-4 | +1.7 / +0.0 (3) | +0.6 / +0.6 (1) | +5.4 / +4.2 (9) |
| CERT-P2-5 | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) | +4.3 / +1.5 (11) |
| CERT-P2-6 | +0.2 / +0.0 (1) | +0.9 / +0.8 (1) | +0.7 / +1.7 (2) |
| CERT-P3-1 | +5.7 / +0.0 (4) | +3.3 / +7.5 (2) | +1.3 / +0.9 (3) |
| CERT-P3-2 | +1.5 / +0.0 (1) | +2.9 / +0.0 (1) | +1.0 / +0.8 (2) |
| CERT-P3-3 | +0.0 / +0.0 (0) | +0.0 / +0.0 (0) | +4.6 / +3.6 (7) |
| CERT-P3-4 | +2.2 / +1.0 (4) | +3.0 / +3.0 (1) | +1.4 / +2.0 (5) |

### 1.2 สะสมตาม tier (upper bound)

| Tier | CCNA v1.1 Overall / Lab | CCNA v2.0 Overall / Lab | N+ Overall / Lab |
|---|---:|---:|---:|
| วันนี้ (หลัง CERT-Q3 + CERT-Q4a + CERT-P0-1a) | 20.5% / 30.8% | 17.4% / 19.6% | 20.7% / 28.4% |
| + Quick wins (Q1–Q4) | 24.3% / 33.5% | 21.7% / 22.6% | 23.2% / 28.5% |
| + P0 | 47.0% / 66.6% | 47.8% / 52.9% | 36.0% / 44.3% |
| + P1 | 59.6% / 89.6% | 62.7% / 69.6% | 44.8% / 58.2% |
| + P2 | 78.1% / 98.7% | 75.3% / 77.8% | 63.0% / 75.5% |
| + P3 | 87.1% / 99.7% | 84.2% / 88.3% | 71.2% / 82.8% |

**ส่วนที่ roadmap นี้ยังไม่ปิด:** หัวข้อที่เป็นเนื้อหาความรู้ล้วน (Q2 ได้แค่ THEORY_ONLY 0.10) และหัวข้อที่ simulator ทำไม่ได้ (เครื่องมือ hardware จริง, social engineering ฯลฯ) จึงไม่ถึง 100%

### 1.3 แยก quick win (ไม่แตะ engine) กับงานที่แตะ engine

| ไม่แตะ engine / schema | แตะ engine (ต้องขออนุมัติตามกฎ) |
|---|---|
| CERT-Q1 Lab curriculum จากฟีเจอร์เดิม · CERT-Q2 concept note · CERT-Q3 test เพิ่ม · CERT-Q4 show command จาก state เดิม · CERT-P2-3 คำสั่ง OS ของ client (อ่านอย่างเดียว) · CERT-P3-1 มุมมอง JSON/API (adapter) | P0-1…P0-7, P1-1…P1-6, P2-1, P2-2, P2-4 (บางส่วน), P2-5 (schema annotations), P2-6, P3-2…P3-4 |

## 2. ลำดับที่แนะนำ (Top 10)

| ลำดับ | Phase | เหตุผล |
|---:|---|---|
| 0 | (ค้างอยู่) Linux CI ของ `3c9aed7` | ปิดงาน E2E endpoint ก่อนเริ่มงานใหม่ |
| 1 | **CERT-Q3 เสร็จแล้ว** | main `3e00c13`; audit update รวม 4 objectives แล้ว; F-1…F-7 ยังเปิด |
| 2 | **CERT-Q4** `show cdp/lldp neighbors`, `show logging` | **Q4a (CDP verify) เสร็จแล้ว** `950fb0c`: 2.3 / v2 2.3 / N+ 5.5-b10 → PARTIAL · ที่เหลือ: Q4b (LLDP + config, ต้องมี optional schema field) และ LOG0/LOG1 (`show logging`) · upper bound ที่เหลือ v2.0 +3.0 จุด |
| 3 | **CERT-P0-1** password + SSH | engine แตะน้อย, ใช้ได้ทั้ง 3 exam, เป็นฐานของ AAA ใน v2.0 4.1 |
| 4 | **CERT-P0-7** AD + floating static | เล็ก, เตรียมทางให้ OSPF (AD 110 vs static) |
| 5 | **CERT-P0-2** ACL (standard ก่อน แล้วค่อย extended ICMP/IP) | N+ +5.6, ใช้ใน NAT (list) |
| 6 | **CERT-P0-4** DHCP (= DEV-01D) + **CERT-P1-2** DNS | v2.0 +5.7/+8.0, N+ 3.4/5.3 |
| 7 | **CERT-P0-5** OSPFv2 | uplift มากที่สุดสำหรับ CCNA v1.1 (+7.8 / Lab +12.0) |
| 8 | **CERT-P0-6** STP/Rapid PVST+ | แก้ fidelity gap (loop ไม่เกิด storm) และเป็นฐานของ EtherChannel |
| 9 | **CERT-P0-3** NAT/PAT (+ internet edge ที่ route ได้ จาก DEV-01E) | หัวข้อ IP Services ที่สำคัญ, ต้องมี ACL ก่อน |
| 10 | **CERT-P1-1** IPv6 | งานใหญ่, ทำหลังจากพฤติกรรม IPv4 นิ่งแล้ว |

ทำควบคู่ได้ตลอด (ไม่ชนกับโค้ด): **CERT-Q1** (Lab curriculum) และ **CERT-Q2** (concept note)

## 3. รายละเอียดแต่ละ phase

> ทุก phase ใช้ test plan พื้นฐานเดียวกัน: unit (engine + CLI parser, ทุกคำสั่งใหม่ต้องอยู่ใน registry เพื่อให้ `tests/cli.test.ts:214` รันตัวอย่างให้อัตโนมัติ) + E2E (UI จริง) + audit + fingerprint + smoke บน production หลัง deploy · ด้านล่างระบุเฉพาะ test เพิ่มเติมของแต่ละ phase

### Quick wins

#### CERT-Q1: Certification-tagged Labs จากฟีเจอร์ที่มีอยู่
- **Objectives:** CCNA 1.6, 2.1, 2.2, 3.1, 3.3 · N+ 1.6, 1.7, 2.1, 2.2, 5.1, 5.3, 5.5 (ดู `CERTIFICATION_LAB_CURRICULUM.md` สถานะ "Runnable today")
- **Learning outcomes:** ฝึกตาม objective ทีละข้อ พร้อม Check อัตโนมัติ
- **Scope:** สร้าง Lab และ Challenge ใหม่ (builder ใน `sample.ts` + guide + EN) ที่ map กับ objective ID ใช้ check 7 ชนิดเดิม
- **Out of scope:** ฟีเจอร์ network ใหม่, ระบบคะแนนข้าม Lab
- **Engine:** ไม่แตะ · **CLI:** ไม่แตะ · **UI:** อาจเพิ่ม tag objective ใน Lab Manager (ข้อมูลเท่านั้น)
- **Test:** sample test แบบ `tests/samples.test.ts` (เริ่มแบบเสีย → แก้แล้วผ่าน) + E2E เปิด Lab ได้ + i18n
- **Dependencies:** ไม่มี
- **Acceptance:** ทุก Lab เปิดได้, Check เริ่มต้นไม่ผ่านและผ่านเมื่อแก้ถูก, ไม่มีอักษรไทยในโหมด EN, fingerprint ของ sample เดิมไม่เปลี่ยน
- **Risk:** ต่ำ · **Effort:** 1–2 สัปดาห์ · **Uplift:** 0 ตามสูตร (สถานะ objective ไม่เปลี่ยน) แต่เป็นเนื้อหาการสอนหลัก

#### CERT-Q2: Concept notes สำหรับ objective ระดับ describe
- **Objectives:** CCNA 1.5, 1.7, 1.9, 1.11, 1.12, 2.6, 4.7, 4.9, 5.1, 5.2, 5.4, 5.5, 5.8, 5.9, 6.1–6.4 · N+ 1.1-b5..b7, 1.2, 1.3, 1.4, 1.8, 2.4, 3.3, 4.1, 4.2
- **Learning outcomes:** อธิบายแนวคิดที่ simulator ฝึกไม่ได้
- **Scope:** ส่วน "Concepts" ใน Guide หรือ Command Library ที่ tag objective ID, TH/EN
- **Out of scope:** quiz ที่ให้คะแนน (ทำเป็น phase แยกได้), การคัดลอกเอกสาร exam
- **Engine/CLI:** ไม่แตะ · **UI:** panel อ่านอย่างเดียว
- **Test:** unit ตรวจว่าทุก note มี objective ID ที่มีจริงใน matrix + i18n + E2E เปิดอ่านได้
- **Acceptance:** ทุกรายการ MISSING ที่เป็น L ของ v1.1/N+ มี note · ข้อความเป็นของเราเอง
- **Risk:** ต่ำ (ความถูกต้องของเนื้อหาต้องให้ผู้สอนตรวจ) · **Effort:** 1–2 สัปดาห์ · **Uplift:** CCNA +2.5, N+ +2.4 (M → THEORY_ONLY)

#### CERT-Q3: Completed — test evidence included in baseline

**ผลจริง:** 19 tests (12 routing + 7 link messages), ผ่าน 19/19 ใน session นี้; เปลี่ยนสถานะเพียง 4 objectives. ขอบเขตเดิมด้านล่างเป็นประวัติ; ไม่เพิ่มสถานะ class D/E หรือ syslog. Uplift ที่เหลือ = 0; ตัวเลขเดิมเป็น uplift ก่อนรวม baseline.

- **Objectives:** CCNA 3.2.a (LPM), 3.3.c (host route) · v2.0 3.2.c · N+ 2.1-b4 · และ test เสริมสำหรับ 1.7-b1/b3 (ปฏิเสธ 0.x/127.x/≥224) และข้อความ `%LINK-3-UPDOWN` / `%LINK-5-CHANGED`
- **Scope:** unit test อย่างเดียว ยืนยันพฤติกรรมเดิม (probe วันนี้ยืนยันแล้วว่า host route ติดตั้งได้)
- **Engine/CLI/UI:** ไม่แตะ
- **Acceptance:** test ใหม่ผ่านบนโค้ดเดิมโดยไม่ต้องแก้โค้ด · ถ้า test เผยว่าพฤติกรรมผิด **ให้หยุดรายงาน ห้ามแก้ engine ใน phase นี้**
- **Risk:** ต่ำมาก · **Effort:** 2–3 วัน · **Uplift:** CCNA +0.7 / Lab +0.8

#### CERT-Q4: Original upper-bound scope — superseded for implementation by Q4a design

**สถานะล่าสุด (2026-11-13):** Q4a implement และ deploy แล้วที่ `950fb0c` (main CI 43377797700, E2E 138/138, deployment 7758721759, production CDP smoke ผ่าน) · ผลต่อคะแนน: CCNA 2.3, v2.0 2.3, N+ 5.5-b10 MISSING → PARTIAL (`CERTIFICATION_GAP_ANALYSIS.md` หัวข้อ 12) · `show lldp neighbors`, `cdp run`/`no cdp enable`, `show logging` ยังไม่มี

**Design review (ประวัติ):** เสนอ Q4a เฉพาะ `show cdp neighbors` / `show cdp neighbors detail` บน Cisco IOS; ยังไม่ implement. ขอบเขต LLDP/config (Q4b) และ logging (LOG0/LOG1) ต้องแยกตาม `CERT_Q4_TECHNICAL_DESIGN.md`. ตาราง uplift เดิมยังเป็น full-scope upper bound และไม่ได้ให้เครดิต Q4a ล่วงหน้า. Q4a เพียงอย่างเดียวควรเป็น PARTIAL เมื่อผ่านการตรวจหลักฐาน ไม่ใช่ VERIFIED.

- **Objectives:** CCNA 2.3 · v2.0 2.3 (+ส่วนหนึ่งของ 2.4 "show logs", 5.6) · N+ 5.5-b10 · ส่วนของ CCNA 4.5
- **Learning outcomes:** ใช้ CDP/LLDP ตรวจ documentation, อ่าน log
- **Scope:**
  - `show cdp neighbors [detail]` (Cisco ↔ Cisco)
  - `show lldp neighbors` (Cisco/Aruba) สร้างจากสายที่ต่อและ link ที่ up (steady-state เหมือน MAC/ARP)
  - `show logging` แสดง buffer ของข้อความ `%…` ที่ console เคยแสดง
  - `cdp run` / `no cdp enable` (ถ้าทำ ต้องเก็บใน config)
- **Out of scope:** CDP timer, การตั้ง logging (P1-6)
- **Engine:** ไม่แตะ `network.ts` (อ่าน topology) · **CLI:** spec ใหม่ใน registry · **UI:** ไม่แตะ
- **Test:** unit (เพื่อนบ้านตรงกับสาย, link down แล้วหายไป, Aruba ไม่แสดง CDP) + E2E 1 test
- **Acceptance:**
  - output ใช้รูปแบบ IOS/AOS-CX ที่ตรวจกับเอกสารได้ (AOS-CX docs เคยตอบ 403 ถ้าตรวจไม่ได้ให้ระบุใน README ว่ายังไม่ verify)
  - คำสั่งเดิม 107 ตัวไม่เปลี่ยน
- **Risk:** ต่ำ (ความเหมือนของ output) · **Effort:** 3–5 วัน · **Uplift:** CCNA +2.2 / Lab +4.4 · v2.0 +5.0 / +5.0

### P0: gap สำคัญของ certification

#### CERT-P0-1: Device access security + SSH
- **สถานะ:** **P0-1a เสร็จแล้ว** (enable secret + Password: prompt + redaction; production `51251c0`, CCNA v1.1 5.3 → PARTIAL) · **P0-1b** (username, line console/vty, login, enable password, service password-encryption) และ **P0-1c** (SSH) ยังไม่เริ่ม และต้องขออนุมัติแยก
- **Objectives:** CCNA 2.8, 4.8, 5.3 · v2.0 4.1, 4.2 · N+ 3.5-b3, 4.3-b1/b2
- **Learning outcomes:** ป้องกันการเข้าถึงอุปกรณ์ด้วย password และเข้าใช้งานระยะไกลด้วย SSH
- **Scope:**
  - `enable secret`, `service password-encryption`
  - `username … secret`
  - `line console 0` / `line vty 0 4` + `password` / `login` / `login local` / `transport input ssh`
  - `ip domain-name`, `crypto key generate rsa`
  - `ssh -l <user> <ip>` จาก PC และ router
  - prompt ถาม password ใน console
- **Out of scope:** TACACS+/RADIUS server จริง (v2.0 4.1 ให้เป็น P2), SCP/SFTP (concept)
- **Engine:** เล็ก: เปิด session ได้เมื่อ reachable (ใช้ `ping`/`deliver` เดิม) + config ถูก · **CLI:** spec ใหม่, password prompt · **UI:** console session ซ้อน (ssh) ต้องระวังเรื่อง focus/history
- **Test:** unit (login สำเร็จ/ล้ม, vty ไม่มี login, ไม่มี key) + E2E (ssh จาก PC ไป R1)
- **Dependencies:** ไม่มี
- **Acceptance:** Lab เดิมที่ไม่มี password เข้าได้เหมือนเดิม (ไม่ล็อกผู้เรียน) · running-config แสดง secret แบบ hash
- **Risk:** กลาง (UX ของ console) · **Effort:** 1–2 สัปดาห์ · **Uplift (หลัง P0-1a):** CCNA +3.3 / Lab +5.3 · v2.0 +5.7 · N+ +1.5 / +3.6

#### CERT-P0-2: IPv4 ACL
- **Objectives:** CCNA 5.6 · v2.0 4.6 · N+ 4.3-b5, 5.3-b3, 4.1-b7
- **Scope:**
  - ช่วงแรก: standard ACL (numbered 1–99 และ named) และ extended ACL สำหรับ IP/ICMP
  - `ip access-group in/out`, implicit deny, `show access-lists` พร้อมตัวนับ match
  - ping/traceroute ถูกทิ้งพร้อมเหตุผลใน Inspector
- **Out of scope:** TCP/UDP port (ต้องมี L4 model, ทำภายหลัง), ACL บน vty (ต่อจาก P0-1)
- **Engine:** กลาง: filter ทั้งขาไปและขากลับใน `deliver()` · **UI:** Inspector อธิบายว่าถูก ACL ทิ้ง
- **Test:** unit (ลำดับ ACE, implicit deny, ทิศ in/out, ขากลับ) + E2E + Challenge "ACL บล็อกผิดเครื่อง"
- **Dependencies:** ไม่มี
- **Acceptance:** Lab ที่ไม่มี ACL ได้ fingerprint เหมือนเดิมทุก byte
- **Risk:** กลาง · **Effort:** 2–3 สัปดาห์ · **Uplift:** CCNA +1.5 / Lab +4.2 · v2.0 +2.9 · N+ +5.6 / +2.7

#### CERT-P0-3: NAT/PAT + internet edge ที่ route ได้
- **Objectives:** CCNA 4.1, 1.2.d/e · v2.0 4.3 · N+ 2.1-b6
- **Scope:**
  - `ip nat inside/outside`, `ip nat inside source static`, `… list N pool P`, `… overload`
  - `show ip nat translations` (steady-state ตามการ ping ล่าสุด)
  - internet cloud หรือ ISP ที่ route ได้ (DEV-01E)
- **Out of scope:** NAT64, port forwarding ระดับ TCP
- **Engine:** **ใหญ่**: เปลี่ยน address ระหว่างทาง และขากลับต้องย้อน translation
- **Test:** unit (static, pool หมด, overload, ขากลับ) + E2E (PC ส่วนตัวไป "8.8.8.8" จำลอง)
- **Dependencies:** DEV-01E (cloud routable), P0-2 (ACL สำหรับ `list`)
- **Acceptance:** ไม่มี NAT แล้วพฤติกรรมเหมือนเดิม · traceroute แสดงตามจริงหลัง NAT
- **Risk:** สูง · **Effort:** 3–4 สัปดาห์ · **Uplift:** CCNA +3.0 / +3.2 · v2.0 +2.9 / +3.6

#### CERT-P0-4: DHCP (server, client, relay)
- **Objectives:** CCNA 4.3, 4.6, 1.1.g · v2.0 1.7, 1.3 · N+ 3.4-b1, 5.3-b6, 1.7-b1 (APIPA), 1.2-b7
- **Scope:**
  - DHCP บน IOS: `ip dhcp pool`, `network`, `default-router`, `dns-server`, `ip dhcp excluded-address`
  - DHCP service บน server (DEV-01D `services?`)
  - `ip helper-address`, `ip address dhcp`
  - PC: ตัวเลือก DHCP, `ipconfig /renew`, `/release`
  - APIPA 169.254.x.x เมื่อไม่มี server, pool exhaustion, `show ip dhcp binding`
- **Out of scope:** DHCPv6, DHCP snooping (P1-4)
- **Engine:** กลาง–ใหญ่: lease แบบ steady-state คำนวณจาก reachability ของ broadcast domain และ relay · **Schema:** optional field (ต้องอนุมัติ)
- **Test:** unit (lease ตาม pool/excluded, relay ข้าม router, exhaustion, APIPA) + E2E
- **Dependencies:** DEV-01D
- **Acceptance:** Lab แบบ static เดิมไม่เปลี่ยน · Lab ที่ใช้ DHCP เปิดในแอปรุ่นเก่าไม่ได้ (ต้องแจ้งผู้ใช้และขออนุมัติเรื่อง rollback)
- **Risk:** กลาง · **Effort:** 2–3 สัปดาห์ · **Uplift:** CCNA +2.5 / +3.0 · **v2.0 +5.7 / +8.0** · N+ +2.0 / +4.2

#### CERT-P0-5: Single-area OSPFv2
- **Objectives:** CCNA 3.4 a–d, 3.1.a/f, 3.2.c, 1.2.b/c · v2.0 3.3 (v2 ส่วน OSPFv3 ต้องรอ IPv6) · N+ 2.1-b2/b5, 1.6-b4
- **Scope:**
  - `router ospf`, `network … area 0`, `router-id`, `passive-interface`, `ip ospf cost/priority`
  - เลือก DR/BDR บน broadcast segment, p2p
  - `show ip ospf neighbor/interface/database` (ย่อ), route O ใน table พร้อม AD 110/cost
- **Out of scope:** multi-area, authentication, LSA type ละเอียด, timer
- **Engine:** **ใหญ่**: เพิ่ม route แบบ dynamic ที่คำนวณ SPF จาก topology ปัจจุบัน (steady-state) แล้วส่งเข้า `selectRoute`
- **Test:** unit (adjacency ขึ้นเมื่อ area/subnet ตรงกัน, DR/BDR ตาม priority/RID, cost, convergence เมื่อ shutdown) + E2E (สามเหลี่ยม router)
- **Dependencies:** P0-7 (AD)
- **Acceptance:** Lab ที่ไม่มี OSPF ได้ fingerprint เหมือนเดิม · traceroute เลือกเส้นทาง cost ต่ำ
- **Risk:** สูง · **Effort:** 4–6 สัปดาห์ · **Uplift:** **CCNA +7.8 / Lab +12.0** · v2.0 +3.0 · N+ +1.3

#### CERT-P0-6: STP / Rapid PVST+
- **Objectives:** CCNA 2.5 a–d, 1.2.a · v2.0 2.5 · N+ 2.2-b9, 5.3-b1, 1.6-b1/b2/b6/b7
- **Scope:**
  - เลือก root bridge ต่อ VLAN (priority + MAC), role/state, `spanning-tree vlan N priority/root primary`
  - `portfast`, `bpduguard` (err-disabled), `show spanning-tree [vlan]`
  - **พอร์ตที่ block ต้องไม่ส่งต่อ** และถ้าปิด STP แล้วเกิด loop ต้องเห็นผล (เตือน broadcast storm)
- **Out of scope:** MST, timer/convergence แบบเวลา
- **Engine:** **ใหญ่**: `l2Domain()` ต้องเคารพพอร์ตที่ block (steady-state)
- **Test:** unit (root/role ตาม priority, เปลี่ยนเมื่อ link ล่ม, per-VLAN) + E2E (สามเหลี่ยม 2960)
- **Dependencies:** ไม่มี (ทำก่อน P1-3 EtherChannel)
- **Acceptance:** topology ที่ไม่มี loop เหมือนเดิมทุก byte · Lab ที่มี loop เปลี่ยนพฤติกรรม **ต้องรายงานและขออนุมัติ** (ปัจจุบัน `tests/network.test.ts:159` ยอมให้มี loop)
- **Risk:** สูง · **Effort:** 4–6 สัปดาห์ · **Uplift:** CCNA +2.5 · v2.0 +5.0 · N+ +1.9 / +3.2

#### CERT-P0-7: Administrative distance + floating static
- **Objectives:** CCNA 3.2.b, 3.3.d, 3.1.e · v2.0 3.2.d · N+ 2.1-b3
- **Scope:** `ip route … <AD>`, เลือก route ตาม AD เมื่อ prefix เท่ากัน, route สำรองขึ้นเมื่อ next hop/link ล่ม, `show ip route` แสดง [AD/metric] ตามจริง
- **Engine:** กลาง: `selectRoute()` · **CLI:** เพิ่มอาร์กิวเมนต์
- **Test:** unit (AD ชนะ, failover) + E2E
- **Dependencies:** ไม่มี
- **Acceptance:** route ที่ไม่มี AD เหมือนเดิม ([1/0])
- **Risk:** ต่ำ–กลาง · **Effort:** 1 สัปดาห์ · **Uplift:** CCNA +2.4 / +3.2

### P1: ความสามารถร่วมที่มีคุณค่าสูง

| Phase | Objectives | Scope / Out-of-scope | Engine · CLI · UI | Test เพิ่ม | Dependencies | Acceptance | Risk | Effort | Uplift (v1.1 · v2.0 · N+) |
|---|---|---|---|---|---|---|---|---|---|
| **CERT-P1-1** IPv6 | CCNA 1.8, 1.9, 3.3.v6 · v2 1.4, 3.2.v6, 3.3 (OSPFv3 ภายหลัง) · N+ 3.4-b2, 1.8-b6 | global/link-local/EUI-64, prefix, static v6, `ping`/`traceroute` v6, SLAAC แบบ steady-state, dual-stack / ไม่มี DHCPv6, NAT64 | **ใหญ่**: L3If และ route v6 · CLI `ipv6 …`, `show ipv6 …` · UI ฟอร์ม v6 | unit: address type, EUI-64, LPM v6 · E2E dual-stack | ไม่มี | Lab v4 ทุกอันเหมือนเดิมทุก byte | สูง | 6–8 สัปดาห์ | +4.1/+6.3 · +4.6/+6.1 · +1.2/+1.3 |
| **CERT-P1-2** DNS | CCNA 4.3, 1.1.g · v2 4.4 · N+ 3.4-b3/b4, 5.5-b4 | record A/AAAA/CNAME/MX/NS/PTR บน server, `ip name-server`, ping ด้วยชื่อ, `nslookup`, hosts file / ไม่มี DNSSEC/DoH | กลาง · CLI + ตัวแก้ record | unit: resolve, record ผิด, ไม่มี server · E2E | P0-4 (ส่ง DNS ทาง DHCP), DEV-01D | Lab เดิมไม่เปลี่ยน | ต่ำ–กลาง | 1–2 สัปดาห์ | +1.2/0 · +2.9/+3.6 · +1.8/+2.8 |
| **CERT-P1-3** EtherChannel/LACP | CCNA 2.4 · v2 2.1.c · N+ 2.2-b6 | `channel-group mode active/passive/on`, Po interface, mismatch suspended, L3 Po / ไม่มี load-balance hash | กลาง: หลายลิงก์ = port เดียว · canvas รวมเส้น | unit: bundle/ไม่ bundle · E2E | **P0-6** | ไม่มี channel แล้วเหมือนเดิม | กลาง | 2–3 สัปดาห์ | +2.2/+4.4 · +1.3/+1.2 · +0.5/+0.8 |
| **CERT-P1-4** Port security (+ DHCP snooping/DAI) | CCNA 5.7 · v2 4.7 (a,b,c,d,e) · N+ 4.3-b3 | max MAC, sticky, violation shutdown/restrict/protect, err-disabled + recovery / storm control และ RA guard ภายหลัง | กลาง: ต้องมี event "MAC ใหม่" · สถานะ err-disabled บน canvas | unit · E2E | P1-5 (err-disabled), P0-4 (snooping) | Lab เดิมไม่เปลี่ยน | กลาง | 2 สัปดาห์ | +1.5/+4.2 · +2.9/+3.6 · +0.7/+2.0 |
| **CERT-P1-5** Interface speed/duplex/errors, err-disabled, voice VLAN | CCNA 1.4, 2.1.a · v2 1.1, 2.2.c · N+ 2.2-b4/b7/b8/b10, 5.2-b4/b6 | `speed`, `duplex`, mismatch (late collision/CRC counter แบบ steady-state), `show interfaces counters`, err-disabled, `switchport voice vlan`, MTU / ไม่มี auto-MDIX | กลาง: `linkStatus` และ counter | unit · E2E | ไม่มี | port เดิมได้ค่า default เหมือนเดิม | กลาง | 1–2 สัปดาห์ | +2.0/+5.3 · +0.6/+0.6 · +3.2/+4.7 |
| **CERT-P1-6** NTP, syslog config, SNMP | CCNA 4.2, 4.4, 4.5 · v2 5.4, 5.6 · N+ 3.2-b1/b5, 3.4-b5 | `ntp server/master`, `show ntp`, `show clock`, `logging host/trap/buffered`, collector บน server, `snmp-server community/host` + MIB browser แบบย่อ / ไม่มี SNMPv3 auth จริง | เล็ก–กลาง · server เป็น collector | unit · E2E | P0-4/DEV-01D (server service) | Lab เดิมไม่เปลี่ยน | ต่ำ | 1–2 สัปดาห์ | +2.9/+2.8 · +2.7/+1.5 · +1.4/+2.3 |

### P2: งาน networking ระดับกลาง

| Phase | Objectives | Scope / Out-of-scope | Engine · CLI · UI | Test เพิ่ม | Dependencies | Acceptance | Risk | Effort | Uplift (v1.1 · v2.0 · N+) |
|---|---|---|---|---|---|---|---|---|---|
| **CERT-P2-1** Wireless | CCNA 1.1.d/e, 1.11, 2.6, 2.7, 2.9, 5.9, 5.10 · v2 1.5, 2.2.b · N+ 2.3, 5.4-b6, 1.2-b9/b10 | AP bridge, SSID/VLAN mapping, WPA2/WPA3-PSK, wireless client, WLC + GUI จำลอง, channel/band / ไม่มีการจำลอง RF จริง | **ใหญ่** (DEV-01E AP bridge) · UI GUI | unit + E2E | DEV-01E | AP เดิม (diagram) ยังเปิดได้ | สูง | 6+ สัปดาห์ | +11.2/+6.4 · +4.4/+0.8 · +6.2/+8.5 |
| **CERT-P2-2** FHRP (HSRP/VRRP) | CCNA 3.5 · v2 3.4 · N+ 2.1-b7/b8 | virtual IP/MAC, active/standby, priority/preempt, failover | กลาง–ใหญ่ | unit + E2E | P0-7 | — | กลาง | 2–3 สัปดาห์ | +5.0/0 · +5.0/+2.9 · +1.1/+0.9 |
| **CERT-P2-3** คำสั่ง client OS | CCNA 1.10 · v2 1.6 · N+ 5.5-b6/b7 | `ifconfig`, `ip addr`, `ip route` (Linux/macOS), `netstat -rn`, เลือกชนิด OS ของ host | ไม่แตะ engine (อ่าน state) · CLI | unit | ไม่มี | terminal Windows เดิมไม่เปลี่ยน | ต่ำ | 3–5 วัน | +0.9/+2.7 · +2.1/+3.0 · +0.4/+0.5 |
| **CERT-P2-4** Physical layer | CCNA 1.3, 1.1.h · v2 1.1, 2.2.a · N+ 1.5, 5.2-b1/b2/b3/b7/b8, 1.1-b1 | ชนิดสาย (UTP cat, fiber SM/MM), ชนิด transceiver, ใส่ผิดชนิดแล้ว link down, PoE budget, `show power inline` | กลาง (`linkStatus`) · UI เลือกชนิดสาย | unit + E2E | P1-5 | สายเดิมได้ค่า default ที่ใช้งานได้ | กลาง | 2 สัปดาห์ | +1.7/0 · +0.6/+0.6 · +5.4/+4.2 |
| **CERT-P2-5** Documentation objects | N+ 2.4, 3.1-b1..b6/b11 | zone/site/IDF/MDF (DEV-01B-2 annotations), มุมมอง cable map / IPAM / inventory, export ตาราง | ไม่แตะ engine · schema `annotations?` (optional, ต้องอนุมัติ) · UI | unit + E2E | DEV-01B-2 | Lab เดิมไม่เปลี่ยน | ต่ำ | 2 สัปดาห์ | 0 · 0 · +4.3/+1.5 |
| **CERT-P2-6** Firewall zone policy | CCNA 1.1.c · v2 2.2.e · N+ 1.2-b3, 4.3-b7 | zone trusted/untrusted/DMZ, policy allow/deny แบบ stateful อย่างย่อ | ใหญ่ (DEV-01E) | unit + E2E | P0-2 | firewall เดิมยังเป็น diagram ถ้าไม่ตั้งค่า | กลาง | 2–3 สัปดาห์ | +0.2/0 · +0.9/+0.8 · +0.7/+1.7 |

### P3: งานขั้นสูงหรือลำดับรอง

| Phase | Objectives | Scope | Engine | Dependencies | Risk | Effort | Uplift (v1.1 · v2.0 · N+) |
|---|---|---|---|---|---|---|---|
| **CERT-P3-1** Automation view | CCNA 6.1, 6.5–6.7 · v2 5.2, 5.5 · N+ 1.8-b5, 3.2-b6 | มุมมอง JSON ของ config, API แบบ REST จำลอง (GET/PUT/PATCH บน Lab), "playbook" ที่รันคำสั่งหลายเครื่อง, แบบฝึกเลือก prompt สำหรับ AI (v2 5.2) | adapter (ไม่แตะ engine) | ไม่มี | ต่ำ | 2–3 สัปดาห์ | +5.7/0 · +3.3/+7.5 · +1.3/+0.9 |
| **CERT-P3-2** VPN/IPsec concept lab | CCNA 5.5 · v2 4.5 · N+ 3.5-b1/b2 | tunnel แบบ virtual link + concept | กลาง | P0-3 | กลาง | 1–2 สัปดาห์ | +1.5/0 · +2.9/0 · +1.0/+0.8 |
| **CERT-P3-3** Performance simulation | N+ 5.4-b1..b5, 3.2-b4/b10 | property ของ link (delay/loss/bandwidth), ping แสดง RTT/loss, baseline | กลาง (ต้องรักษา fingerprint สำหรับ link ที่ไม่ได้ตั้งค่า) | ไม่มี | กลาง | 3 สัปดาห์ | 0 · 0 · +4.6/+3.6 |
| **CERT-P3-4** Packet/frame view | CCNA 1.5, 1.13 · v2 2.4 (packet capture) · N+ 1.1-b4, 1.4-b10, 3.2-b3, 5.5-b1/b5 | มุมมอง capture จาก path ของ ping (ARP, ICMP, header, TTL ทีละ hop) | อ่าน path ของ `deliver()` | ไม่มี | กลาง | 3–4 สัปดาห์ | +2.2/+1.0 · +3.0/+3.0 · +1.4/+2.0 |

## 4. Phase ถัดไปที่เสนอ

**CERT-Q4a — Cisco CDP Neighbors: ✅ เสร็จแล้ว (production `950fb0c`, 2026-11-13)** · รายการด้านล่างคือ design ที่อนุมัติไว้ (ประวัติ) · phase ถัดไปต้องเลือกและอนุมัติใหม่: Q4b (LLDP + CDP/LLDP config, optional schema field) / LOG0 (แก้ F-1…F-3) → LOG1 (`show logging`) / CERT-P0-1 / UI-03
- CERT-Q3 อยู่ใน main และคะแนน baseline แล้ว ไม่ทำซ้ำ
- เพิ่มสองคำสั่งผ่าน CLI registry และ helper อ่าน topology จริง; จำกัด Cisco router/switch/ISP router
- อ่าน `Lab.links`, `linkStatus`, `l3Interfaces`; local/remote interface ตรงกับ link; ไม่สร้าง neighbor/IP ปลอม
- ไม่แก้ network engine, Lab schema หรือ CLI semantics เดิม
- deterministic tests: link orientation, two-sided shutdown, reconnect, vendor exclusion, detail address selection, no address, mode/abbreviation/help/Tab/`do`, export/import, no state mutation
- ก่อน implement ตรวจรูปแบบ output กับเอกสาร Cisco; holdtime/version เป็นข้อมูลจำลอง ต้องระบุข้อจำกัด
- เมื่อได้รับอนุมัติเริ่มใน worktree ใหม่จาก remote main ที่ตรวจซ้ำ; เก็บ hash งานเดิมก่อนแก้; ทำ regression ตามกฎของโครงการ
- commit, CI push, merge และ deploy เป็น gate แยก ไม่ได้รับอนุญาตจากการอนุมัติ design นี้

**ทางเลือก** (ถ้าต้องการผลต่อการสอนเร็วที่สุด): CERT-Q1 (Lab ใน curriculum ที่รันได้วันนี้ 13 ข้อ: F-01 ถึง F-09, F-11, N-01, N-03, N-04) ไม่แตะโค้ดส่วน engine เลย

**CERT-Q3 recalculation note:** `data/scores.json` regenerated from the unchanged scoring algorithm: phaseAlone Q3 is now zero for all exams. Other phase deltas and cumulative tier endpoints are unchanged. Rounded endpoints need not subtract to the displayed rounded uplift.

**CERT-Q4a recalculation note:** `data/scores.json` regenerated with the unchanged scoring algorithm after three items and one shared cluster changed from MISSING to PARTIAL. Cumulative tier endpoints (Q…P3) are unchanged because they are upper bounds that already credited these items as VERIFIED. Only the stand-alone CERT-Q4 delta falls, since 0.40 of each item is now in the baseline. Other phase deltas show only floating-point noise (< 1e-15).
