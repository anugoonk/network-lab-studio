# Certification Gap Analysis: Network Lab Studio × CCNA 200-301 / CompTIA Network+ N10-009

> **วันที่:** 2026-11-13
> **ประเภท:** read-only audit · ไม่มีการแก้โค้ด, commit, push หรือ deploy · รายงานไม่ commit
> **Production ที่ประเมิน:** `dcbf4cbeddcf28f47ef038f891730737ac396607` (+ commit ที่เป็น test อย่างเดียว `3c9aed7` ที่ยังรอ Linux CI ใช้เป็นหลักฐานโดยระบุ "(3c9aed7)" ทุกครั้ง)
> **รายงานชุดนี้:**
> - `CERTIFICATION_GAP_ANALYSIS.md` (ไฟล์นี้)
> - `CCNA_OBJECTIVE_MATRIX.md`
> - `NETWORK_PLUS_OBJECTIVE_MATRIX.md`
> - `CERTIFICATION_DEVELOPMENT_ROADMAP.md`
> - `CERTIFICATION_LAB_CURRICULUM.md`
> - `CERTIFICATION_EVIDENCE_INDEX.md`

---

> **CERT-Q3 score update (2026-11-13):** main/remote main verified at `3e00c13`; current scores below include only four IU → VERIFIED changes. Earlier production, CI and smoke records are historical, not rerun in this session. Tests 19/19 passed. Methodology §4, weights, relevance and all other classifications are unchanged. See §11 for the decision record.

## 1. Executive summary

| ตัวชี้วัด | CCNA v1.1 (exam ปัจจุบัน) | Network+ N10-009 | หมายเหตุ |
|---|---:|---:|---|
| **Overall training coverage** (ถ่วงน้ำหนักตาม domain ทางการ) | **20.5%** | **20.7%** | ทุก objective นับรวม รวมหัวข้อแบบ describe/explain |
| **Practical Lab coverage** (เฉพาะหัวข้อที่ฝึกมือได้, ถ่วง H=1/M=0.5) | **30.8%** | **28.4%** | CCNA domain 6.0 ไม่มีหัวข้อ H/M จึงไม่นับ (ฐาน 90%) |
| ช่วง sensitivity (strict … lenient) | 17.7–23.9% · Lab 27.5–35.2% | 18.6–23.1% · Lab 25.3–32.2% | เปลี่ยนคะแนนสถานะ (หัวข้อ 4.6) |
| **Verified-only floor** (นับเฉพาะ VERIFIED) | 13.7% · Lab 22.2% | 16.0% · Lab 20.7% | ส่วนที่มี automated test ยืนยัน |
| **Automated verification confidence** (= floor ÷ coverage) | 67% · Lab 72% | 77% · Lab 73% | สัดส่วนของ coverage ที่มี test รองรับ (ลดลงเพราะ CERT-Q4a และ CERT-P0-1a เพิ่ม PARTIAL ไม่ใช่ VERIFIED) |
| UNKNOWN | 0 รายการ | 0 รายการ | ทุกรายการตัดสินจากโค้ด, test หรือ probe จริง |
| **Shared CCNA + Network+ capability** (32 กลุ่มความสามารถ) | **29.2%** (strict 25.0%, lenient 34.5%) | | 6 VERIFIED · 8 PARTIAL · 1 DIAGRAM_ONLY · 17 MISSING |
| CCNA **v2.0** (โมเดลแยก, เริ่มสอบ 2027-02-03 ตามแหล่งรอง) | **17.4%** · Lab 19.6% | — | verified-only 6.8% · confidence 39% |

**สรุปสั้น:**
1. **แกนที่แข็งแรงและมี test ยืนยันจริง:**
   - IPv4 addressing/subnetting
   - VLAN, access port, 802.1Q trunk, native VLAN (รวม mismatch)
   - inter-VLAN routing (router-on-a-stick และ SVI)
   - static/default routing และการอ่าน routing table แบบพื้นฐาน
   - ping, traceroute, ARP/MAC table, IP ซ้ำ, ปัญหา gateway/VLAN/subnet mask
   - Challenge ที่ตรวจผลจาก Lab จริง
2. **จุดแข็งตรงกับหัวข้อ troubleshoot** ของ Network+ domain 5 (37.0%) และ CCNA domain 3 (36.2%)
3. **ส่วนที่ยังไม่มีเลย:**
   - IP Services ทั้งหมด (NAT, DHCP, DNS, NTP, SNMP, SSH)
   - Security (ACL, port security, password/AAA), Automation
   - OSPF, STP, EtherChannel, IPv6, Wireless
   - CCNA domain 4–6 รวม 35% ของน้ำหนักสอบได้ 0–4.4%
4. **ตัวเลขนี้ไม่ใช่ความพร้อมสอบหรือโอกาสสอบผ่าน** (หัวข้อ 4.7)
5. **ตัวเลขเดิม CCNA 65% / Network+ 55% ไม่ได้นำมาใช้** คำนวณใหม่จากหลักฐานทั้งหมด (เหตุผลที่ต่างอยู่หัวข้อ 9)

**Phase ถัดไปที่เสนอ (รออนุมัติ):**
1. ปิดงาน Linux CI ของ `3c9aed7` ที่ค้างอยู่ก่อน
2. CERT-Q3 และ CERT-Q4a (Cisco CDP verify-only, production `950fb0c`) เสร็จและรวมในคะแนนแล้ว (หัวข้อ 12); LLDP/config (Q4b) และ logging (LOG0/LOG1) ยังแยก phase และต้องอนุมัติ
3. จากนั้นทำ **CERT-P0-1** (enable secret, username, line vty, SSH) ซึ่งเป็น P0 ที่ความเสี่ยงต่ำที่สุด

รายละเอียดอยู่ใน `CERTIFICATION_DEVELOPMENT_ROADMAP.md`

---

## 2. ตรวจสถานะโปรเจกต์ก่อน audit (Phase 1)

| รายการ | คาด | ตรวจจริง (2026-11-13) | ผล |
|---|---|---|---|
| `origin/main` = `main` | dcbf4cb | `dcbf4cb` ทั้งคู่ | ✅ |
| `test/endpoint-e2e` | 3c9aed7 | `3c9aed7` (parent `dcbf4cb`) · ยังไม่ push (`ci/endpoint-e2e` ไม่มีบน remote) | ✅ |
| Production | index-Baola688.js | HTTP 200 · `index-Baola688.js` | ✅ |
| ชนิดอุปกรณ์ | 19 | `DeviceKind` 19 ชนิด · PROFILES 19 ชนิด (full 7 / partial 6 / diagram 6) | ✅ |
| คำสั่ง CLI | 107 | `SPECS.length` = 107 (Cisco 58, Aruba 41, PC 8) จาก inventory ที่ dump จากซอร์ส | ✅ |
| Unit / E2E | 725 / 137 | รันซ้ำวันนี้: unit **725/725** · E2E **137/137** (รวม 5 test ของ `3c9aed7`) | ✅ |
| Audit / fingerprint | 197/220 · 2,029 | รันซ้ำวันนี้: **197/220** regression 0 · **2,029 เหมือนเดิมทุก byte** | ✅ |
| Production smoke | 58/58 | รันซ้ำวันนี้: **58/58** · console error 0 · request ที่ล้ม 0 | ✅ |
| ไฟล์ที่ต้องปกป้อง | 22 | sha256 **22/22 OK** | ✅ |
| `git status` | 21 รายการ | 21 (M `ChallengePanel.tsx`, ?? `check-params.spec.ts`, ?? รายงาน 19 ไฟล์) | ✅ |

**ความคลาดเคลื่อน:** ไม่มี

**ข้อควรรู้:** E2E 137 ตัวนับรวม 5 test จาก branch `3c9aed7` ที่ยังไม่อยู่บน `main` ส่วน `main` เองมี 132 ตัว

## 3. แหล่งที่มาของ objective (Phase 2)

| Exam | เวอร์ชัน / วันที่ | แหล่ง | สถานะของแหล่ง |
|---|---|---|---|
| Cisco CCNA 200-301 | **v1.1** (PDF © 2024) · เป็น exam ที่ใช้สอบอยู่ | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf (sha256 `da15a22d…bd5`) · หน้า exam ทางการ https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html ลิงก์ไป "ccna-v1-1-exam-topics" | **ทางการ ครบทุกข้อ** · หน้า Learning Network (learningnetwork.cisco.com) render ไม่ได้ด้วย fetch อัตโนมัติ |
| Cisco CCNA 200-301 | **v2.0** (PDF © 2026) | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301_CCNA_v2.0_Exam_Topics_PDF.pdf (sha256 `5f0bf00d…923e`) | **ทางการ ครบทุกข้อ** · **วันที่ไม่มีใน PDF:** ประกาศ 2026-05-20, สอบ v1.1 ได้ถึง 2027-02-02 และเริ่ม v2.0 วันที่ 2027-02-03 มาจาก**แหล่งรอง** (บล็อกผู้ฝึกอบรม) ยังต้องยืนยันกับ Cisco |
| CompTIA Network+ | **N10-009** · Exam Objectives v4.0 (© 2023) · launch 2024-06-20 · retire ประมาณ 2027 (CompTIA ระบุแบบประมาณ) | เนื้อหา: เอกสาร CompTIA ฉบับที่ training partner โฮสต์ไว้ https://onlc.com/comptia/n10-009-exam-objectives.pdf (sha256 `2c6c73e4…3e01`) · ตรวจรหัส exam และน้ำหนัก domain กับ https://www.comptia.org/certifications/network | **น้ำหนัก domain ตรวจกับเว็บทางการแล้ว** · ตัว PDF จากโดเมนของ CompTIA (partners.comptia.org, comptia.jp) ตอบเป็น HTML ไม่ใช่ PDF จึงต้องใช้สำเนาของ partner · ข้อความในสำเนาตรงกับรูปแบบเอกสารทางการ (header "Exam Objectives Version 4.0", copyright CompTIA) |

**หลักปฏิบัติ:**
- ข้อความของ objective ทุกข้อเป็น**การถอดความ** ไม่ได้คัดลอกเอกสาร
- ID, ลำดับชั้น และน้ำหนักเป็นของทางการ
- Network+ มีเลขทางการแค่ 1.1–5.5 จึงสร้าง **ID ระดับ bullet** (เช่น `2.2-b3`) ตามลำดับในเอกสาร และระบุชัดว่าเป็น derived
- CCNA มี derived item 2 ข้อคือ `3.3.v6` (v1.1) และ `3.2.v6` (v2.0) เพราะ topic ทางการครอบคลุมทั้ง IPv4 และ IPv6

**จำนวนรายการที่ประเมิน:**

| Exam | Domain | Topic ทางการ | รายการที่ประเมิน |
|---|---:|---:|---:|
| CCNA v1.1 | 6 | 53 | 98 (sub-topic 58 + derived 1 + topic ที่ไม่มี sub 39) |
| CCNA v2.0 | 5 | 29 | 53 |
| Network+ N10-009 | 5 | 25 | 210 bullet |

## 4. Methodology (Phase 5–6)

### 4.1 หน่วยการประเมิน
- **CCNA:** ประเมินทุก sub-topic ทางการ (`1.1.a` …) ถ้า topic ไม่มี sub ให้ประเมินที่ตัว topic
- **Network+:** ประเมินทุก bullet ระดับบนสุดของแต่ละ objective
- ทุกรายการต้องมีหลักฐาน: ซอร์สที่ระบุ path และฟังก์ชัน/บรรทัด, test ที่ระบุ `file:line` + ชื่อ test หรือ **probe แบบ read-only** ที่รันกับ engine จริงวันนี้
- ผลของ probe:
  - `ip route … 255.255.255.255` (host route) ติดตั้งได้
  - floating static (ใส่ AD), `enable secret`, `router ospf`, `ipv6 unicast-routing`, `show cdp neighbors`, `show logging` ถูก parser ปฏิเสธ (probe ที่ `dcbf4cb`; `show cdp neighbors [detail]` มีแล้วตั้งแต่ `950fb0c`, CERT-Q4a; `enable secret` มีแล้วตั้งแต่ `3a27eef` และใช้งานได้ที่ production `51251c0`, CERT-P0-1a, ดู §13)

### 4.2 สถานะ (ใช้เหมือนกันทุกรายงาน)

| สถานะ | ความหมาย | คะแนน |
|---|---|---:|
| VERIFIED | มีพฤติกรรมนั้น และมี automated test ทดสอบกับ engine จริง | 1.00 |
| IMPLEMENTED_UNVERIFIED | มีพฤติกรรม (ยืนยันจากโค้ดหรือ probe) แต่ไม่มี test | 0.75 |
| PARTIAL | มีแค่บางส่วนของพฤติกรรมที่ต้องการ | 0.40 |
| DIAGRAM_ONLY | วาดหรือต่อสายได้ แต่ไม่จำลอง | 0.15 |
| THEORY_ONLY | มีคำอธิบายในแอป แต่ฝึกไม่ได้ | 0.10 |
| MISSING | ไม่มี | 0.00 |
| UNKNOWN | หลักฐานไม่พอ: **ไม่นับทั้งตัวตั้งและตัวหาร** และรายงานแยก | — |

**กติกาที่ใช้เข้มงวด:**
- **ไม่ให้ VERIFIED** เพียงเพราะมีไอคอน, มีคำสั่งใน list, มีแค่ test ที่ตรวจการ render หรือ test ที่ mock ผลลัพธ์
- การเทียบ UI กับ engine (`3c9aed7`) ยืนยันแค่ว่า UI แสดงผลของ engine ถูก **ไม่ได้ยืนยันว่า engine ตรงกับอุปกรณ์จริง**
- VERIFIED จึงหมายถึง "**ความถูกต้องของ simulator ตาม model ของมัน**" ไม่ใช่ความเหมือนอุปกรณ์จริง (real-device fidelity)
- ความเหมือนอุปกรณ์จริงประเมินแยกในหัวข้อ 6

### 4.3 สูตร (reproducible)

```
item_score     = SCORE[status]                                (UNKNOWN ถูกตัดออก)
topic_score    = mean(item_score ของ sub-topic / bullet ใน topic)
domain_score   = mean(topic_score ใน domain)                   (ทุก topic น้ำหนักเท่ากันภายใน domain)
OVERALL        = Σ_d (w_d × domain_score_d) / Σ_d w_d           (w_d = น้ำหนัก domain ทางการ)

LAB_domain_d   = Σ_t (rel_t × topic_score_t) / Σ_t rel_t        (rel: H=1.0, M=0.5, L=0)
LAB            = Σ_{d: Σrel>0} (w_d × LAB_domain_d) / Σ_{d: Σrel>0} w_d

VERIFIED_FLOOR = OVERALL ที่ให้ VERIFIED=1 และสถานะอื่น=0
CONFIDENCE     = VERIFIED_FLOOR / OVERALL
SHARED         = mean(SCORE[status]) ของ 32 กลุ่มความสามารถที่อยู่ในทั้งสอง exam
```

ข้อมูลทุกรายการ (สถานะ, คะแนน, relevance) อยู่ในตาราง compact matrix ของ `CCNA_OBJECTIVE_MATRIX.md` และ `NETWORK_PLUS_OBJECTIVE_MATRIX.md` จึงคำนวณซ้ำได้ด้วยมือ สคริปต์ที่ใช้ (`model.mjs`, `gen.mjs`, `qc.mjs`) ระบุตำแหน่งไว้ใน Evidence Index

### 4.4 Lab relevance

| ระดับ | ความหมาย | ตัวอย่าง |
|---|---|---|
| H (1.0) | configure, verify หรือ troubleshoot ด้วยมือ | `1.6`, `2.1`, `3.3`, `5.6`, N+ `5.3` |
| M (0.5) | interpret หรือสังเกตพฤติกรรม | `3.1` routing table, `2.5` STP, N+ `1.6` topology |
| L (0) | describe, explain หรือ compare (เนื้อหาความรู้) | `5.1`, `6.x`, N+ `1.3` cloud |

### 4.5 แยกให้ชัด 5 แนวคิด

| แนวคิด | ความหมายในรายงานนี้ |
|---|---|
| Software development completion | ฟีเจอร์ของแอปเสร็จแค่ไหน (เช่น catalog 19 ชนิด, CLI 107 คำสั่ง) **ไม่ได้วัดที่นี่** |
| Certification syllabus coverage | = **Overall** (ทุก objective รวมหัวข้อความรู้) |
| Lab simulation coverage | = **Lab** (เฉพาะหัวข้อที่ฝึกมือได้) |
| Exam readiness | ต้องมีความรู้ทฤษฎี + ข้อสอบจำลอง + ทักษะ ซึ่ง simulator ให้ได้แค่ส่วนทักษะ **ไม่ได้ประเมิน** |
| Likelihood of passing | **ไม่ได้ประเมินและไม่ควรอนุมานจากตัวเลขนี้** |

### 4.6 Sensitivity

| ชุดคะแนน | V | IU | P | D | T | CCNA v1.1 Overall / Lab | N+ Overall / Lab | Shared |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Proposed | 1 | .75 | .40 | .15 | .10 | **20.5% / 30.8%** | **20.7% / 28.4%** | **29.2%** |
| Strict | 1 | .50 | .25 | 0 | 0 | 17.7% / 27.5% | 18.6% / 25.3% | 25.0% |
| Lenient | 1 | 1.0 | .60 | .25 | .20 | 23.9% / 35.2% | 23.1% / 32.2% | 34.5% |
| Verified only | 1 | 0 | 0 | 0 | 0 | 13.7% / 22.2% | 16.0% / 20.7% | — |

**ความไวต่อข้อสมมติ:**
- ผลไม่ไวต่อคะแนนสถานะ (ช่วง ±3–4 จุด) เพราะ 60% (CCNA) และ 69% (N+) ของรายการเป็น MISSING ซึ่งได้ 0 ทุกชุด
- **ข้อสมมติที่มีผลมากกว่าคือ "ทุก topic น้ำหนักเท่ากันภายใน domain"** เช่น CCNA `3.5` FHRP เป็น 1 ใน 5 topic ของ domain 25% จึงมีผลประมาณ 5 จุด ขณะที่ `1.1` (8 sub-topic) มีผลประมาณ 1.5 จุด
- Cisco และ CompTIA ไม่ได้ให้น้ำหนักระดับ topic จึงไม่มีทางเลือกที่เป็นทางการกว่านี้

### 4.7 ข้อจำกัดของตัวเลข
- coverage ≠ ความพร้อมสอบ ≠ โอกาสสอบผ่าน
- VERIFIED ≠ ความเหมือนอุปกรณ์จริง
- น้ำหนักระดับ topic เป็นข้อสมมติ (เท่ากันภายใน domain)
- Lab relevance (H/M/L) เป็นการตัดสินของผู้ audit ตามกริยาของ objective
- CCNA v2.0: วันที่ยังไม่ยืนยันจากแหล่งทางการ

## 5. ผลรายละเอียด

### 5.1 CCNA 200-301 v1.1

| Domain | น้ำหนัก | Topic | Overall | Lab | Strict | Lenient | Verified-only |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.0 Network Fundamentals | 20% | 13 | 21.3% | 37.1% | 17.7% | 25.8% | 12.5% |
| 2.0 Network Access | 20% | 9 | 30.6% | 44.0% | 25.0% | 36.9% | 18.5% |
| 3.0 IP Connectivity | 25% | 5 | 36.2% | 40.2% | 33.9% | 39.2% | 30.1% |
| 4.0 IP Services | 10% | 9 | 4.4% | 0.0% | 2.8% | 6.7% | 0.0% |
| 5.0 Security Fundamentals | 15% | 10 | 4.0% | 10.0% | 2.5% | 6.0% | 0.0% |
| 6.0 Automation & Programmability | 10% | 7 | 0.0% | n/a | 0.0% | 0.0% | 0.0% |
| **รวม (ถ่วงน้ำหนัก)** | 100% | 53 | **20.5%** | **30.8%** | 17.7% | 23.9% | 13.7% |

**จำนวนรายการ (98):** VERIFIED 18 · IMPLEMENTED_UNVERIFIED 0 · PARTIAL 19 · DIAGRAM_ONLY 4 · THEORY_ONLY 0 · MISSING 57 · UNKNOWN 0

### 5.2 CompTIA Network+ N10-009

| Domain | น้ำหนัก | Objective | Overall | Lab | Strict | Lenient | Verified-only |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.0 Networking Concepts | 23% | 8 | 24.3% | 51.1% | 21.1% | 28.5% | 16.0% |
| 2.0 Network Implementation | 20% | 4 | 21.1% | 23.6% | 19.0% | 22.7% | 18.3% |
| 3.0 Network Operations | 19% | 5 | 7.0% | 7.0% | 5.2% | 9.3% | 2.5% |
| 4.0 Network Security | 14% | 3 | 4.5% | 7.9% | 2.4% | 6.9% | 0.0% |
| 5.0 Network Troubleshooting | 24% | 5 | 37.0% | 39.5% | 35.8% | 38.6% | 33.9% |
| **รวม (ถ่วงน้ำหนัก)** | 100% | 25 | **20.7%** | **28.4%** | 18.6% | 23.1% | 16.0% |

**จำนวนรายการ (210 bullet):** VERIFIED 37 · IMPLEMENTED_UNVERIFIED 0 · PARTIAL 23 · DIAGRAM_ONLY 7 · THEORY_ONLY 0 · MISSING 143 · UNKNOWN 0

Lab ของ N+ domain 1 สูง (51.1%) เพราะ topic H/M ใน domain นี้คือ IPv4 addressing (`1.7`) และ topology (`1.6`) ซึ่งเป็นจุดแข็งของแอป

### 5.3 CCNA 200-301 v2.0 (โมเดลแยก ไม่รวมกับ v1.1)

| Domain | น้ำหนัก | Topic | Overall | Lab |
|---|---:|---:|---:|---:|
| 1.0 Network Infrastructure & Connectivity | 25% | 7 | 11.4% | 16.0% |
| 2.0 Switching & Network Access | 25% | 5 | 35.4% | 35.4% |
| 3.0 IP Routing | 20% | 4 | 25.0% | 28.6% |
| 4.0 Network Services & Security | 20% | 7 | 0.0% | 0.0% |
| 5.0 AI, Network Operations & Management | 10% | 6 | 6.7% | 10.0% |
| **รวม** | 100% | 29 | **17.4%** | **19.6%** |

**v2.0 ต่ำกว่า v1.1** เพราะ:
- ตัดหัวข้อที่แอปทำได้บางส่วนออก เช่น topology architectures
- เพิ่มหัวข้อ troubleshoot ที่ต้องมี service: DHCP server, DNS records, NAT/PAT บน IOS XE, AAA, SFTP/SCP, storm control, RA guard, Ansible
- **ทุก phase ใน roadmap ใช้กับ v2.0 ได้ และหลายข้อมีผลกับ v2.0 มากกว่า v1.1** (ดู roadmap)

### 5.4 Shared capability (32 กลุ่ม)

| สถานะ | กลุ่มความสามารถ |
|---|---|
| VERIFIED (6) | IPv4 addressing/subnetting · VLAN + access port · 802.1Q + native VLAN · inter-VLAN/SVI/sub-interface · static/default routing · เครื่องมือ troubleshoot (ping/traceroute/arp/show) |
| PARTIAL (8) | route selection (LPM มี, AD/metric ไม่มี) · syslog · management access (console เท่านั้น) · client OS verification (Windows เท่านั้น) · network components · switching concepts/MAC table (steady-state) · topology architectures · CDP/LLDP (CDP verify บน Cisco IOS เท่านั้น, LLDP/config ไม่มี) |
| DIAGRAM_ONLY (1) | Wireless |
| MISSING (17) | IPv6 · OSPF · STP · link aggregation · NAT/PAT · DHCP · DNS · NTP · SNMP · ACL · port security · interface/cable issues · FHRP · VPN · virtualization/cloud · QoS · automation/API/JSON |

ตัวเลข: **29.2%** (strict 25.0%, lenient 34.5%)

## 6. Capability inventory จากซอร์สจริง (Phase 3)

### A. Simulation engine (`src/core/network.ts`, `l2tables.ts`, `ip.ts`, `trunkcheck.ts`)

| ความสามารถ | สถานะ | หลักฐานหลัก | ความเหมือนอุปกรณ์จริง (fidelity) |
|---|---|---|---|
| IPv4 address, mask, CIDR, /30, /31 | VERIFIED | `ip.ts` isValidMask/isHostAddress/subnetsOverlap · tests/cli.test.ts:49, l3.test.ts:311 | ปฏิเสธ 0.x, 127.x และ ≥224 เป็น host |
| Default gateway | VERIFIED | `selectRoute()` · tests/network.test.ts:80–133 · e2e (3c9aed7):180 | ไม่มี gateway → "PING: transmit failed. General failure." |
| ARP | PARTIAL | `arpTable()` steady-state · tests/l2tables.test.ts:79,90 | **ไม่เรียนรู้จาก traffic, ไม่มี aging** |
| ICMP ping / TTL | VERIFIED | `ping()` · tests/audit-phase-a.test.ts:77–194 | TTL เริ่มต้นตาม OS/vendor, ไม่จำลองเวลา (time<1ms) |
| Traceroute | VERIFIED | `trace()` · tests/traceroute.test.ts:118–223 | ไม่มี latency |
| Static routing + longest-prefix match | VERIFIED | `selectRoute()` l.462 · tests/route-selection.test.ts:101, :189 | Cisco IPv4 tested; AD ตายตัว [1/0] · **ไม่มี floating static / ECMP** · F-6/F-7 remain |
| Inter-VLAN (router-on-a-stick, SVI, Aruba routed) | VERIFIED | tests/l3.test.ts:114–332 · e2e/app.spec.ts:385,410 | — |
| VLAN isolation, trunk, allowed list, native VLAN | VERIFIED | `l2Domain()` · tests/l3.test.ts:27–103 · native-vlan tests | ไม่มี DTP |
| Routing table output | PARTIAL | `cisco.ts` l.240–275 | มีแค่ code C/L/S/S* · AD/metric ตายตัว |
| Packet forwarding | VERIFIED (ระดับ reachability) | `deliver()` | คำนวณเส้นทางทั้งเส้น ไม่ใช่ทีละเฟรม |
| Link state | VERIFIED | `linkStatus()`, `portLine()` · tests/challenge.test.ts:60,145 | มีแค่ up/down/admin-down/no-cable · ไม่มี err-disabled, speed/duplex |
| Dynamic routing | **MISSING** | probe: `router ospf` ถูกปฏิเสธ | — |
| L2 loop | ⚠ fidelity gap | tests/network.test.ts:159 "a layer-2 loop does not hang the engine" | **loop ไม่ทำให้เกิด broadcast storm** ผู้เรียนจึงไม่เห็นว่าทำไมต้องมี STP |

### B. อุปกรณ์ (19 ชนิด ตรวจจาก `PROFILES`)

| ระดับ | ชนิด | ทำงานจริง |
|---|---|---|
| full (7) | cisco-router, isp-router, cisco-switch (2960), aruba-switch (6100), l3-switch (6300), pc, laptop | CLI/terminal ครบ · ping/traceroute · forward ตามบทบาท (2960 ไม่ route) |
| partial (6) | server, printer, ip-camera, ip-phone, nvr, nas | เป็น IP host เท่านั้น: ping/tracert/arp/ipconfig · **ไม่มี service** (DHCP/DNS/HTTP/SIP/PoE/RTSP/SMB) |
| diagram (6) | wireless-ap, firewall, internet-cloud, patch-panel, rack, ups | **ไม่ forward, ไม่มี CLI** (tests/diagram-devices.test.ts:59–109) · cloud ไม่ route ไป 8.8.8.8 · patch panel ไม่ส่งต่อ · rack/UPS ไม่มีพอร์ต |

### C. CLI (107 คำสั่ง)

| Vendor | Mode | Interface | IP | VLAN | Layer 2 | Config | Troubleshooting | รวม |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Cisco IOS | 5 | 13 | 12 | 17 | 2 | 5 | 4 | 58 |
| Aruba AOS-CX | 3 | 7 | 8 | 11 | 2 | 5 | 5 | 41 |
| PC (Windows-style) | — | — | 2 | — | 1 | — | 5 | 8 |

- **มี:** mode hierarchy, abbreviation/ambiguity, `?`, Tab completion, `do`, interface range, error ตาม IOS (`% Invalid input detected at '^' marker.`)
- **Config persistence:** `write memory`, `copy run start`, `show startup-config`
- **Test:** ตัวอย่างของทุกคำสั่งถูกรันบนทุกชนิดอุปกรณ์ที่รองรับ (tests/cli.test.ts:214)
- **ไม่มี:** IPv6, OSPF, ACL, NAT, DHCP, NTP, SNMP, SSH, password, port-security, STP, EtherChannel, CDP/LLDP show (ณ `dcbf4cb`; `show cdp neighbors [detail]` เพิ่มที่ `950fb0c` รวมเป็น 109 คำสั่ง · LLDP ยังไม่มี), logging, ifconfig/ip/netstat/nslookup

### D. ฟีเจอร์การเรียนรู้

ตรวจแล้ว (มี test):
- topology editor และ palette (19 ชนิด)
- Command Library (UI-CL01)
- Console
- Lab save/load/autosave, import/export JSON, share link
- Lab Guide
- Challenge 7 ชุด ตรวจด้วย 7 ชนิด check (`ping`, `link-up`, `config-line`, `trunk-vlan`, `port-admin`, `route`, `no-dup-ip`), hint, Reset, ตัวแก้ของผู้สอน
- Inspector (VLAN/trunk/native mismatch/IP ซ้ำ)
- packet animation
- undo/redo

**ข้อจำกัด:**
- ยังไม่มีการ map Lab/Challenge กับ objective ของ exam
- ไม่มีคะแนนรวมหรือประวัติผู้เรียน

### E. Network services และ security

ทุกรายการต่อไปนี้ **MISSING** (ตรวจจากซอร์สและ probe):
- DHCP, DNS, NAT/PAT, NTP, HTTP/HTTPS, SSH, SNMP
- ACL, OSPF, IPv6, STP, EtherChannel
- wireless, firewall policy, password/AAA, automation/API

**ข้อยกเว้นบางส่วน:**
- **Syslog:** มีข้อความรูปแบบ IOS 4 แบบ (`%LINK-3-UPDOWN`, `%LINK-5-CHANGED`, `%IP-4-DUPADDR`, `%CDP-4-NATIVE_VLAN_MISMATCH`) แต่ไม่มี logging config หรือ `show logging`
- **Firewall:** มีพอร์ต LAN/WAN/DMZ แต่เป็น diagram เท่านั้น
- **CDP:** เดิมมีแค่ข้อความ native VLAN mismatch · ตั้งแต่ `950fb0c` (CERT-Q4a) มี `show cdp neighbors [detail]` แบบ read-only จาก topology (ไม่มี LLDP, CDP config, advertisement หรือ timer) — หัวข้อ 12

## 7. Gap analysis ตามรายการที่โจทย์กำหนด (Phase 7)

แต่ละรายการตรวจกับโค้ดจริง ไม่ได้สมมติว่าขาด รายละเอียดแผนอยู่ใน roadmap

| # | Gap | ทำไมสำคัญต่อ exam | รองรับตอนนี้ | พฤติกรรมที่ขาด | อุปกรณ์ / CLI ที่ต้องมี | Engine | UI | Test ที่ต้องมี | Dependency | ความเสี่ยง | Effort |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| C1 | **IPv6** | CCNA 1.8, 1.9, 3.3 (v2: 1.4, 3.2, 3.3) · N+ 1.8, 3.4 | MISSING (probe) | address/prefix, link-local, EUI-64, static v6, ping/traceroute v6, SLAAC | `ipv6 address`, `ipv6 route`, `show ipv6 interface brief/route`, `ping ipv6`, PC `ipconfig` v6 | **ใหญ่**: dual-stack ใน L3If, selectRoute, deliver, trace | ฟอร์ม IP v6, Inspector | unit: addressing, LPM v6, ping/trace v6 · E2E dual-stack | ไม่มี | สูง (แตะทุก L3 path) | 6–8 สัปดาห์ |
| C2 | **OSPF** | CCNA 3.4 (+3.1/3.2) · v2 3.3 · N+ 2.1 | MISSING (probe) | adjacency, DR/BDR, router-id, p2p/broadcast, route O ใน table, AD 110, cost | `router ospf`, `network … area`, `router-id`, `ip ospf cost/priority`, `show ip ospf neighbor/interface`, `show ip route ospf` | **ใหญ่**: คำนวณ route แบบ link-state (steady-state SPF) | Inspector: neighbors | unit: เลือก DR/BDR, SPF, convergence เมื่อ link down · E2E: lab 3 router | P0-7 (AD) | สูง (fingerprint ต้องเหมือนเดิมเมื่อไม่มี OSPF) | 4–6 สัปดาห์ |
| C3 | **STP / Rapid PVST+** | CCNA 2.5 · v2 2.5 · N+ 2.2, 5.3 | MISSING · **loop ไม่มีผลเสีย** (tests/network.test.ts:159) | root election, role/state, blocking ที่ตัด loop, PortFast, BPDU guard | `spanning-tree mode rapid-pvst`, `vlan … priority`, `portfast`, `bpduguard`, `show spanning-tree` | **ใหญ่**: l2Domain ต้องเคารพพอร์ต blocking (steady-state) | เส้นสายที่ block มีเครื่องหมาย | unit: เลือก root/port role ต่อ VLAN · E2E: สามเหลี่ยม switch | ไม่มี | สูง (พฤติกรรม L2 เดิมต้องเหมือนเดิมเมื่อไม่มี loop) | 4–6 สัปดาห์ |
| C4 | **EtherChannel** | CCNA 2.4 · v2 2.1.c · N+ 2.2 | MISSING | bundle, LACP active/passive, mismatch suspend, L3 port-channel | `channel-group N mode active`, `interface port-channel`, `show etherchannel summary` | กลาง: link หลายเส้น = logical port (ต้องมี STP ก่อน ไม่งั้นการต่อหลายเส้นเป็น loop) | รวมเส้นบน canvas | unit: bundle ขึ้น/ไม่ขึ้น · E2E | P0-6 | กลาง | 2–3 สัปดาห์ |
| C5 | **ACL** | CCNA 5.6 · v2 4.6 · N+ 4.3, 5.3 | MISSING | standard/extended, numbered/named, in/out, implicit deny, ตัวนับ match | `access-list`, `ip access-list extended`, `ip access-group`, `show access-lists` | กลาง–ใหญ่: filter ใน deliver ทั้งขาไปและกลับ · ต้องมี protocol/port model สำหรับ extended (เริ่มจาก ICMP/IP) | Inspector อธิบายว่า "ถูก ACL X ทิ้ง" | unit: ลำดับ ACE, implicit deny, ทิศทาง · E2E | ไม่มี (extended TCP/UDP ต้องมี L4) | กลาง | 2–3 สัปดาห์ |
| C6 | **NAT/PAT** | CCNA 4.1 · v2 4.3 · N+ 2.1 | MISSING · cloud ไม่ route | inside/outside, static, pool, overload, translation table | `ip nat inside/outside`, `ip nat inside source static/list … pool/overload`, `show ip nat translations` | **ใหญ่**: เปลี่ยน address ระหว่างทาง + ขากลับ · ต้องมี internet edge ที่ route ได้ (DEV-01E) | — | unit: ขาไป/ขากลับ, overload · E2E | DEV-01E (cloud routable), P0-2 (ACL สำหรับ list) | สูง | 3–4 สัปดาห์ |
| C7 | **DHCP** | CCNA 4.3, 4.6 · v2 1.7 · N+ 3.4, 5.3 | MISSING · `DHCP Enabled: No` | server pool, excluded, client, relay (`ip helper-address`), pool exhaustion, APIPA | `ip dhcp pool`, `network`, `default-router`, `dns-server`, `ip dhcp excluded-address`, `ip helper-address`, `ip address dhcp`, PC `ipconfig /renew` | กลาง–ใหญ่: service บน router/server + lease แบบ steady-state | PC: ตัวเลือก DHCP/static | unit: lease, relay, exhaustion, APIPA · E2E | DEV-01D (`services?` บน server) | กลาง (schema optional field) | 2–3 สัปดาห์ |
| C8 | **DNS** | CCNA 4.3 · v2 4.4 · N+ 3.4, 5.5 | MISSING | record A/AAAA/CNAME/MX/NS/PTR, resolver, ping ด้วยชื่อ, nslookup | server records, `ip domain-lookup`, `ip name-server`, PC `nslookup` | กลาง: resolve ก่อน ping | ตัวแก้ record บน server | unit: resolve, record ผิด · E2E | P0-4 (DHCP ส่ง DNS) | ต่ำ–กลาง | 1–2 สัปดาห์ |
| C9 | **NTP** | CCNA 4.2 · N+ 3.4 | MISSING | server/client, stratum, sync status | `ntp server`, `ntp master`, `show ntp status/associations`, `show clock` | เล็ก: sync = reachability ไปหา server | — | unit · E2E | ไม่มี | ต่ำ | 1 สัปดาห์ |
| C10 | **SSH** | CCNA 4.8, 2.8 · v2 4.1 · N+ 3.5 | MISSING (probe) | key, username, vty, `transport input ssh`, `ssh -l` จาก PC/router | `ip domain-name`, `crypto key generate rsa`, `username … secret`, `line vty`, `login local`, `transport input ssh` | เล็ก–กลาง: session เปิดได้ถ้า reachable + config ถูก (เปิด console ระยะไกล) | Console เปิด session ซ้อน | unit · E2E | P0-1 (password) | กลาง (UI console) | 1–2 สัปดาห์ (รวม P0-1) |
| C11 | **Port security** | CCNA 5.7 · v2 4.7.e · N+ 4.3 | MISSING | max MAC, sticky, violation shutdown/restrict, err-disabled | `switchport port-security …`, `show port-security`, `errdisable recovery` | กลาง: ต้องมี event "MAC ใหม่" (MAC table ตอนนี้เป็น steady-state) | สถานะ err-disabled | unit · E2E | P1-5 (err-disabled) | กลาง | 2 สัปดาห์ |
| C12 | **WLAN / WLC** | CCNA 1.11, 2.6, 2.7, 2.9, 5.9, 5.10 · v2 1.5, 2.2.b · N+ 2.3, 5.4 | DIAGRAM_ONLY (AP ไม่ bridge) | AP bridge, SSID, WPA2-PSK, client association, channel, WLC GUI | GUI ของ WLC/AP, wireless client | **ใหญ่**: AP bridge (DEV-01E) + association model | หน้า GUI จำลอง | unit · E2E | DEV-01E | สูง | 6+ สัปดาห์ |
| C13 | **Network automation** | CCNA 6.1–6.7 · v2 5.5 · N+ 1.8 | MISSING (export เป็น JSON แต่ไม่ใช่เนื้อหาการเรียน) | มุมมอง JSON ของ config, API แบบ REST (GET/PUT), playbook ที่รันคำสั่งหลายเครื่อง | — | เล็ก: อ่าน/เขียน Lab ผ่าน adapter (ไม่แตะ engine) | panel "API/JSON" | unit · E2E | ไม่มี | ต่ำ | 2–3 สัปดาห์ |
| C14 | **REST API / JSON** | CCNA 6.5, 6.7 | MISSING | CRUD, HTTP verbs, auth types, โครงสร้าง JSON | (เหมือน C13) | เล็ก | เหมือน C13 | unit | C13 | ต่ำ | รวมใน C13 |
| N1 | **Network monitoring** | N+ 3.2 (H) | PARTIAL เล็กน้อย (Inspector, link status, challenge checks) | SNMP, flow, packet capture, baseline, alert, discovery | dashboard ใน app | กลาง | panel monitoring | unit · E2E | P1-6 | กลาง | 3 สัปดาห์ |
| N2 | **SNMP** | N+ 3.2 · CCNA 4.4 | MISSING | community/v3, trap, MIB walk แบบย่อ | `snmp-server community/host`, "MIB browser" | เล็ก–กลาง | MIB browser | unit | ไม่มี | ต่ำ | 1–2 สัปดาห์ |
| N3 | **Syslog** | N+ 3.2 · CCNA 4.5 · v2 5.6 | PARTIAL (ข้อความ 4 แบบ) | logging buffered/host/trap level, `show logging`, collector | `logging host`, `logging trap`, `show logging` | เล็ก: เก็บข้อความที่มีอยู่แล้วลง buffer | — | unit: severity filter | ไม่มี | ต่ำ | 3–5 วัน (Q4) + 1 สัปดาห์ (P1-6) |
| N4 | **Wireless troubleshooting** | N+ 5.4, 2.3 · v2 1.6 | MISSING | interference, coverage, roaming, disassociation | — | ใหญ่ | heat map แบบย่อ | — | C12 | สูง | หลัง C12 |
| N5 | **DNS/DHCP troubleshooting** | N+ 5.3, 5.5 | MISSING | pool exhaustion, scope ผิด, rogue DHCP, record ผิด | nslookup, ipconfig /renew | ตาม C7/C8 | — | challenge check ใหม่ ("got lease", "resolves") | C7, C8 | กลาง | +1 สัปดาห์หลัง C7/C8 |
| N6 | **Network security** | N+ 4.1–4.3 · CCNA 5.x | MISSING ยกเว้น VLAN segmentation (PARTIAL) และ shutdown | ACL, port security, password, 802.1X, zone policy | ตาม C5, C10, C11, P2-6 | ตามรายการ | — | — | — | — | รวมในรายการอื่น |
| N7 | **VPN concepts** | N+ 3.5, 1.4 · CCNA 5.5 · v2 4.5 | MISSING | site-to-site/remote access, tunnel, split tunnel | concept + tunnel แบบย่อ | กลาง (tunnel = virtual link) | — | unit | P0-3 | กลาง | 1–2 สัปดาห์ (concept lab) |
| N8 | **Network documentation** | N+ 3.1 | PARTIAL (canvas = logical diagram + port labels; config management) | rack/cable map, IPAM view, inventory, L1/L2/L3 view | — | ไม่แตะ engine | zone/annotation (DEV-01B-2), export ตาราง IPAM/cable | unit + E2E | DEV-01B-2 | ต่ำ | 2 สัปดาห์ |
| N9 | **Physical infrastructure** | N+ 2.4 · CCNA 1.3 | DIAGRAM_ONLY (rack, UPS, patch panel) | IDF/MDF, power, environment, patch panel ส่งต่อสัญญาณ | — | เล็ก (patch panel pass-through = DEV-01E) | — | unit | DEV-01E | ต่ำ | 2 สัปดาห์ |
| N10 | **Cabling & interfaces** | N+ 5.2, 1.5 · CCNA 1.3, 1.4 · v2 1.1 | PARTIAL: admin-down VERIFIED, ที่เหลือ MISSING | ชนิดสาย/สื่อ, speed/duplex mismatch, counter, err-disabled, PoE budget | `speed`, `duplex`, `show interfaces counters`, `show power inline` | กลาง: link state ขึ้นกับคุณสมบัติของสาย/พอร์ต | ตัวเลือกชนิดสาย | unit + E2E | ไม่มี | กลาง (แตะ linkStatus) | 2–3 สัปดาห์ |
| N11 | **Disaster recovery** | N+ 3.3 | MISSING | RPO/RTO, DR site, HA | เนื้อหาความรู้ (L) | ไม่ต้องมี | concept note | — | — | ต่ำ | 2–3 วัน (Q2) |
| N12 | **Performance troubleshooting** | N+ 5.4 | MISSING (ping ได้ time<1ms เสมอ) | latency, loss, jitter, bandwidth, congestion | link property (delay/loss/bandwidth) | กลาง: ping แสดง RTT/loss จาก property | ตั้งค่า link | unit + E2E | ไม่มี | กลาง (fingerprint ping เปลี่ยนถ้าไม่ระวัง) | 3 สัปดาห์ |

## 8. Top 10 certification gaps

เรียงตามผลต่อ coverage (คำนวณจาก "ทำ phase นั้นเสร็จพร้อม test" = upper bound) × จำนวน exam ที่ได้ประโยชน์

| # | Gap | CCNA v1.1 Overall/Lab | CCNA v2.0 Overall/Lab | N+ Overall/Lab |
|---:|---|---:|---:|---:|
| 1 | OSPF single-area (P0-5) | +7.8 / +12.0 | +3.0 / +3.4 | +1.3 / +1.3 |
| 2 | Wireless: AP, SSID/WPA2, WLC (P2-1) | +11.2 / +6.4 | +4.4 / +0.8 | +6.2 / +8.5 |
| 3 | IPv6 (P1-1) | +4.1 / +6.3 | +4.6 / +6.1 | +1.2 / +1.3 |
| 4 | Device access security + SSH (P0-1) | +3.9 / +6.9 | +5.7 / +5.5 | +1.5 / +3.6 |
| 5 | ACL (P0-2) | +1.5 / +4.2 | +2.9 / +3.6 | +5.6 / +2.7 |
| 6 | DHCP client/server/relay (P0-4) | +2.5 / +3.0 | +5.7 / +8.0 | +2.0 / +4.2 |
| 7 | STP / Rapid PVST+ (P0-6) + แก้ fidelity ของ loop | +2.5 / +2.7 | +5.0 / +5.0 | +1.9 / +3.2 |
| 8 | NAT/PAT (P0-3) | +3.0 / +3.2 | +2.9 / +3.6 | +0.6 / +0.4 |
| 9 | Interface speed/duplex/errors, err-disabled, voice VLAN (P1-5) | +2.0 / +5.3 | +0.6 / +0.6 | +3.2 / +4.7 |
| 10 | NTP + syslog + SNMP (P1-6) | +2.9 / +2.8 | +2.7 / +1.5 | +1.4 / +2.3 |

ตารางเต็มทุก phase อยู่ใน roadmap

**ข้อควรรู้:**
- uplift ของ phase ต่างๆ บวกกันตรงๆ ไม่ได้ ให้ใช้ตารางสะสมใน roadmap
- Wireless มีผลต่อ Overall ของ CCNA v1.1 สูง เพราะ v1.1 มีหัวข้อ wireless หลายข้อ แต่ส่วนใหญ่เป็น describe-level
- CCNA v2.0 ลดหัวข้อ wireless ลงมาก จึงควรจัดลำดับโดยคำนึงถึง v2.0 ด้วย

## 9. ทำไมไม่ตรงกับตัวเลขเดิม (CCNA 65% / Network+ 55%)

ตัวเลขเดิมไม่มีวิธีคำนวณที่ทำซ้ำได้ ตัวเลขใหม่ต่างเพราะ:
1. **ประเมินทุก topic, sub-topic และ bullet** (98 + 210 รายการ) ไม่ใช่แค่ domain หลัก
2. **domain ที่แอปไม่มีเลย** (CCNA 4–6 = 35%) ได้ 0 ตามจริง
3. **นับหัวข้อความรู้ (L) ด้วย** ใน Overall ส่วน Lab แยกออกมาให้เห็นว่าเฉพาะหัวข้อที่ฝึกมือได้อยู่ที่ประมาณ 28–29%
4. **ไม่ให้เครดิต**ไอคอน, คำสั่งที่มีแค่ใน list หรือ test ที่ตรวจแค่การ render
5. **แยก VERIFIED กับ PARTIAL** (เช่น ARP/MAC เป็น steady-state จึงเป็น PARTIAL ในหัวข้อ "MAC learning and aging")

ถ้าดูเฉพาะ **topic ที่แอปออกแบบมารองรับ** (VLAN, trunk, inter-VLAN, IPv4, static routing, troubleshooting) คะแนนจะสูงมาก (เช่น CCNA `2.2` = 1.00, `1.6` = 1.00, N+ `5.3` = 0.67) ซึ่งน่าจะเป็นที่มาของตัวเลขเดิม

## 10. ข้อสรุป

1. Network Lab Studio เป็น **simulator ที่แข็งแรงสำหรับแกน Layer 2/3 แบบ static** และมี test รองรับจริง (confidence 69–77%)
2. **coverage ตาม syllabus ยังต่ำ** (CCNA v1.1 20.5%, N+ 20.7%) เพราะยังไม่มีชั้น service, security, dynamic protocol และ IPv6
3. **คุ้มที่สุดในระยะสั้น (ไม่แตะ engine):**
   - Q3 เสร็จแล้ว: test รองรับ LPM และ IPv4 host route; syslog ยัง PARTIAL
   - show command จาก state เดิม (Q4: CDP ส่วน Q4a เสร็จแล้ว ยังเหลือ LLDP/config และ `show logging`)
   - Lab curriculum ที่ map กับ objective (Q1)
   - concept note (Q2)
   - upper bound ของ tier Q ไม่เปลี่ยน (CCNA v1.1 → 23.7%, N+ → 23.2%) แต่ส่วนที่เหลือจากฐานใหม่ลดเป็นประมาณ +3.9 / +2.5 จุด (คำนวณจากค่าก่อนปัด)
4. **phase P0 ทั้งหมด** (SSH/password, ACL, NAT, DHCP, OSPF, STP, AD/floating static): upper bound ที่ CCNA v1.1 **47.0%** (Lab 66.6%), v2.0 **47.8%**, N+ **36.0%** (Lab 44.3%)
5. **รวม P1** (IPv6, DNS, EtherChannel, port security, interface, NTP/syslog/SNMP): CCNA v1.1 59.6% (Lab 89.6%), N+ 44.8% (Lab 58.2%)
6. **N+ ต้องการเนื้อหาความรู้และ operations มากกว่า CCNA** (cloud, DR, monitoring, documentation) จึงขึ้นช้ากว่า แม้หลัง P3 จะอยู่ที่ประมาณ 71% (Lab 82.8%)
7. **ควรออกแบบ phase ให้ตรงกับ CCNA v2.0 ไปพร้อมกัน** เพราะ v2.0 จะเป็น exam หลักตั้งแต่ประมาณ ก.พ. 2027 และเน้น troubleshoot service ที่ simulator ทำได้ดี

## 11. Quality control (Phase 11)

| ตรวจ | ผล |
|---|---|
| objective ทางการครบ | ✅ CCNA v1.1 53 topic / 6 domain · v2.0 29 topic / 5 domain · N+ 25 objective / 5 domain (นับตรงกับ PDF) |
| ID ไม่ซ้ำ | ✅ v1.1 112 ID, v2.0 60 ID, N+ 235 ID ซ้ำ 0 |
| น้ำหนัก domain ตรงกับแหล่งทางการ | ✅ รวม 100% ทุก exam · N+ ตรงกับ comptia.org |
| คำนวณซ้ำได้ | ✅ สูตรในหัวข้อ 4.3 + สถานะทุกรายการใน matrix |
| path ของซอร์สมีจริง | ✅ |
| test ที่อ้างมีจริง | ✅ `qc.mjs` ตรวจ **174 reference: ปัญหา 0** (ทุก `file:line` ของ test เป็น `it(`/`test(` จริง · ทุก "function() l.N" อยู่บรรทัดนั้นจริง · ไฟล์ของ `3c9aed7` อ่านผ่าน `git show`) |
| ฟีเจอร์ที่ไม่มีไม่ถูกนับเป็น VERIFIED | ✅ ทุกรายการที่ probe ปฏิเสธเป็น MISSING |
| อุปกรณ์ diagram ไม่ถูกนับเป็นอุปกรณ์ที่ทำงาน | ✅ firewall, AP, cloud, patch panel, rack, UPS = DIAGRAM_ONLY หรือ MISSING |
| ไม่มีการแก้โค้ดหรือ test | ✅ `git status` = 21 รายการเดิม + รายงาน 6 ไฟล์นี้ · `git diff` ของ tracked file ไม่เปลี่ยน |
| ไฟล์ที่ต้องปกป้องไม่เปลี่ยน | ✅ sha256 22/22 (ตรวจก่อนแก้ checkpoint) |
| ไม่มี push, merge หรือ deploy | ✅ `origin/main` = `dcbf4cb` · remote ไม่มี `ci/endpoint-e2e` |

**Mapping สมบูรณ์:** ทุก objective ทางการของทั้ง 3 exam ถูกประเมินแล้ว ไม่มี objective ที่ค้าง

## 11. CERT-Q3 classification decision (2026-11-13)

| Objective | Before → after | Actual assertions and limits |
|---|---|---|
| CCNA v1.1 3.2.a | IU → VERIFIED | A1–A8: /24 vs /16 in both configuration orders, /0 fallback, connected/static prefix precedence, unreachable destination, link-down fallback, deterministic export/import. |
| CCNA v1.1 3.3.c | IU → VERIFIED | B1–B4: exact /32 host vs adjacent hosts, route/config output, unusable next hop and rejection without route mutation. IPv6 remains a separate MISSING item. |
| CCNA v2.0 3.2.c | IU → VERIFIED | Same B1–B4; fallback and rejected configuration provide troubleshooting evidence within the existing IPv4 model. |
| N10-009 2.1-b4 | IU → VERIFIED | Same A1–A8: prefix selection only; AD/metric bullets retain their previous classifications. |

Evidence keys: `t.q3lpm`, `t.q3host`, `t.q3link` in the regenerated evidence index. All 19 tests run through the real engine; output is not mocked. Tests cover Cisco routers, not independent AOS-CX routing commands or real devices. F-6 display and F-7 ECMP gaps remain; neither invalidates the narrow IPv4 LPM/exact-host assertions. Syslog stays PARTIAL because the seven format tests do not fix F-1…F-5. No claim of application behaviour change.

| Exam | Overall before → after | Lab before → after |
|---|---:|---:|
| CCNA v1.1 | 18.3% → 19.0% | 26.5% → 27.4% |
| CCNA v2.0 | 15.1% → 15.4% | 17.3% → 17.6% |
| N10-009 | 20.4% → 20.6% | 28.1% → 28.2% |

Results match the proposals using unchanged formulas. Round only after calculation: e.g. CCNA v1.1 Lab gain is 0.8488 percentage points (displayed uplift +0.8), while separately rounded endpoints read 26.5 → 27.4. Network+ Overall gain is 0.1389 points (+0.1), while rounded endpoints read 20.4 → 20.6. Shared remains 28.0%; route-selection cluster is still PARTIAL (AD/metric missing).

## 12. CERT-Q4a classification decision (2026-11-13, production `950fb0c`)

Evidence checked against the actual code and tests at main = production `950fb0c5639a4e0df1b24e30a71341c0438be468`: `src/core/cli/cdp.ts` (`neighbors()` l.25 uses physical `Lab.links` with `linkStatus().up` and Cisco IOS kinds only; `entryAddress()` l.43; `showCdpNeighbors()` l.53), registry specs `cisco.show.cdp.neighbors` / `.detail` (privileged EXEC), `tests/cdp.test.ts` (33 tests through the real `executeLine`, no mocks), `e2e/cdp.spec.ts:6`, main CI run 43377797700 (E2E 138/138), deployment 7758721759 and the production CDP smoke on the live site. Evidence keys: `s.cdp`, `t.cdp`, `p.cdp`.

| Objective | Before → after | Why not higher | Why not lower |
|---|---|---|---|
| CCNA v1.1 2.3 Configure and verify CDP and LLDP | MISSING → **PARTIAL** | LLDP is absent, and CDP/LLDP configuration (`cdp run`, `cdp enable`, `lldp run`, transmit/receive) is rejected (`tests/cdp.test.ts:237`). The "configure" half and the whole LLDP half are missing, so not VERIFIED or IU | The CDP verification subset is implemented and tested (ports, orientation, operational state, exclusions, detail, determinism) |
| CCNA v2.0 2.3 Validate documentation using CDP and LLDP | MISSING → **PARTIAL** | No LLDP. Validation works only between Cisco IOS devices | `show cdp neighbors [detail]` compares real cabling and ports with the topology (`:50`, `:56`, `:111`, `:147`; production smoke) |
| N10-009 5.5-b10 LLDP/CDP | MISSING → **PARTIAL** | No LLDP, and no CDP on AOS-CX or hosts | A CDP tool exists on Cisco IOS and is tested |
| Shared cluster "CDP/LLDP" | MISSING → **PARTIAL** | Same as above | Same as above |

**Reviewed but unchanged:**
- **N10-009 3.2-b8 Network discovery** stays MISSING. It refers to monitoring and discovery tooling (scanning or SNMP), not a one-hop neighbor table.
- **CCNA v1.1 4.5 / v2.0 5.6 Syslog** stays PARTIAL. Q4a adds no logging, and F-1…F-5 remain open.
- **N10-009 3.1 Documentation** is not an item with its own status and was left as is.

**What did not change:**
- No item became VERIFIED, so the verified-only floor is unchanged. Confidence drops slightly because coverage rises while the floor stays the same.
- Weights, relevance, phase mappings, formulas and every other status are unchanged.
- Line references in `s.cisco` and `s.syslog` now name their baseline commit, because `950fb0c` shifts `cisco.ts` by +1 or +17 lines.

| Exam | Overall before → after | Lab before → after | Verified-only |
|---|---:|---:|---:|
| CCNA v1.1 | 19.0% → **19.9%** | 27.4% → **29.2%** | 13.7% (unchanged) |
| CCNA v2.0 | 15.4% → **17.4%** | 17.6% → **19.6%** | 6.8% (unchanged) |
| N10-009 | 20.6% → **20.7%** | 28.2% → **28.4%** | 16.0% (unchanged) |
| Shared (32 clusters) | 28.0% → **29.2%** | — | — |

**Uplift is calculated before rounding:**
- CCNA v1.1: Overall +0.89 points, Lab +1.78.
- CCNA v2.0: +2.00 for both.
- N10-009: Overall +0.10, Lab +0.13.
- Each one is a single topic or bullet going from 0 to 0.40.

**Roadmap effect:**
- The cumulative upper bounds (tiers Q, P0, …) are unchanged.
- The remaining stand-alone uplift of CERT-Q4 is lower: CCNA v1.1 +2.2 → +1.3 (Lab +4.4 → +2.7), v2.0 +5.0 → +3.0, N+ +0.3 → +0.2. This is because 0.40 of each Q4 item is already counted.

**QC:**
- `qc.mjs` reports 209 evidence references with 0 problems. These include the 13 new `tests/cdp.test.ts` / `e2e/cdp.spec.ts` lines and 3 new function references.
- `recompute-from-matrices.mjs` reproduces 65/65 figures.
- `verify.mjs` passes 7/7.

**Limitations:**
- VERIFIED and PARTIAL describe simulator behaviour, not real-device fidelity.
- CDP output is a read-only topology view with no advertisements, holdtime, timers or interface filter, and runs in privileged EXEC only.
- The historical inventory and probe snapshots (`data/inventory.json` with 107 specs, and `probe.json` showing `show cdp neighbors` rejected) are from `dcbf4cb` and are kept unchanged.

## 13. CERT-P0-1a classification decision (2026-11-16, production `51251c0`)

**Evidence:** main = production `51251c0` (enable secret `3a27eef` + redaction hotfix fix1 `51251c0`, deployment 7813043791). Evidence keys `s.secret`, `s.enable`, `s.credin`, `s.persist` (updated), `t.secret`, `t.secfix`, `t.secretE2E`, `p.p01a` in `certification-audit/scripts/model.mjs`.

**Status change (one item):**

| Objective | Before → after | Why |
|---|---|---|
| CCNA v1.1 **5.3** Device access control with local passwords (H) | MISSING → **PARTIAL** | `enable secret`, `enable secret 0`, `enable secret 5`, `no enable secret` and the hidden `Password:` prompt work and are tested. The objective also requires line console/vty passwords, `login` / `login local` and `username`, none of which exist |

**Why not VERIFIED:** only one of the four required mechanisms exists. VERIFIED would need all of them with test evidence.

**Reviewed and unchanged (no credit given):**
- CCNA v1.1 **4.8** SSH (stays MISSING: no domain name, crypto key, username, vty, transport input or ssh client). Only its capability text was corrected, because it said "enable secret rejected (probe)".
- CCNA v1.1 **2.8** and the shared cluster "SSH / management access" (already PARTIAL for the console; Telnet, SSH, HTTP and AAA are absent).
- CCNA v1.1 **5.4** Password policy elements (concept item; no policy model).
- CCNA v2.0 **4.1 / 4.2** (AAA client, SCP/SFTP), N10-009 **3.5-b3** (SSH), **4.3-b2** Change default passwords (the simulator has no default passwords; setting a secret is not "changing a default"), **4.1-b1** (IAM/encryption concepts).
- Type 8 / 9 passwords, TACACS+, RADIUS, `enable password` and `service password-encryption` are not implemented and earn nothing.

**Scores (computed by the unchanged `gen.mjs`; not forced to the estimate):**

| Score | Before → after |
|---|---|
| CCNA v1.1 Overall | 19.9% → **20.5%** (19.87 → 20.47, +0.60) |
| CCNA v1.1 Practical Lab | 29.2% → **30.8%** (29.17 → 30.84, +1.67) |
| CCNA v1.1 Verified-only | 13.7% → 13.7% (Lab 22.2% → 22.2%) |
| CCNA v1.1 Strict / Lenient | 17.3 / 23.0 → 17.7 / 23.9 (Lab 26.5 / 32.7 → 27.5 / 35.2) |
| CCNA v1.1 domain 5.0 | 0.0% / Lab 0.0% → 4.0% / Lab 10.0% |
| CCNA v1.1 confidence (floor ÷ coverage) | 69% / Lab 76% → 67% / Lab 72% |
| CCNA v2.0 Overall / Lab / Verified-only | 17.4 / 19.6 / 6.8 (unchanged) |
| N10-009 Overall / Lab / Verified-only | 20.7 / 28.4 / 16.0 (unchanged) |
| Shared (32 clusters) | 29.2% (unchanged) |

Item counts (CCNA v1.1): PARTIAL 18 → 19, MISSING 58 → 57; VERIFIED stays 18. The result matches the estimate in `CERT_P0_1_TECHNICAL_DESIGN.md` §7 (20.5 / 30.8) because the same single item changed, not because it was forced.

**Roadmap effect:** the stand-alone uplift of CERT-P0-1 falls from +3.9 / +6.9 to +3.3 / +5.3 (CCNA v1.1) because 0.40 of item 5.3 is already counted; the "Quick wins" tier rises from 23.7 / 31.8 to 24.3 / 33.5 for the same reason. Tiers from P0 upward are unchanged (5.3 is VERIFIED there).

**Evidence reference repair:** three `s.persist` references had gone stale after `3a27eef` shifted `src/core/persist.ts`: `validateLab()` l.211 → l.216, `serializeExport()` l.223 → l.242, `parseImport()` l.227 → l.246. Each function still does what the claim says (schema validation; JSON export with schemaVersion 1; import with app id and schemaVersion checks). Only the line numbers changed.

**Verification split.** Reproduced directly by this update (2026-11-16): local unit suite 855/855; production smoke11 (3/3) and smoke12 (1/1) against the live site (bundle `index-DwEygOnl.js`, 0 console or network issues). Reported by earlier gates and not re-run here: Linux CI run 43784316839 and main CI run 43784804302 (E2E 140/0/0/0; the unit count in CI is unverified because job logs need a login), deployment 7813043791, byte-identical production assets, production smoke 63/63, the 12-form synthetic-secret check on Cisco router, Cisco switch, ISP router, Aruba and PC, and the 2,029-entry fingerprint (computed in Node against the `51251c0` source, not against production).

**Limitations:**
- VERIFIED and PARTIAL describe simulator behaviour, not real-device fidelity. No real Cisco device or IOS image was used.
- Type 5 is MD5-crypt, checked against OpenSSL `passwd -1` vectors. Real IOS 15.x may use other types (8/9) for some commands; the three-attempt limit and the denial wording are simulator settings (Cisco's documentation consulted did not state them).
- The hotfix prevents the plaintext-secret exposure paths for new input. It does not remove plaintext saved earlier in browser storage or exported Lab files; rotate any real password that was typed.
- F-1 through F-7 and N-1 through N-4 remain open. `data/inventory.json` (107 specs) and `data/probe.json` (shows `enable secret` rejected) are historical snapshots at `dcbf4cb` and are kept unchanged. At `51251c0` the registry has 113 specs.
