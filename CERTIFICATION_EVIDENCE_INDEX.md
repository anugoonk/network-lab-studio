# Certification Evidence Index: Network Lab Studio

> **วันที่:** 2026-11-13
> **ประเภท:** read-only audit · ไม่ commit
> **สิ่งที่รวมไว้:** แหล่ง exam, สถานะ repo, หลักฐานจากซอร์สและ test, probe, ข้อสมมติ, ข้อจำกัด และวิธีทำซ้ำ
> **ใช้คู่กับ:** `CERTIFICATION_GAP_ANALYSIS.md`, `CCNA_OBJECTIVE_MATRIX.md`, `NETWORK_PLUS_OBJECTIVE_MATRIX.md`

## A. แหล่ง exam

| # | เอกสาร | URL | วันที่ดึง | sha256 | ประเภท |
|---:|---|---|---|---|---|
| A1 | CCNA Exam v1.1 (200-301) exam topics, © 2024 Cisco, 4 หน้า | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf | 2026-11-13 | `da15a22dda1afb61af1a14a53264eea6b87d81e8a3036dbaa69cb1b6260bebd5` | **ทางการ** |
| A2 | Implementing and Administering Cisco Solutions (200-301 CCNA) v2.0, © 2026 Cisco, 3 หน้า | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301_CCNA_v2.0_Exam_Topics_PDF.pdf | 2026-11-13 | `5f0bf00d2d459c1f2b52c54c9680fd7c5bb261b6842641a1f445fb0a0ca9923e` | **ทางการ** |
| A3 | หน้า exam CCNA (ระบุ exam 200-301 และลิงก์ "ccna-v1-1-exam-topics", ไม่มีวันที่ของ v2.0) | https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html | 2026-11-13 | — | ทางการ |
| A4 | Cisco Learning Network: CCNA v1.1 exam topics | https://learningnetwork.cisco.com/s/ccna-v1-1-exam-topics | 2026-11-13 | — | ทางการ · **render ด้วย fetch อัตโนมัติไม่ได้** (ใช้ A1 แทน) |
| A5 | วันที่ของ CCNA v2.0 (ประกาศ 2026-05-20, สอบ v1.1 ได้ถึง 2027-02-02, เริ่ม v2.0 2027-02-03) | ผลค้นหาจากบล็อกผู้ฝึกอบรม (เช่น smenode-academy.com, trainingcamp.com, ine.com) | 2026-11-13 | — | **แหล่งรอง ยังไม่ยืนยัน** |
| A6 | CompTIA Network+ N10-009 Exam Objectives v4.0, © 2023 CompTIA, 18 หน้า | https://onlc.com/comptia/n10-009-exam-objectives.pdf | 2026-11-13 | `2c6c73e412ee6e6c5827f3b231a8b6592286d9061918bf0dec97537473ac3e01` | เอกสารของ CompTIA ที่ **training partner โฮสต์ไว้** |
| A7 | หน้า Network+ (V9, N10-009, launch 2024-06-20, retire ประมาณ 2027, น้ำหนัก 23/20/19/14/24) | https://www.comptia.org/certifications/network | 2026-11-13 | — | **ทางการ** · ใช้ตรวจน้ำหนัก domain ใน A6 (ตรงกัน) |
| A8 | PDF บนโดเมนของ CompTIA (`partners.comptia.org/...n10-009-exam-objectives-(4-0).pdf`, `comptia.jp/pdf/...N10-009...pdf`) | — | 2026-11-13 | — | ตอบเป็น `text/html` ไม่ใช่ PDF **ใช้ไม่ได้** |

**การจัดการลิขสิทธิ์:** รายงานไม่ได้คัดลอกเอกสารทั้งฉบับ ข้อความของ objective ถอดความแบบย่อ คง ID และความหมายทางเทคนิค ไฟล์ที่ดาวน์โหลดเก็บใน scratchpad เท่านั้น (ไม่อยู่ใน repo)

**รายการที่ยังต้องยืนยันจากแหล่งทางการ:**
- วันที่ของ CCNA v2.0 (A5)
- ข้อความของ N10-009 เทียบกับ PDF ที่ CompTIA โฮสต์เอง (A6 มาจาก partner แต่ header/copyright และน้ำหนัก domain ตรงกับ A7)

## B. สถานะ repo ตอน audit

| รายการ | ค่า |
|---|---|
| Production / `origin/main` / `main` | `dcbf4cbeddcf28f47ef038f891730737ac396607` |
| Branch ที่รอ CI | `test/endpoint-e2e` = `3c9aed7298db3296830492bd364f2d456a24bf04` (test อย่างเดียว · ไม่ push) |
| Production asset | `index-Baola688.js` (HTTP 200) |
| Test ที่รันวันนี้ | tsc PASS · unit 725/725 · E2E 137/137 (main 132 + `3c9aed7` 5) · audit 197/220 regression 0 · fingerprint 2,029 identical · production smoke 58/58 (console error 0) |
| ไฟล์ที่ต้องปกป้อง | sha256 22/22 OK (`<scratchpad>/eod/protect-eod.sha`) |
| Test declaration ที่ extract ได้ | 534 รายการ (`tests/` 405 + `e2e/` 129 รวม `3c9aed7`) → `<scratchpad>/cert/test-titles.txt` · จำนวน test ที่รันจริงมากกว่านี้ (725/137) เพราะมี test ที่สร้างในลูป |

## C. Probe แบบ read-only (รันกับ engine จริง ไม่เขียนลง repo)

`<scratchpad>/audit/probe.test.ts` รันบน Lab "Inter-VLAN" (router R1):

| คำสั่ง | ผล | ใช้ตัดสิน |
|---|---|---|
| `ip route 172.31.5.5 255.255.255.255 10.0.0.2` | ok · `show ip route` แสดง `S 172.31.5.5 [1/0] via 10.0.0.2` ใต้ "172.31.0.0/32 is subnetted" | CCNA 3.3.c = IMPLEMENTED_UNVERIFIED |
| `ip route 172.31.6.0 255.255.255.0 10.0.0.2 200` | `% Invalid input detected at '^' marker.` | 3.3.d floating static = MISSING |
| `enable secret cisco` | Invalid input | 5.3, 4.8 = MISSING |
| `router ospf 1` | Invalid input | 3.4 = MISSING |
| `ipv6 unicast-routing` | Invalid input | 1.8, 1.9 = MISSING |
| `show cdp neighbors` | Invalid input (probe ที่ `dcbf4cb`) · **ตั้งแต่ `950fb0c` ใช้ได้** (CERT-Q4a, หัวข้อ J) | 2.3 = MISSING → **PARTIAL** หลัง CERT-Q4a |
| `show logging` | Invalid input | 4.5 = PARTIAL (มีแค่ข้อความ) |

**Inventory:** `<scratchpad>/audit/inventory.test.ts` dump `PROFILES`, `SPECS` และ `SAMPLES` ไปที่ `<scratchpad>/cert/inventory.json` (ตาราง E.2–E.4)

**Grep หา keyword** ทั่ว `src/` (ไม่รวม `i18n/en.ts`): `nat|overload`, `access-list|acl`, `ipv6`, `etherchannel|channel-group|lacp`, `ssh|crypto key`, `snmp`, `ntp`, `vpn`, `port-security`, `hsrp|vrrp`, `qos|dscp`, `errdisable` = **0 ไฟล์**
- `ospf`, `spanning`, `dhcp`, `dns`, `wireless` พบแค่ใน output text, comment หรือ guide ไม่ใช่พฤติกรรม (เช่น `pc.ts` l.29 "DHCP is always No", `sample.ts` l.371–374 "static routes instead of OSPF")

## D. ข้อสมมติ

| # | ข้อสมมติ | ผล | ทางเลือก |
|---:|---|---|---|
| D1 | คะแนนสถานะ 1/.75/.40/.15/.10/0 (ตามโจทย์) | ตัวเลขหลัก | strict/lenient ใน Gap Analysis 4.6 (±3–4 จุด) |
| D2 | ทุก topic น้ำหนักเท่ากันภายใน domain | **มีผลมากที่สุด** (เช่น CCNA 3.5 ≈ 5 จุด) | Cisco/CompTIA ไม่ได้ให้น้ำหนักระดับ topic |
| D3 | topic score = ค่าเฉลี่ยของ sub-topic/bullet | sub-topic เท่ากันภายใน topic | — |
| D4 | Lab relevance H=1, M=0.5, L=0 ตามกริยาของ objective | Lab score | ผู้สอนอาจจัดระดับต่างไป |
| D5 | derived item `3.3.v6` / `3.2.v6` แทนส่วน IPv6 ของ topic static routing | 3.3 = 0.55 แทน 0.69 | ไม่ใส่ derived item |
| D6 | uplift ของ roadmap = รายการที่ phase แก้กลายเป็น VERIFIED (upper bound) · topic ที่มีหลาย phase ให้เครดิตเฉพาะรายการที่ map ไว้ชัดเจน · Q2 ให้แค่ M→T สำหรับหัวข้อ L | ตาราง roadmap | — |
| D7 | หลักฐาน production ใช้ smoke ใน scratchpad (ไม่อยู่ใน repo) | ช่อง 16 ของ matrix | — |

## E. หลักฐานจาก repository

E.1 ใช้ร่วมกันใน matrix ทั้งสองไฟล์ · E.2–E.4 dump จากซอร์สโดยตรง

### E.1 Evidence dictionary (keys used in both matrices)

| Key | Evidence |
|---|---|
| `s.l2` | src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78 |
| `t.q3lpm` | tests/route-selection.test.ts:101, :110, :116, :127, :140, :147, :158, :174 -- CERT-Q3 A1-A8: real IOS CLI + trace/ping, overlapping prefixes, order independence, connected tie, missing route, down next-hop fallback, deterministic export/import; Cisco router only; no ECMP/AD/metric fidelity claim |
| `t.q3host` | tests/route-selection.test.ts:189, :200, :210, :217 -- CERT-Q3 B1-B4: exact /32 host selection vs neighbours, route/config output, unreachable next-hop fallback, invalid input leaves routes unchanged; IPv4 Cisco router only (IPv6 remains separately MISSING) |
| `t.q3link` | tests/link-messages.test.ts:65, :73, :81, :92, :109, :118, :125 -- CERT-Q3 C1-C7: existing IOS message format and real up/down happy paths; F-1 through F-5 unresolved, syslog stays PARTIAL |
| `s.l3` | src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| `s.ping` | src/core/network.ts — ping() l.711, trace() l.624 |
| `s.link` | src/core/network.ts — linkStatus() l.35, portLine() l.57 (up / down / admin-down / no-cable) |
| `s.l2t` | src/core/l2tables.ts — macTable() l.50, arpTable() l.74, duplicateIps() l.103 (steady-state model, header l.4-6) |
| `s.ip` | src/core/ip.ts — isValidMask() l.18, isHostAddress() l.46 (rejects 0.x, 127.x, >=224), subnetsOverlap() l.57, parseCidr() l.72 |
| `s.trunkchk` | src/core/trunkcheck.ts — nativeVlanMismatches() l.42, cdpMismatchLog() l.70 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| `s.cisco` | src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort) |
| `s.aruba` | src/core/cli/aruba.ts — 41 command specs |
| `s.pc` | src/core/cli/pc.ts — 8 specs (ipconfig, ipconfig /all, ping, tracert, tracert -h, arp -a, cls, help); "DHCP Enabled: No" (l.29) |
| `s.syslog` | src/core/cli/cisco.ts l.774 %LINK-5-CHANGED, l.785 %LINK-3-UPDOWN, l.207 %IP-4-DUPADDR (lines at 3e00c13; l.791, l.802, l.208 at 950fb0c); src/core/trunkcheck.ts l.8 %CDP-4-NATIVE_VLAN_MISMATCH |
| `s.prof` | src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| `s.chal` | src/core/challenge.ts — evaluateCheck() l.79; check kinds ping/link-up/config-line/trunk-vlan/port-admin/route/no-dup-ip (src/core/types.ts l.125-137) |
| `s.samples` | src/core/sample.ts — 10 sample Labs incl. 7 graded challenges; src/core/sampleGuides.ts |
| `s.persist` | src/core/persist.ts — validateLab() l.216, serializeExport() l.242, parseImport() l.246 (JSON, schemaVersion 1; baseline 51251c0 — they were l.211 / l.223 / l.227 at 950fb0c, shifted by CERT-P0-1a); withoutTransient() l.229 (a pending credential prompt is never stored or exported); optional security.enableSecret schema l.76 (type-5 hash only) |
| `s.secret` | src/core/secret.ts — md5() l.17, md5crypt() l.65, hashType5() l.102, verifyType5() l.107; TYPE5_RE l.62 (MD5-crypt "$1$<salt>$<22 chars>", synchronous) -- CERT-P0-1a, main 51251c0; byte compatibility with openssl passwd -1 vectors, not with a physical device |
| `s.enable` | src/core/cli/cisco.ts — setEnableSecret() l.23; registry specs cisco.enable (l.490, asks Password: when a secret exists), cisco.enable.secret / .secret.0 / .secret.5 (l.676-700), cisco.no.enable.secret (l.704); running-config line "enable secret 5 <hash>" (l.79) -- CERT-P0-1a, main 51251c0. Enable secret only: no enable password, username, line console/vty, login, SSH, service password-encryption |
| `s.credin` | src/core/cli/engine.ts — redactLine() l.53 (vendor-independent after fix1), answerPrompt() l.407 (hidden answer, ENABLE_ATTEMPTS = 3 simulator setting), executeLine() l.429; src/components/Console.tsx l.63, l.164 (type=password while a prompt is pending); src/store.ts l.553 (a secret answer is not written to the transcript) -- CERT-P0-1a + fix1, main 51251c0 |
| `s.ui` | src/components/Canvas.tsx, Palette.tsx, Console.tsx, Inspector.tsx, CommandLibrary.tsx, ChallengePanel.tsx, GuidePanel.tsx, FileManager.tsx |
| `t.vlan` | tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75; tests/network.test.ts:54, :72; tests/l3.test.ts:27 "VLANs stay isolated without a router path"; e2e/app.spec.ts:75 |
| `t.vlan1` | tests/cli.test.ts:81 "VLAN 1 cannot be deleted; …"; tests/cli-batch2.test.ts:90 "returns the port to VLAN 1 …" |
| `t.reserved` | tests/reserved-vlans.test.ts:26-64; tests/audit-phase-a.test.ts:140 |
| `t.trunk` | tests/l3.test.ts:38, :50, :62, :89, :103; tests/challenge.test.ts:131; e2e/app.spec.ts:339 |
| `t.native` | tests/l3.test.ts:70 "native VLAN: … a mismatch leaks VLANs"; tests/native-vlan.test.ts:68-167; e2e/native-vlan.spec.ts:4 |
| `t.intervlan` | tests/l3.test.ts:114-156 (router-on-a-stick), :244 "Aruba switch routes between VLANs when it is the gateway"; e2e/app.spec.ts:385, :410 |
| `t.svi` | tests/l3.test.ts:257, :268, :278, :294, :303, :311 |
| `t.routed` | tests/l3.test.ts:321, :332; tests/campus3.test.ts:23 "uses /31 routed links and SVI gateways"; tests/samples.test.ts:141 |
| `t.static` | tests/l3.test.ts:165, :182, :192, :206, :217; tests/campus3.test.ts:70; e2e/app.spec.ts:366 |
| `t.default` | tests/l3.test.ts:200 "default route S* is shown on R2" (asserts "Gateway of last resort is 10.0.0.1 …"); e2e/app.spec.ts:366 (asserts "Gateway of last resort is not set") |
| `t.ping` | tests/network.test.ts:21-150; tests/audit-phase-a.test.ts:77-194; e2e/app.spec.ts:26, :99 |
| `t.trace` | tests/traceroute.test.ts:118-223; tests/endpoint-devices.test.ts:92; e2e/endpoint-routing.spec.ts:147 (3c9aed7) |
| `t.arp` | tests/l2tables.test.ts:79, :90; tests/samples.test.ts:42; e2e/l2.spec.ts:48; e2e/endpoint-routing.spec.ts:164 (3c9aed7) |
| `t.mac` | tests/l2tables.test.ts:29 "SW1 learns PC-A locally …"; e2e/l2.spec.ts:48 |
| `t.dup` | tests/l2tables.test.ts:120, :128; tests/challenge.test.ts:165; tests/cli-batch2.test.ts:160; e2e/l2.spec.ts:20; e2e/challenges-more.spec.ts:39 |
| `t.ipval` | tests/cli.test.ts:49 "router rejects bad mask, overlapping subnet …"; tests/l3.test.ts:311, :321; e2e/app.spec.ts:113 |
| `t.gw` | tests/network.test.ts:80, :116, :125, :133; tests/l3.test.ts:278, :294; e2e/app.spec.ts:99; e2e/endpoint-routing.spec.ts:180 (3c9aed7) |
| `t.ipconfig` | tests/cli-batch2.test.ts:136, :173; tests/network.test.ts:186; e2e/endpoint-devices.spec.ts:100; e2e/endpoint-routing.spec.ts:204 (3c9aed7) |
| `t.showif` | tests/cli.test.ts:37, :70, :134; tests/cli-batch2.test.ts:54, :76; tests/l3.test.ts:145 |
| `t.link` | tests/network.test.ts:30, :45, :150; tests/challenge.test.ts:60, :145; e2e/app.spec.ts:26 |
| `t.config` | tests/cli.test.ts:20, :98 "write memory fills startup-config", :104; tests/challenge.test.ts:117; tests/persist.test.ts:10; e2e/safety.spec.ts:14; e2e/app.spec.ts:216, :234 |
| `t.cli` | tests/cli.test.ts:11, :27, :89, :182, :192, :209, :214 (every registry example executed on every supported device kind) |
| `t.chal` | tests/challenge.test.ts:12, :30, :46; tests/campus3.test.ts:93; e2e/challenge.spec.ts:19, :56; e2e/challenges-more.spec.ts:24-92; e2e/l2.spec.ts:68; e2e/hints-tab.spec.ts:8 |
| `t.addrchal` | tests/samples.test.ts:151 "Challenge 5: addressing faults" (dot1Q, PC mask /30, WAN IP) |
| `t.campus3` | tests/campus3.test.ts:13-93; e2e/campus3.spec.ts:3 |
| `t.diagram` | tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf); tests/diagram-devices.test.ts:59, :73, :91, :109; e2e/diagram-devices.spec.ts:104 |
| `t.endpoint` | tests/endpoint-devices.test.ts:74, :92, :112; tests/device-capability.test.ts:136 (server = IP host only); e2e/endpoint-devices.spec.ts:100 |
| `t.loop` | tests/network.test.ts:159 "a layer-2 loop does not hang the engine" (no STP / no storm modelled); tests/traceroute.test.ts:223 |
| `t.ttl` | tests/audit-phase-a.test.ts:77-104 (TTL 128/125/255/64 per routers crossed) |
| `t.syslog` | tests/l2tables.test.ts:120 (%IP-4-DUPADDR); tests/native-vlan.test.ts:150, :167 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| `t.topo` | tests/network.test.ts:9; e2e/app.spec.ts:124, :161, :174; e2e/devices.spec.ts:21 |
| `t.range` | tests/range.test.ts:15-172; e2e/features2.spec.ts:21, :35 |
| `s.cdp` | src/core/cli/cdp.ts — neighbors() l.25 (physical Lab.links, both ports operationally up via linkStatus(), Cisco IOS kinds only), entryAddress() l.43, showCdpNeighbors() l.53; registry specs cisco.show.cdp.neighbors / .detail in src/core/cli/cisco.ts (privileged EXEC) -- CERT-Q4a, main 950fb0c; read-only topology view: no CDP advertisements, timers/holdtime, CDP/LLDP configuration or LLDP |
| `t.secret` | tests/secret.test.ts:21, :35, :45 (RFC 1321 MD5 vectors, type-5 verify, random 4-char salt); tests/enable-secret.test.ts:51, :63, :78, :96, :106, :116, :129, :139, :151, :166, :175, :183, :200, :205, :224, :242, :252, :269 -- CERT-P0-1a at 51251c0: enable without a secret unchanged, Password: prompt, right/wrong/3 wrong answers, disable, hidden answer is never a command, Catalyst + ISP router, running-config hash only, secret 0 / 5 forms, no enable secret, non-Cisco rejection, history/echo/error masking, localStorage + workspace + export + import, 40 randomised secrets, legacy Labs |
| `t.secfix` | tests/enable-secret-all-devices.test.ts:39, :49, :72, :82, :92, :106, :121 -- CERT-P0-1a fix1 (33 unit tests): redaction on every vendor, Cisco/Aruba/PC/IP endpoint kinds, no-CLI kinds, store transcript, Cisco authentication unchanged; with the 3a27eef engine put back 22 of 33 fail |
| `t.secretE2E` | e2e/enable-secret.spec.ts:8; e2e/enable-secret-unsupported.spec.ts:11 -- CERT-P0-1a + fix1 in a real browser: hidden Password:, wrong then right answer, nothing on screen / history / storage; Aruba + PC reject and the raw secret is absent from screen, history, storage, export and after reload |
| `t.cdp` | tests/cdp.test.ts:50, :56, :103, :111, :121, :131, :147, :158, :188, :197, :219, :237; e2e/cdp.spec.ts:6 -- CERT-Q4a (33 unit + 1 E2E, real executeLine on real topology): local/remote ports, orientation, operational state not inferred from local admin, unplug/reconnect, unsupported kinds and patch panel excluded, detail IP/version without invented data, deterministic export/import, mode/do/help/Tab, LLDP/cdp config rejected |
| `p.cdp` | Main CI run 43377797700 (950fb0c: npm test success, E2E 138/138, deploy success) · Pages deployment 7758721759 · production smoke10 (scratchpad, live site, 2026-11-13): UI-built R1-SW1-R2 topology, summary/detail ports, shutdown removes the neighbor, PC/Aruba/IP phone excluded, AOS-CX rejects the command |
| `p.p01a` | CERT-P0-1a + fix1 at main = production 51251c0. REPORTED by the gates (logs of CI are not readable without login, so the unit count in CI is unverified): Linux CI run 43784316839 (ci/cert-p0-1a-fix1) and main CI run 43784804302 — build ok, E2E 140 passed / 0 failed / 0 flaky / 0 skipped, deploy ok · Pages deployment 7813043791 · production JS/CSS/HTML byte-identical to a clean build of 51251c0 · production smoke 63/63 (58 + CDP 1 + enable secret 3 + all-device security 1; 0 console errors, 0 failed requests) · synthetic-secret check of 12 input forms on Cisco router, Cisco switch, ISP router, Aruba switch, PC. REPRODUCED DIRECTLY by this evidence update (2026-11-16): local unit suite 855/855; production smoke11 3/3 and smoke12 1/1 against the live site (bundle index-DwEygOnl.js). Simulator behaviour only: no real Cisco hardware or IOS image was used |
| `p.smoke` | Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |

### E.2 Device catalog (dumped from `PROFILES` at dcbf4cb)

| Kind | Label | Vendor | simLevel | CLI | Host | Forwards | Ports |
|---|---|---|---|:-:|:-:|:-:|---:|
| cisco-router | Cisco IOS Router | cisco | full | ✓ | — | ✓ | 3 |
| cisco-switch | Cisco IOS Access Switch | cisco | full | ✓ | — | — | 26 |
| aruba-switch | HPE Aruba AOS-CX Access Switch | aruba | full | ✓ | — | ✓ | 24 |
| l3-switch | Layer 3 Switch (Distribution) | aruba | full | ✓ | — | ✓ | 28 |
| pc | PC | pc | full | ✓ | ✓ | — | 1 |
| laptop | Laptop | pc | full | ✓ | ✓ | — | 1 |
| server | Server | pc | partial | ✓ | ✓ | — | 1 |
| printer | เครื่องพิมพ์เครือข่าย (Printer) | pc | partial | ✓ | ✓ | — | 1 |
| ip-camera | กล้อง IP (IP Camera) | pc | partial | ✓ | ✓ | — | 1 |
| ip-phone | โทรศัพท์ IP (IP Phone) | pc | partial | ✓ | ✓ | — | 1 |
| nvr | เครื่องบันทึกภาพ (NVR) | pc | partial | ✓ | ✓ | — | 1 |
| nas | ที่เก็บข้อมูลเครือข่าย (NAS) | pc | partial | ✓ | ✓ | — | 1 |
| wireless-ap | Wireless Access Point | generic | diagram | — | — | — | 1 |
| firewall | Firewall | generic | diagram | — | — | — | 3 |
| isp-router | ISP Router / WAN | cisco | full | ✓ | — | ✓ | 2 |
| internet-cloud | อินเทอร์เน็ต (Cloud) | generic | diagram | — | — | — | 4 |
| patch-panel | แผงพักสาย (Patch Panel) | generic | diagram | — | — | — | 24 |
| rack | ตู้ Rack | generic | diagram | — | — | — | 0 |
| ups | เครื่องสำรองไฟ (UPS) | generic | diagram | — | — | — | 0 |

### E.3 CLI registry (all 107 specs, dumped from `SPECS` at dcbf4cb)

| # | Vendor | Topic | Modes | Syntax | Device kinds |
|---:|---|---|---|---|---|
| 1 | cisco | Mode | user | `enable` | cisco-router, isp-router, cisco-switch |
| 2 | cisco | Mode | priv | `disable` | cisco-router, isp-router, cisco-switch |
| 3 | cisco | Mode | priv | `configure terminal` | cisco-router, isp-router, cisco-switch |
| 4 | cisco | Mode | user, priv, config, config-if, config-subif, config-svi, config-vlan | `exit` | cisco-router, isp-router, cisco-switch |
| 5 | cisco | Mode | config, config-if, config-subif, config-svi, config-vlan | `end` | cisco-router, isp-router, cisco-switch |
| 6 | cisco | Troubleshooting | config, config-if, config-subif, config-svi, config-vlan | `do <command>` | cisco-router, isp-router, cisco-switch |
| 7 | cisco | Config | priv | `show running-config` | cisco-router, isp-router, cisco-switch |
| 8 | cisco | Config | priv | `show startup-config` | cisco-router, isp-router, cisco-switch |
| 9 | cisco | Troubleshooting | user, priv | `show version` | cisco-router, isp-router, cisco-switch |
| 10 | cisco | Interface | user, priv | `show ip interface brief` | cisco-router, isp-router, cisco-switch |
| 11 | cisco | Layer 2 | user, priv | `show ip arp` | cisco-router, isp-router, cisco-switch |
| 12 | cisco | Layer 2 | user, priv | `show mac address-table` | cisco-switch |
| 13 | cisco | IP | user, priv | `show ip route` | cisco-router, isp-router |
| 14 | cisco | IP | user, priv | `show ip route` | cisco-switch |
| 15 | cisco | Interface | user, priv | `show interfaces` | cisco-router, isp-router, cisco-switch |
| 16 | cisco | Interface | user, priv | `show interfaces <interface>` | cisco-router, isp-router, cisco-switch |
| 17 | cisco | Interface | user, priv | `show interfaces vlan <vlan-id>` | cisco-switch |
| 18 | cisco | Interface | user, priv | `show interfaces status` | cisco-switch |
| 19 | cisco | VLAN | user, priv | `show interfaces trunk` | cisco-switch |
| 20 | cisco | VLAN | user, priv | `show vlan brief` | cisco-switch |
| 21 | cisco | Troubleshooting | user, priv | `ping <ip-address>` | cisco-router, isp-router, cisco-switch |
| 22 | cisco | Troubleshooting | user, priv | `traceroute <ip-address>` | cisco-router, isp-router, cisco-switch |
| 23 | cisco | Config | priv | `write memory` | cisco-router, isp-router, cisco-switch |
| 24 | cisco | Config | priv | `copy running-config startup-config` | cisco-router, isp-router, cisco-switch |
| 25 | cisco | Config | config | `hostname <hostname>` | cisco-router, isp-router, cisco-switch |
| 26 | cisco | Interface | config, config-if, config-subif | `interface <interface>` | cisco-router, isp-router |
| 27 | cisco | Interface | config | `no interface <interface>` | cisco-router, isp-router |
| 28 | cisco | Interface | config, config-if, config-svi, config-vlan | `interface <interface>` | cisco-switch |
| 29 | cisco | Interface | config, config-if, config-svi, config-vlan | `interface range <port-range>` | cisco-switch |
| 30 | cisco | IP | config, config-if, config-svi, config-vlan | `interface vlan <vlan-id>` | cisco-switch |
| 31 | cisco | IP | config | `no interface vlan <vlan-id>` | cisco-switch |
| 32 | cisco | VLAN | config, config-if, config-svi, config-vlan | `vlan <vlan-id>` | cisco-switch |
| 33 | cisco | VLAN | config | `no vlan <vlan-id>` | cisco-switch |
| 34 | cisco | VLAN | config-vlan | `name <name>` | cisco-switch |
| 35 | cisco | IP | config | `ip default-gateway <ip-address>` | cisco-switch |
| 36 | cisco | IP | config | `no ip default-gateway` | cisco-switch |
| 37 | cisco | IP | config | `ip route <network> <route-mask> <next-hop>` | cisco-router, isp-router |
| 38 | cisco | IP | config | `no ip route <network> <route-mask> <next-hop>` | cisco-router, isp-router |
| 39 | cisco | Interface | config-if, config-subif, config-svi | `shutdown` | cisco-router, isp-router, cisco-switch |
| 40 | cisco | Interface | config-if, config-subif, config-svi | `no shutdown` | cisco-router, isp-router, cisco-switch |
| 41 | cisco | Interface | config-if, config-subif, config-svi | `description <text>` | cisco-router, isp-router, cisco-switch |
| 42 | cisco | Interface | config-if, config-subif, config-svi | `no description` | cisco-router, isp-router, cisco-switch |
| 43 | cisco | VLAN | config-if | `switchport mode access` | cisco-switch |
| 44 | cisco | VLAN | config-if | `switchport mode trunk` | cisco-switch |
| 45 | cisco | VLAN | config-if | `switchport access vlan <vlan-id>` | cisco-switch |
| 46 | cisco | VLAN | config-if | `no switchport access vlan` | cisco-switch |
| 47 | cisco | VLAN | config-if | `switchport trunk allowed vlan <vlan-list>` | cisco-switch |
| 48 | cisco | VLAN | config-if | `switchport trunk allowed vlan all` | cisco-switch |
| 49 | cisco | VLAN | config-if | `switchport trunk allowed vlan add <vlan-list>` | cisco-switch |
| 50 | cisco | VLAN | config-if | `switchport trunk allowed vlan remove <vlan-list>` | cisco-switch |
| 51 | cisco | VLAN | config-if | `switchport trunk native vlan <vlan-id>` | cisco-switch |
| 52 | cisco | VLAN | config-if | `no switchport trunk allowed vlan` | cisco-switch |
| 53 | cisco | VLAN | config-if | `no switchport trunk native vlan` | cisco-switch |
| 54 | cisco | VLAN | config-subif | `encapsulation dot1Q <vlan-id>` | cisco-router, isp-router |
| 55 | cisco | IP | config-if, config-subif | `ip address <ip-address> <subnet-mask>` | cisco-router, isp-router |
| 56 | cisco | IP | config-svi | `ip address <ip-address> <subnet-mask>` | cisco-switch |
| 57 | cisco | IP | config-if, config-subif | `no ip address` | cisco-router, isp-router |
| 58 | cisco | IP | config-svi | `no ip address` | cisco-switch |
| 59 | aruba | Mode | priv | `configure terminal` | aruba-switch, l3-switch |
| 60 | aruba | Mode | priv, config, config-if, config-svi, config-vlan | `exit` | aruba-switch, l3-switch |
| 61 | aruba | Mode | config, config-if, config-svi, config-vlan | `end` | aruba-switch, l3-switch |
| 62 | aruba | Troubleshooting | config, config-if, config-svi, config-vlan | `do <command>` | aruba-switch, l3-switch |
| 63 | aruba | Config | priv | `show running-config` | aruba-switch, l3-switch |
| 64 | aruba | Config | priv | `show startup-config` | aruba-switch, l3-switch |
| 65 | aruba | Troubleshooting | priv | `show version` | aruba-switch, l3-switch |
| 66 | aruba | Interface | priv | `show interface brief` | aruba-switch, l3-switch |
| 67 | aruba | Interface | priv | `show interface <interface>` | aruba-switch, l3-switch |
| 68 | aruba | VLAN | priv | `show vlan` | aruba-switch, l3-switch |
| 69 | aruba | IP | priv | `show ip interface brief` | aruba-switch, l3-switch |
| 70 | aruba | Layer 2 | priv | `show arp` | aruba-switch, l3-switch |
| 71 | aruba | Layer 2 | priv | `show mac-address-table` | aruba-switch, l3-switch |
| 72 | aruba | IP | priv | `show ip route` | aruba-switch, l3-switch |
| 73 | aruba | Troubleshooting | priv | `ping <ip-address>` | aruba-switch, l3-switch |
| 74 | aruba | Troubleshooting | priv | `traceroute <ip-address>` | aruba-switch, l3-switch |
| 75 | aruba | Troubleshooting | priv | `traceroute <ip-address> maxttl <max-hops>` | aruba-switch, l3-switch |
| 76 | aruba | Config | priv | `write memory` | aruba-switch, l3-switch |
| 77 | aruba | Config | priv | `copy running-config startup-config` | aruba-switch, l3-switch |
| 78 | aruba | Config | config | `hostname <hostname>` | aruba-switch, l3-switch |
| 79 | aruba | VLAN | config, config-if, config-svi, config-vlan | `vlan <vlan-id>` | aruba-switch, l3-switch |
| 80 | aruba | VLAN | config | `no vlan <vlan-id>` | aruba-switch, l3-switch |
| 81 | aruba | VLAN | config-vlan | `name <name>` | aruba-switch, l3-switch |
| 82 | aruba | Interface | config, config-if, config-svi, config-vlan | `interface <interface>` | aruba-switch, l3-switch |
| 83 | aruba | Interface | config, config-if, config-svi, config-vlan | `interface <if-range>` | aruba-switch, l3-switch |
| 84 | aruba | IP | config, config-if, config-svi, config-vlan | `interface vlan <vlan-id>` | aruba-switch, l3-switch |
| 85 | aruba | IP | config | `no interface vlan <vlan-id>` | aruba-switch, l3-switch |
| 86 | aruba | IP | config | `ip route <prefix> <next-hop>` | aruba-switch, l3-switch |
| 87 | aruba | IP | config | `no ip route <prefix> <next-hop>` | aruba-switch, l3-switch |
| 88 | aruba | Interface | config-if, config-svi | `shutdown` | aruba-switch, l3-switch |
| 89 | aruba | Interface | config-if, config-svi | `no shutdown` | aruba-switch, l3-switch |
| 90 | aruba | VLAN | config-if | `no routing` | aruba-switch, l3-switch |
| 91 | aruba | VLAN | config-if | `routing` | aruba-switch, l3-switch |
| 92 | aruba | VLAN | config-if | `vlan access <vlan-id>` | aruba-switch, l3-switch |
| 93 | aruba | VLAN | config-if | `vlan trunk allowed <vlan-list>` | aruba-switch, l3-switch |
| 94 | aruba | VLAN | config-if | `no vlan trunk allowed <vlan-list>` | aruba-switch, l3-switch |
| 95 | aruba | VLAN | config-if | `vlan trunk allowed all` | aruba-switch, l3-switch |
| 96 | aruba | VLAN | config-if | `vlan trunk native <vlan-id>` | aruba-switch, l3-switch |
| 97 | aruba | IP | config-if, config-svi | `ip address <cidr>` | aruba-switch, l3-switch |
| 98 | aruba | IP | config-if, config-svi | `no ip address` | aruba-switch, l3-switch |
| 99 | aruba | Interface | config-if, config-svi | `description <text>` | aruba-switch, l3-switch |
| 100 | pc | IP | pc | `ipconfig` | pc, laptop, server +5 |
| 101 | pc | IP | pc | `ipconfig /all` | pc, laptop, server +5 |
| 102 | pc | Troubleshooting | pc | `ping <ipv4>` | pc, laptop, server +5 |
| 103 | pc | Troubleshooting | pc | `tracert <ipv4>` | pc, laptop, server +5 |
| 104 | pc | Troubleshooting | pc | `tracert -h <max-hops> <ipv4>` | pc, laptop, server +5 |
| 105 | pc | Layer 2 | pc | `arp -a` | pc, laptop, server +5 |
| 106 | pc | Troubleshooting | pc | `cls` | pc, laptop, server +5 |
| 107 | pc | Troubleshooting | pc | `help` | pc, laptop, server +5 |

### E.4 Sample Labs and challenge check kinds (dumped from `SAMPLES`)

| Key | Name | Devices | Check kinds |
|---|---|---:|---|
| office | Small Office – Cisco & Aruba | 13 | — (not a challenge) |
| intervlan | Inter-VLAN Routing – Trunk, Router-on-a-Stick & Static Route | 9 | — (not a challenge) |
| campus3 | Campus 3 Tier – Aruba CX (static route) | 7 | — (not a challenge) |
| trouble | Challenge: Troubleshooting – ออฟฟิศ Inter-VLAN เสีย | 9 | ping, link-up, no-dup-ip |
| dupip | Challenge: IP ซ้ำ + VLAN ผิด + พอร์ตปิด – Small Office | 13 | ping, no-dup-ip |
| campus | Challenge: Campus + ISP – L3 Switch, Server, AP | 7 | ping, link-up, no-dup-ip |
| campus3trouble | Challenge: Campus 3 Tier – Aruba CX | 7 | ping, link-up, no-dup-ip |
| addressing | Challenge: Subnet / Encapsulation / WAN IP – Inter-VLAN | 9 | ping, link-up, no-dup-ip |
| layer2 | Challenge: VLAN / Trunk – Inter-VLAN | 9 | ping, link-up, no-dup-ip |
| scratch | Challenge: สร้างเครือข่าย 2 VLAN จากศูนย์ | 6 | port-admin, trunk-vlan, ping, no-dup-ip |

## F. ข้อจำกัดของการตรวจ

1. **VERIFIED ≠ ความเหมือนอุปกรณ์จริง:** test ทดสอบ simulator ตาม model ของตัวเอง
   - output ของ IOS/AOS-CX เขียนตามความรู้และตรวจกับเอกสาร Cisco ได้บางส่วน
   - เอกสาร AOS-CX ตอบ 403 (README ของโปรเจกต์ระบุไว้)
   - E2E ของ `3c9aed7` เทียบ UI กับ engine ซึ่งใช้โค้ดชุดเดียวกัน
2. **model แบบ steady-state:** ARP/MAC ไม่เรียนรู้จาก traffic · L2 loop ไม่ทำให้เกิด storm (`tests/network.test.ts:159`) · ไม่มีเวลา/latency
3. **Terminal ของ host ทุกชนิดเป็นแบบ Windows**
4. **ตรวจเฉพาะ Chromium** (Playwright)
5. **หลักฐาน production** มาจาก smoke script ใน scratchpad (temp) ไม่ได้อยู่ใน repo และ CI ไม่ได้รัน
6. **การจัด Lab relevance (H/M/L) และสถานะ PARTIAL** เป็นการตัดสินของผู้ audit มีเหตุผลกำกับทุกรายการใน matrix แต่ผู้สอนอาจเห็นต่างได้
7. **CCNA v2.0:** ยังไม่เป็น exam ที่ใช้สอบ · วันที่มาจากแหล่งรอง · card ใน matrix เป็นแบบย่อ

## G. วิธีทำซ้ำ

**ไฟล์อยู่ใน scratchpad ของ session:** `<session-scratchpad>\cert\` (path ในเครื่องถูกตัดออกจากสำเนาที่ commit; temp อาจหาย)

| ไฟล์ | หน้าที่ |
|---|---|
| `model.mjs` | objective ทุกข้อของ 3 exam, สถานะ, evidence key, relevance, phase, คะแนนสถานะ 3 ชุด |
| `gen.mjs` | คำนวณ Overall / Lab / verified-only / strict / lenient / uplift แล้วสร้าง `CCNA_OBJECTIVE_MATRIX.md`, `NETWORK_PLUS_OBJECTIVE_MATRIX.md`, `scores.json` (`node gen.mjs <outDir>`) |
| `qc.mjs` | ตรวจจำนวน objective, ID ซ้ำ, ผลรวมน้ำหนัก และตรวจว่า evidence reference ทุกตัวมีจริง |
| `evidx.mjs` | สร้างตาราง E.1–E.4 ของไฟล์นี้จาก `model.mjs` และ `inventory.json` |
| `inventory.json`, `probe.json`, `test-titles.txt`, `evidence-grep.txt` | ข้อมูลดิบ |
| `dl/` | PDF ทางการที่ดาวน์โหลด (A1, A2, A6) |

**ถ้า scratchpad หาย:** คำนวณซ้ำด้วยมือได้จากตาราง compact matrix (สถานะและคะแนนทุกรายการ) + สูตรใน `CERTIFICATION_GAP_ANALYSIS.md` หัวข้อ 4.3

ตัวอย่าง CCNA v1.1 domain 3.0:
- topic score: 3.1 = (0.4+1+1+1+0.4+0.4+1)/7 = 0.743 · 3.2 = (1+0.4+0)/3 = 0.467 · 3.3 = (1+1+1+0+0)/5 = 0.600 · 3.4 = 0 · 3.5 = 0
- domain = (0.743+0.467+0.600+0+0)/5 = **0.362 = 36.2%** ✔
- Lab: rel 3.1=M, 3.2=M, 3.3=H, 3.4=H, 3.5=L → (0.5×0.743 + 0.5×0.467 + 1×0.600 + 1×0) / 3 = **0.402** ✔

## H. ผล Quality control

| ตรวจ | ผล |
|---|---|
| objective ครบตามเอกสาร | ✅ CCNA v1.1: 6 domain, 53 topic, 58 sub-topic ทางการ (+1 derived) · v2.0: 5 domain, 29 topic · N+: 5 domain, 25 objective, 210 bullet |
| ID ไม่ซ้ำ | ✅ 112 / 60 / 235 ID ซ้ำ 0 |
| ผลรวมน้ำหนัก domain | ✅ 100 / 100 / 100 (ตรงกับ A1, A2, A6/A7) |
| evidence reference | ✅ **209 รายการ ปัญหา 0** หลัง CERT-Q4a (เดิม 193 หลัง CERT-Q3) (มีไฟล์จริง · `file:line` ของ test ชี้ที่ `it(`/`test(`/`describe(` · "function() l.N" อยู่บรรทัดนั้นจริง · ไฟล์ของ `3c9aed7` อ่านด้วย `git show 3c9aed7:<path>`) |
| ฟีเจอร์ที่ไม่มีถูกนับเป็น VERIFIED | ไม่มี: ทุกคำสั่งที่ probe ปฏิเสธได้ MISSING · อุปกรณ์ diagram ได้แค่ DIAGRAM_ONLY |
| UNKNOWN | 0 รายการ |

## I. CERT-Q3 evidence update (2026-11-13)

Baseline main and remote main verified at `3e00c136dc328193ecd39e2315eb312b8a37a817`. Earlier repo/probe/test-title snapshots above are historical. Current authoritative reproduction package: `certification-audit/README.md`; run `node certification-audit/scripts/verify.mjs`.

Only CCNA v1.1 3.2.a / 3.3.c, v2.0 3.2.c, and N10-009 2.1-b4 change from IMPLEMENTED_UNVERIFIED to VERIFIED. See `t.q3lpm`, `t.q3host`, `t.q3link` in generated E.1 and `CERT_Q3_TEST_REPORT.md` section 6. CERT-Q3 tests rerun: 19/19 PASS. VERIFIED means tested simulator behaviour, not full IOS fidelity. No Aruba-specific LPM or /32 test, IPv6/floating static/ECMP remain unsupported, and F-1 through F-7 remain open. Syslog remains PARTIAL. No other classifications or weights changed.

## J. CERT-Q4a evidence update (2026-11-13)

Baseline: main = remote main = production `950fb0c5639a4e0df1b24e30a71341c0438be468` (Pages deployment 7758721759).

**New evidence keys in E.1:**
- `s.cdp`: `src/core/cli/cdp.ts` `neighbors()` l.25, `entryAddress()` l.43 and `showCdpNeighbors()` l.53, plus the registry specs in `cisco.ts`.
- `t.cdp`: 12 `tests/cdp.test.ts` declarations (33 tests in total) and `e2e/cdp.spec.ts:6`.
- `p.cdp`: main CI 43377797700 with E2E 138/138, deployment 7758721759, and the production CDP smoke built on the live site.

**How the evidence was checked:**
- The tests call the real `executeLine` on real topologies; nothing is mocked.
- Key assertions:
  - local and remote port strings (`:50`, `:56`)
  - no neighbor when only the local side is admin up (`:103`)
  - unplug and reconnect (`:111`)
  - every unsupported kind is excluded (`:121`), including through a patch panel (`:131`)
  - no invented IP (`:158`)
  - empty output (`:188`)
  - export/import determinism (`:197`)
  - privileged EXEC, `do`, help and Tab (`:219`)
  - LLDP, `cdp run` and logging are rejected (`:237`)

**Classification:**
- MISSING → PARTIAL: CCNA v1.1 2.3, CCNA v2.0 2.3, N10-009 5.5-b10, and the shared cluster CDP/LLDP.
- Nothing became VERIFIED, because LLDP and CDP/LLDP configuration are missing and the objectives require them.
- N10-009 3.2-b8 (network discovery) and syslog were reviewed and left unchanged.
- The decision record and before/after scores are in `CERTIFICATION_GAP_ANALYSIS.md` §12.

**Historical snapshots (kept unchanged):**
- Section C (probe), E.2 and E.3 (107 specs) were taken at `dcbf4cb`.
- At `950fb0c` the registry has 109 specs, the 2 new ones being Cisco `show cdp neighbors` and `show cdp neighbors detail`.
- `s.cisco` and `s.syslog` now state which commit their line numbers refer to, because `cisco.ts` shifts by +1 or +17 at `950fb0c`.

**Limits:**
- These statuses describe simulator behaviour, not real-device fidelity.
- CDP is a read-only topology view: no advertisements, holdtime or timers, no interface filter, and privileged EXEC only.
- F-1 through F-7 remain open.

## K. CERT-P0-1a evidence update (2026-11-16)

Evidence is from main = production `51251c0` (enable secret `3a27eef` + redaction hotfix `51251c0`).

**New evidence keys (see E.1):**
- Source: `s.secret` (MD5-crypt type 5), `s.enable` (Cisco specs, `enable` prompt, running-config line), `s.credin` (credential prompt, redaction, masked input), `s.persist` (repaired line numbers, `withoutTransient`, optional `security` schema).
- Unit tests: `t.secret` (`tests/secret.test.ts`, `tests/enable-secret.test.ts`), `t.secfix` (`tests/enable-secret-all-devices.test.ts`, 33 tests).
- E2E: `t.secretE2E` (`e2e/enable-secret.spec.ts`, `e2e/enable-secret-unsupported.spec.ts`).
- Production: `p.p01a` (CI, deployment, smoke; separates reported results from the ones reproduced by this update).

**Repaired references:** `s.persist` `validateLab()` l.211 → l.216, `serializeExport()` l.223 → l.242, `parseImport()` l.227 → l.246. The claim ("JSON, schemaVersion 1") is unchanged and still true.

**Classification:**
- MISSING → PARTIAL: CCNA v1.1 5.3 only. It requires enable secret, line console/vty passwords, login local and username; only enable secret exists.
- CCNA v1.1 4.8 text corrected (it said "enable secret rejected"); status MISSING unchanged. No other objective, cluster, weight or formula changed.
- The decision record and before/after scores are in `CERTIFICATION_GAP_ANALYSIS.md` §13.

**Historical snapshots (kept unchanged):** section C (probe), E.2 and E.3 (107 specs) were taken at `dcbf4cb`; the probe still shows `enable secret` rejected. At `51251c0` the registry has 113 specs (+4 enable-secret specs and +2 CDP specs since `dcbf4cb`).

**Limits:** simulator behaviour, not real-device fidelity; no real Cisco hardware or IOS image; attempt count and denial wording are simulator settings; the hotfix does not remove plaintext saved before it (browser storage, old exports).
