# CCNA Objective Matrix — Network Lab Studio

> Generated 2026-11-13 from `certification-audit/scripts/model.mjs` by `gen.mjs`. Audit evidence at main `950fb0c` (CERT-Q4a CDP evidence update; CERT-Q3 at `3e00c13`).
> **Exam:** Cisco CCNA 200-301 **v1.1** — https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf (official, © 2024 Cisco, retrieved 2026-11-13, sha256 da15a22d…bd5)
> **Separate model:** Cisco CCNA 200-301 **v2.0** (section B) — https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301_CCNA_v2.0_Exam_Topics_PDF.pdf (official, © 2026 Cisco, retrieved 2026-11-13, sha256 5f0bf00d…923e). v1.1 and v2.0 are never mixed in one score.
> Objective wording is **paraphrased**; IDs, hierarchy and weights are official. Sub-objective `3.3.v6` is a **derived** item (the official 3.3 covers IPv4 *and* IPv6).

## Status definitions and scores (identical in all certification reports)

| Status | Meaning | Score (proposed) | Strict | Lenient |
|---|---|---:|---:|---:|
| VERIFIED | Behaviour exists and an automated test exercises it against the real engine | 1.00 | 1.00 | 1.00 |
| IMPLEMENTED_UNVERIFIED | Behaviour exists (verified by reading code / a read-only probe) but no test asserts it | 0.75 | 0.50 | 1.00 |
| PARTIAL | Only part of the required behaviour exists | 0.40 | 0.25 | 0.60 |
| DIAGRAM_ONLY | Can be drawn / cabled, not simulated | 0.15 | 0.00 | 0.25 |
| THEORY_ONLY | Explained in the app, cannot be practised | 0.10 | 0.00 | 0.20 |
| MISSING | No meaningful implementation | 0.00 | 0.00 | 0.00 |
| UNKNOWN | Evidence insufficient — excluded from numerator and denominator, reported separately | — | — | — |

These scores are audit assumptions, not official certification scoring. **VERIFIED ≠ real-device fidelity**: it means the simulator's behaviour is exercised by tests; the simulator itself is an approximation of IOS / AOS-CX / Windows.

**Lab relevance:** H = hands-on configure/verify/troubleshoot (weight 1.0), M = interpret/observe behaviour (0.5), L = describe/explain/compare (0.0 — excluded from the Lab score).


# A. CCNA 200-301 v1.1

## A.1 Coverage by domain

| Domain | Official weight | Topics | Training coverage | Lab coverage (relevance-weighted) |
|---|---:|---:|---:|---:|
| 1.0 Network Fundamentals | 20% | 13 | 21.3% | 37.1% |
| 2.0 Network Access | 20% | 9 | 30.6% | 44.0% |
| 3.0 IP Connectivity | 25% | 5 | 36.2% | 40.2% |
| 4.0 IP Services | 10% | 9 | 4.4% | 0.0% |
| 5.0 Security Fundamentals | 15% | 10 | 4.0% | 10.0% |
| 6.0 Automation and Programmability | 10% | 7 | 0.0% | n/a (no H/M topics) |
| **Weighted total** | 100% | | **20.5%** | **30.8%** |

Item counts: VERIFIED 18 · IMPLEMENTED_UNVERIFIED 0 · PARTIAL 19 · DIAGRAM_ONLY 4 · THEORY_ONLY 0 · MISSING 57 · UNKNOWN 0 — **98 assessed items** in **53 numbered topics** (UNKNOWN = 0).

## A.2 Compact matrix (every topic and sub-topic)

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Outcome | Lab rel. | Status | Score | Priority | Phase(s) | Shared CCNA+N+ |
|---|---|---|---|---|---|:-:|---|---:|---|---|:-:|
| CCNA | v1.1 | 1.0 (20%) | **1.1** | **Role and function of network components** | Explain | L | *(mean of subs)* | **0.46** | P2 | CERT-P2-1, CERT-P2-6 | Y |
| CCNA | v1.1 | 1.0 | 1.1.a | Routers | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.1.b | Layer 2 and Layer 3 switches | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.1.c | Next-generation firewalls and IPS | | | DIAGRAM_ONLY | 0.15 | | CERT-P2-6 | |
| CCNA | v1.1 | 1.0 | 1.1.d | Access points | | | DIAGRAM_ONLY | 0.15 | | CERT-P2-1 | |
| CCNA | v1.1 | 1.0 | 1.1.e | Controllers (WLC) | | | MISSING | 0.00 | | CERT-P2-1 | |
| CCNA | v1.1 | 1.0 | 1.1.f | Endpoints | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.1.g | Servers | | | PARTIAL | 0.40 | | CERT-P0-4, CERT-P1-2 | |
| CCNA | v1.1 | 1.0 | 1.1.h | PoE | | | MISSING | 0.00 | | CERT-P2-4 | |
| CCNA | v1.1 | 1.0 (20%) | **1.2** | **Characteristics of topology architectures** | Describe | M | *(mean of subs)* | **0.36** | P2 | CERT-P0-5, CERT-P0-6, CERT-P0-3 | Y |
| CCNA | v1.1 | 1.0 | 1.2.a | Two-tier | | | PARTIAL | 0.40 | | CERT-P0-6 | |
| CCNA | v1.1 | 1.0 | 1.2.b | Three-tier | | | PARTIAL | 0.40 | | CERT-P0-5, CERT-P0-6 | |
| CCNA | v1.1 | 1.0 | 1.2.c | Spine-leaf | | | PARTIAL | 0.40 | | CERT-P0-5 | |
| CCNA | v1.1 | 1.0 | 1.2.d | WAN | | | PARTIAL | 0.40 | | CERT-P0-3 | |
| CCNA | v1.1 | 1.0 | 1.2.e | SOHO | | | PARTIAL | 0.40 | | CERT-P0-3, CERT-P0-4 | |
| CCNA | v1.1 | 1.0 | 1.2.f | On-premises and cloud | | | DIAGRAM_ONLY | 0.15 | | — | |
| CCNA | v1.1 | 1.0 (20%) | **1.3** | **Physical interface and cabling types** | Compare | L | *(mean of subs)* | **0.00** | P2 | CERT-P2-4 | Y |
| CCNA | v1.1 | 1.0 | 1.3.a | Single-mode fiber, multimode fiber, copper | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.3.b | Ethernet shared media vs point-to-point | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 (20%) | **1.4** | Interface and cable issues (collisions, errors, duplex/speed mismatch) | Identify | H | MISSING | 0.00 | P1 | CERT-P1-5 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.5** | TCP vs UDP | Compare | L | MISSING | 0.00 | P3 | CERT-Q2, CERT-P3-4 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.6** | Configure and verify IPv4 addressing and subnetting | Configure & verify | H | VERIFIED | 1.00 | — | CERT-Q1 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.7** | Private IPv4 addressing | Describe | L | MISSING | 0.00 | P3 | CERT-Q2, CERT-P0-3 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.8** | Configure and verify IPv6 addressing and prefix | Configure & verify | H | MISSING | 0.00 | P1 | CERT-P1-1 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.9** | **IPv6 address types** | Describe | L | *(mean of subs)* | **0.00** | P1 | CERT-P1-1 | Y |
| CCNA | v1.1 | 1.0 | 1.9.a | Unicast (global, unique local, link local) | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.9.b | Anycast | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.9.c | Multicast | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.9.d | Modified EUI-64 | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 (20%) | **1.10** | Verify IP parameters for client OS (Windows, macOS, Linux) | Verify | H | PARTIAL | 0.40 | P2 | CERT-P2-3 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.11** | **Wireless principles** | Describe | L | *(mean of subs)* | **0.00** | P2 | CERT-P2-1, CERT-Q2 | Y |
| CCNA | v1.1 | 1.0 | 1.11.a | Non-overlapping Wi-Fi channels | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.11.b | SSID | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.11.c | RF | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 | 1.11.d | Encryption | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 1.0 (20%) | **1.12** | Virtualization fundamentals (VMs, containers, VRFs) | Explain | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 1.0 (20%) | **1.13** | **Switching concepts** | Describe | M | *(mean of subs)* | **0.55** | P3 | CERT-P3-4 | Y |
| CCNA | v1.1 | 1.0 | 1.13.a | MAC learning and aging | | | PARTIAL | 0.40 | | — | |
| CCNA | v1.1 | 1.0 | 1.13.b | Frame switching | | | PARTIAL | 0.40 | | — | |
| CCNA | v1.1 | 1.0 | 1.13.c | Frame flooding | | | PARTIAL | 0.40 | | — | |
| CCNA | v1.1 | 1.0 | 1.13.d | MAC address table | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 (20%) | **2.1** | **Configure and verify VLANs (normal range) across switches** | Configure & verify | H | *(mean of subs)* | **0.80** | P1 | CERT-P1-5 | Y |
| CCNA | v1.1 | 2.0 | 2.1.a | Access ports (data and voice) — _data VERIFIED; voice VLAN missing_ | | | PARTIAL | 0.40 | | CERT-P1-5 | |
| CCNA | v1.1 | 2.0 | 2.1.b | Default VLAN | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.1.c | InterVLAN connectivity | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 (20%) | **2.2** | **Configure and verify interswitch connectivity** | Configure & verify | H | *(mean of subs)* | **1.00** | — | — | Y |
| CCNA | v1.1 | 2.0 | 2.2.a | Trunk ports | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.2.b | 802.1Q | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.2.c | Native VLAN | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 2.0 (20%) | **2.3** | Configure and verify CDP and LLDP | Configure & verify | H | PARTIAL | 0.40 | P0 | CERT-Q4 | Y |
| CCNA | v1.1 | 2.0 (20%) | **2.4** | Configure and verify L2/L3 EtherChannel (LACP) | Configure & verify | H | MISSING | 0.00 | P1 | CERT-P1-3 | Y |
| CCNA | v1.1 | 2.0 (20%) | **2.5** | **Interpret Rapid PVST+ operation** | Interpret | M | *(mean of subs)* | **0.00** | P0 | CERT-P0-6 | Y |
| CCNA | v1.1 | 2.0 | 2.5.a | Root port, root bridge (primary/secondary), port names | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.5.b | Port states and roles | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.5.c | PortFast | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 2.0 | 2.5.d | Root guard, loop guard, BPDU filter/guard | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 2.0 (20%) | **2.6** | Cisco wireless architectures and AP modes | Describe | L | MISSING | 0.00 | P2 | CERT-Q2, CERT-P2-1 | N |
| CCNA | v1.1 | 2.0 (20%) | **2.7** | Physical connections of WLAN components (AP, WLC, access/trunk, LAG) | Describe | L | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-1 | N |
| CCNA | v1.1 | 2.0 (20%) | **2.8** | Device management access (Telnet, SSH, HTTP/S, console, TACACS+/RADIUS, cloud) | Describe | L | PARTIAL | 0.40 | P0 | CERT-P0-1 | Y |
| CCNA | v1.1 | 2.0 (20%) | **2.9** | Interpret WLAN GUI configuration | Interpret | M | MISSING | 0.00 | P2 | CERT-P2-1 | N |
| CCNA | v1.1 | 3.0 (25%) | **3.1** | **Components of the routing table** | Interpret | M | *(mean of subs)* | **0.74** | P0 | CERT-P0-5, CERT-P0-7 | Y |
| CCNA | v1.1 | 3.0 | 3.1.a | Routing protocol code — _C/L/S/S* only_ | | | PARTIAL | 0.40 | | CERT-P0-5 | |
| CCNA | v1.1 | 3.0 | 3.1.b | Prefix | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.1.c | Network mask | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.1.d | Next hop | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.1.e | Administrative distance — _always [1/…] for static_ | | | PARTIAL | 0.40 | | CERT-P0-7 | |
| CCNA | v1.1 | 3.0 | 3.1.f | Metric — _always 0_ | | | PARTIAL | 0.40 | | CERT-P0-5 | |
| CCNA | v1.1 | 3.0 | 3.1.g | Gateway of last resort | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 (25%) | **3.2** | **How a router makes a forwarding decision** | Determine | M | *(mean of subs)* | **0.47** | P0 | CERT-Q3, CERT-P0-7, CERT-P0-5 | Y |
| CCNA | v1.1 | 3.0 | 3.2.a | Longest prefix match — _CERT-Q3 A1-A8 (t.q3lpm): real-engine IPv4 LPM on Cisco routers; AD/metric/ECMP not certified_ | | | VERIFIED | 1.00 | | CERT-Q3 | |
| CCNA | v1.1 | 3.0 | 3.2.b | Administrative distance — _connected beats static on equal prefix only_ | | | PARTIAL | 0.40 | | CERT-P0-7 | |
| CCNA | v1.1 | 3.0 | 3.2.c | Routing protocol metric | | | MISSING | 0.00 | | CERT-P0-5 | |
| CCNA | v1.1 | 3.0 (25%) | **3.3** | **Configure and verify IPv4 and IPv6 static routing** | Configure & verify | H | *(mean of subs)* | **0.60** | P0 | CERT-Q3, CERT-P0-7, CERT-P1-1 | Y |
| CCNA | v1.1 | 3.0 | 3.3.a | Default route | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.3.b | Network route | | | VERIFIED | 1.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.3.c | Host route — _CERT-Q3 B1-B4 (t.q3host): IPv4 /32 forwarding, display, fallback and rejection; IPv6 is assessed separately_ | | | VERIFIED | 1.00 | | CERT-Q3 | |
| CCNA | v1.1 | 3.0 | 3.3.d | Floating static — _AD argument rejected (probe)_ | | | MISSING | 0.00 | | CERT-P0-7 | |
| CCNA | v1.1 | 3.0 | 3.3.v6 *(derived)* | (derived) IPv6 static routing — the topic covers IPv4 and IPv6 | | | MISSING | 0.00 | | CERT-P1-1 | |
| CCNA | v1.1 | 3.0 (25%) | **3.4** | **Configure and verify single-area OSPFv2** | Configure & verify | H | *(mean of subs)* | **0.00** | P0 | CERT-P0-5 | Y |
| CCNA | v1.1 | 3.0 | 3.4.a | Neighbor adjacencies | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.4.b | Point-to-point | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.4.c | Broadcast (DR/BDR selection) | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 3.0 | 3.4.d | Router ID | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 3.0 (25%) | **3.5** | First hop redundancy protocols | Describe | L | MISSING | 0.00 | P2 | CERT-P2-2 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.1** | Inside source NAT (static and pools) | Configure & verify | H | MISSING | 0.00 | P0 | CERT-P0-3 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.2** | NTP client and server | Configure & verify | H | MISSING | 0.00 | P1 | CERT-P1-6 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.3** | Role of DHCP and DNS | Explain | L | MISSING | 0.00 | P0 | CERT-P0-4, CERT-P1-2 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.4** | Function of SNMP | Explain | L | MISSING | 0.00 | P1 | CERT-P1-6 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.5** | Syslog features (facilities, severity levels) | Describe | L | PARTIAL | 0.40 | P1 | CERT-Q4, CERT-P1-6 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.6** | DHCP client and relay | Configure & verify | H | MISSING | 0.00 | P0 | CERT-P0-4 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.7** | QoS per-hop behaviour | Explain | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.8** | Remote access using SSH | Configure | H | MISSING | 0.00 | P0 | CERT-P0-1 | Y |
| CCNA | v1.1 | 4.0 (10%) | **4.9** | TFTP/FTP capabilities | Describe | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.1** | Key security concepts | Define | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.2** | Security program elements | Describe | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.3** | Device access control with local passwords | Configure & verify | H | PARTIAL | 0.40 | P0 | CERT-P0-1 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.4** | Password policy elements and alternatives | Describe | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.5** | IPsec remote-access and site-to-site VPNs | Describe | L | MISSING | 0.00 | P3 | CERT-Q2, CERT-P3-2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.6** | Configure and verify ACLs | Configure & verify | H | MISSING | 0.00 | P0 | CERT-P0-2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.7** | Layer 2 security (DHCP snooping, DAI, port security) | Configure & verify | H | MISSING | 0.00 | P1 | CERT-P1-4 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.8** | AAA concepts | Compare | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.9** | Wireless security protocols (WPA/WPA2/WPA3) | Describe | L | MISSING | 0.00 | P2 | CERT-Q2, CERT-P2-1 | Y |
| CCNA | v1.1 | 5.0 (15%) | **5.10** | Configure WLAN in GUI with WPA2-PSK | Configure & verify | H | MISSING | 0.00 | P2 | CERT-P2-1 | Y |
| CCNA | v1.1 | 6.0 (10%) | **6.1** | How automation impacts network management | Explain | L | MISSING | 0.00 | P3 | CERT-Q2, CERT-P3-1 | Y |
| CCNA | v1.1 | 6.0 (10%) | **6.2** | Traditional vs controller-based networking | Compare | L | MISSING | 0.00 | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 6.0 (10%) | **6.3** | **Controller-based / SDN architecture** | Describe | L | *(mean of subs)* | **0.00** | P3 | CERT-Q2 | Y |
| CCNA | v1.1 | 6.0 | 6.3.a | Separation of control and data plane | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 6.0 | 6.3.b | Northbound and southbound APIs | | | MISSING | 0.00 | | — | |
| CCNA | v1.1 | 6.0 (10%) | **6.4** | AI (generative/predictive) and ML in network operations | Explain | L | MISSING | 0.00 | P3 | CERT-Q2 | N |
| CCNA | v1.1 | 6.0 (10%) | **6.5** | REST-based APIs (auth, CRUD, HTTP verbs, encoding) | Describe | L | MISSING | 0.00 | P3 | CERT-P3-1 | Y |
| CCNA | v1.1 | 6.0 (10%) | **6.6** | Configuration management tools (Ansible, Terraform) | Recognize | L | MISSING | 0.00 | P3 | CERT-P3-1 | Y |
| CCNA | v1.1 | 6.0 (10%) | **6.7** | Components of JSON-encoded data | Recognize | L | MISSING | 0.00 | P3 | CERT-P3-1 | Y |

## A.3 Objective cards (all 24 required fields)

Evidence keys are expanded in `CERTIFICATION_EVIDENCE_INDEX.md`; they are repeated here for convenience.

### 1.1 — Role and function of network components

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.1 (sub-topics 1.1.a, 1.1.b, 1.1.c, 1.1.d, 1.1.e, 1.1.f, 1.1.g, 1.1.h) |
| 6 | Objective summary | Role and function of network components (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Devices behave according to their role (route, switch, filter, bridge wireless, host services) |
| 10 | Existing application capability | Routers/L2/L3 switches/hosts fully simulated; server = IP host only; firewall & AP drawable but do not forward |
| 11 | Device support | cisco-router, isp-router, cisco-switch, aruba-switch, l3-switch, pc, laptop, server(partial), firewall(diagram), wireless-ap(diagram) |
| 12 | CLI support | IOS/AOS-CX/PC terminal |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6)<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532<br>`s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78 |
| 14 | Unit test evidence | `t.static` tests/l3.test.ts:165, :182, :192, :206, :217<br>`t.static` tests/campus3.test.ts:70<br>`t.svi` tests/l3.test.ts:257, :268, :278, :294, :303, :311<br>`t.endpoint` tests/endpoint-devices.test.ts:74, :92, :112<br>`t.endpoint` tests/device-capability.test.ts:136 (server = IP host only)<br>`t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109<br>`t.intervlan` tests/l3.test.ts:114-156 (router-on-a-stick), :244 "Aruba switch routes between VLANs when it is the gateway" |
| 15 | E2E test evidence | `t.static` e2e/app.spec.ts:366<br>`t.endpoint` e2e/endpoint-devices.spec.ts:100<br>`t.diagram` e2e/diagram-devices.spec.ts:104<br>`t.intervlan` e2e/app.spec.ts:385, :410 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.1.a VERIFIED; 1.1.b VERIFIED; 1.1.c DIAGRAM_ONLY; 1.1.d DIAGRAM_ONLY; 1.1.e MISSING; 1.1.f VERIFIED; 1.1.g PARTIAL; 1.1.h MISSING |
| 18 | Coverage score | 0.46 |
| 19 | Missing functionality | Firewall policy, IPS, WLC, PoE power, server services |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept notes (Q2); firewall/AP behaviour via DEV-01E; WLC via P2-1 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.2 — Characteristics of topology architectures

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.2 (sub-topics 1.2.a, 1.2.b, 1.2.c, 1.2.d, 1.2.e, 1.2.f) |
| 6 | Objective summary | Characteristics of topology architectures (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Build each architecture and observe its characteristics (redundancy, ECMP, WAN edge, NAT at SOHO edge) |
| 10 | Existing application capability | Topologies can be built and routed with static routes (Campus 3 Tier sample); no redundancy (no STP/FHRP/ECMP), no NAT, internet cloud is diagram-only |
| 11 | Device support | l3-switch, aruba-switch, cisco-router, isp-router, internet-cloud(diagram) |
| 12 | CLI support | ip route, interface vlan, routed ports |
| 13 | Source file evidence | `s.samples` src/core/sample.ts — 10 sample Labs incl. 7 graded challenges; src/core/sampleGuides.ts<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.campus3` tests/campus3.test.ts:13-93<br>`t.routed` tests/l3.test.ts:321, :332<br>`t.routed` tests/campus3.test.ts:23 "uses /31 routed links and SVI gateways"<br>`t.routed` tests/samples.test.ts:141 |
| 15 | E2E test evidence | `t.campus3` e2e/campus3.spec.ts:3 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.2.a PARTIAL; 1.2.b PARTIAL; 1.2.c PARTIAL; 1.2.d PARTIAL; 1.2.e PARTIAL; 1.2.f DIAGRAM_ONLY |
| 18 | Coverage score | 0.36 |
| 19 | Missing functionality | Redundant paths (STP, FHRP, ECMP), SOHO services (NAT/DHCP/Wi-Fi), cloud connectivity |
| 20 | Missing test coverage | No test labels architecture characteristics |
| 21 | Recommended implementation | Architecture labs once STP/OSPF/NAT exist; concept notes now |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.3 — Physical interface and cabling types

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.3 (sub-topics 1.3.a, 1.3.b) |
| 6 | Objective summary | Physical interface and cabling types (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Cable/media types with consequences (distance, speed, compatibility) |
| 10 | Existing application capability | Cables are untyped links |
| 11 | Device support | all |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.link` src/core/network.ts — linkStatus() l.35, portLine() l.57 (up / down / admin-down / no-cable) |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.3.a MISSING; 1.3.b MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Cable/media type model |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-4 physical layer model |
| 22 | Estimated complexity | M |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.4 — Interface and cable issues (collisions, errors, duplex/speed mismatch)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.4 |
| 6 | Objective summary | Interface and cable issues (collisions, errors, duplex/speed mismatch) (paraphrase) |
| 7 | Learning outcome | Identify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Configurable speed/duplex, mismatch symptoms, error counters |
| 10 | Existing application capability | Only admin-down / no-cable states; duplex/speed columns are fixed display values |
| 11 | Device support | switches, routers |
| 12 | CLI support | show interfaces (no counters) |
| 13 | Source file evidence | `s.link` src/core/network.ts — linkStatus() l.35, portLine() l.57 (up / down / admin-down / no-cable)<br>`s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort) |
| 14 | Unit test evidence | `t.showif` tests/cli.test.ts:37, :70, :134<br>`t.showif` tests/cli-batch2.test.ts:54, :76<br>`t.showif` tests/l3.test.ts:145<br>`t.link` tests/network.test.ts:30, :45, :150<br>`t.link` tests/challenge.test.ts:60, :145 |
| 15 | E2E test evidence | `t.link` e2e/app.spec.ts:26 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | speed/duplex commands, mismatch, collisions/CRC counters, err-disabled |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-5 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.5 — TCP vs UDP

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.5 |
| 6 | Objective summary | TCP vs UDP (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Transport-layer behaviour (ports, handshake, reliability) |
| 10 | Existing application capability | No layer 4; only ICMP echo |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.ping` src/core/network.ts — ping() l.711, trace() l.624 |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Any L4 model |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); later packet view (P3-4) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.6 — Configure and verify IPv4 addressing and subnetting

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.6 |
| 6 | Objective summary | Configure and verify IPv4 addressing and subnetting (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Assign IP/mask on hosts, router ports, sub-interfaces, SVIs; validation; reachability follows subnetting |
| 10 | Existing application capability | Full: mask validation, host-address validation, overlap detection, /30 and /31, ping/traceroute follow subnet rules |
| 11 | Device support | routers, switches (SVI), hosts |
| 12 | CLI support | ip address, ip address <cidr> (AOS-CX), PC IP form, ipconfig |
| 13 | Source file evidence | `s.ip` src/core/ip.ts — isValidMask() l.18, isHostAddress() l.46 (rejects 0.x, 127.x, >=224), subnetsOverlap() l.57, parseCidr() l.72<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.ipval` tests/cli.test.ts:49 "router rejects bad mask, overlapping subnet …"<br>`t.ipval` tests/l3.test.ts:311, :321<br>`t.ping` tests/network.test.ts:21-150<br>`t.ping` tests/audit-phase-a.test.ts:77-194<br>`t.routed` tests/l3.test.ts:321, :332<br>`t.routed` tests/campus3.test.ts:23 "uses /31 routed links and SVI gateways"<br>`t.routed` tests/samples.test.ts:141<br>`t.addrchal` tests/samples.test.ts:151 "Challenge 5: addressing faults" (dot1Q, PC mask /30, WAN IP)<br>`t.gw` tests/network.test.ts:80, :116, :125, :133<br>`t.gw` tests/l3.test.ts:278, :294 |
| 15 | E2E test evidence | `t.ipval` e2e/app.spec.ts:113<br>`t.ping` e2e/app.spec.ts:26, :99<br>`t.gw` e2e/app.spec.ts:99<br>`t.gw` e2e/endpoint-routing.spec.ts:180 (3c9aed7) |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | VERIFIED |
| 18 | Coverage score | 1.00 |
| 19 | Missing functionality | — |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Subnetting curriculum labs (no dev) |
| 22 | Estimated complexity | S |
| 23 | Development priority | — |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.7 — Private IPv4 addressing

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.7 |
| 6 | Objective summary | Private IPv4 addressing (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Distinguish RFC1918 from public space (usually with NAT) |
| 10 | Existing application capability | Any unicast address accepted; no public/private semantics, no NAT |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.ip` src/core/ip.ts — isValidMask() l.18, isHostAddress() l.46 (rejects 0.x, 127.x, >=224), subnetsOverlap() l.57, parseCidr() l.72 |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Private/public semantics |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); meaningful only with NAT (P0-3) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.8 — Configure and verify IPv6 addressing and prefix

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.8 |
| 6 | Objective summary | Configure and verify IPv6 addressing and prefix (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | IPv6 addresses, prefixes, link-local, ping/traceroute v6 |
| 10 | Existing application capability | No IPv6 (parser rejects ipv6 commands — probe 2026-11-13) |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.ip` src/core/ip.ts — isValidMask() l.18, isHostAddress() l.46 (rejects 0.x, 127.x, >=224), subnetsOverlap() l.57, parseCidr() l.72 |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Entire IPv6 stack |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-1 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.9 — IPv6 address types

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.9 (sub-topics 1.9.a, 1.9.b, 1.9.c, 1.9.d) |
| 6 | Objective summary | IPv6 address types (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Observe address types on configured interfaces |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.9.a MISSING; 1.9.b MISSING; 1.9.c MISSING; 1.9.d MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | IPv6 |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-1 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.10 — Verify IP parameters for client OS (Windows, macOS, Linux)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.10 |
| 6 | Objective summary | Verify IP parameters for client OS (Windows, macOS, Linux) (paraphrase) |
| 7 | Learning outcome | Verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | ipconfig / ifconfig / ip addr style output per OS |
| 10 | Existing application capability | Windows-style ipconfig and ipconfig /all only (all host kinds use the same Windows terminal) |
| 11 | Device support | pc, laptop, server, printer, ip-camera, ip-phone, nvr, nas |
| 12 | CLI support | ipconfig, ipconfig /all |
| 13 | Source file evidence | `s.pc` src/core/cli/pc.ts — 8 specs (ipconfig, ipconfig /all, ping, tracert, tracert -h, arp -a, cls, help); "DHCP Enabled: No" (l.29) |
| 14 | Unit test evidence | `t.ipconfig` tests/cli-batch2.test.ts:136, :173<br>`t.ipconfig` tests/network.test.ts:186 |
| 15 | E2E test evidence | `t.ipconfig` e2e/endpoint-devices.spec.ts:100<br>`t.ipconfig` e2e/endpoint-routing.spec.ts:204 (3c9aed7) |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | PARTIAL |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | macOS/Linux commands (ifconfig, ip addr, ip route) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-3 (CLI only, no engine change) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.11 — Wireless principles

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.11 (sub-topics 1.11.a, 1.11.b, 1.11.c, 1.11.d) |
| 6 | Objective summary | Wireless principles (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | AP/SSID/channel/security parameters |
| 10 | Existing application capability | AP is a diagram object with no wireless parameters |
| 11 | Device support | wireless-ap(diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.11.a MISSING; 1.11.b MISSING; 1.11.c MISSING; 1.11.d MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Wireless model |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-1 (+ concept notes Q2) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.12 — Virtualization fundamentals (VMs, containers, VRFs)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.12 |
| 6 | Objective summary | Virtualization fundamentals (VMs, containers, VRFs) (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.13 — Switching concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 1.0 Network Fundamentals |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 1.13 (sub-topics 1.13.a, 1.13.b, 1.13.c, 1.13.d) |
| 6 | Objective summary | Switching concepts (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Per-frame learn/forward/flood with aging |
| 10 | Existing application capability | Steady-state MAC table derived from topology (no learning/aging events); forwarding computed per VLAN domain, not per frame |
| 11 | Device support | cisco-switch, aruba-switch, l3-switch |
| 12 | CLI support | show mac address-table, show mac-address-table |
| 13 | Source file evidence | `s.l2t` src/core/l2tables.ts — macTable() l.50, arpTable() l.74, duplicateIps() l.103 (steady-state model, header l.4-6)<br>`s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78 |
| 14 | Unit test evidence | `t.mac` tests/l2tables.test.ts:29 "SW1 learns PC-A locally …" |
| 15 | E2E test evidence | `t.mac` e2e/l2.spec.ts:48 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.13.a PARTIAL; 1.13.b PARTIAL; 1.13.c PARTIAL; 1.13.d VERIFIED |
| 18 | Coverage score | 0.55 |
| 19 | Missing functionality | Learning/aging timeline, unknown-unicast flooding visualisation |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P3-4 packet view (frame-level animation) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.1 — Configure and verify VLANs (normal range) across switches

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.1 (sub-topics 2.1.a, 2.1.b, 2.1.c) |
| 6 | Objective summary | Configure and verify VLANs (normal range) across switches (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | VLAN database, access ports, voice VLAN, inter-VLAN routing |
| 10 | Existing application capability | VLANs, access ports, VLAN 1 rules, reserved VLANs, router-on-a-stick and SVI routing on IOS and AOS-CX |
| 11 | Device support | cisco-switch, aruba-switch, l3-switch, cisco-router |
| 12 | CLI support | vlan, name, switchport access vlan, vlan access, interface vlan, encapsulation dot1Q |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532<br>`s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort)<br>`s.aruba` src/core/cli/aruba.ts — 41 command specs |
| 14 | Unit test evidence | `t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.vlan1` tests/cli.test.ts:81 "VLAN 1 cannot be deleted; …"<br>`t.vlan1` tests/cli-batch2.test.ts:90 "returns the port to VLAN 1 …"<br>`t.reserved` tests/reserved-vlans.test.ts:26-64<br>`t.reserved` tests/audit-phase-a.test.ts:140<br>`t.intervlan` tests/l3.test.ts:114-156 (router-on-a-stick), :244 "Aruba switch routes between VLANs when it is the gateway" |
| 15 | E2E test evidence | `t.vlan` e2e/app.spec.ts:75<br>`t.intervlan` e2e/app.spec.ts:385, :410 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 2.1.a PARTIAL; 2.1.b VERIFIED; 2.1.c VERIFIED |
| 18 | Coverage score | 0.80 |
| 19 | Missing functionality | switchport voice vlan |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Add voice VLAN (CLI + engine treats tagged phone traffic) in CERT-P1-5 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.2 — Configure and verify interswitch connectivity

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.2 (sub-topics 2.2.a, 2.2.b, 2.2.c) |
| 6 | Objective summary | Configure and verify interswitch connectivity (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Trunks, allowed lists, native VLAN incl. mismatch |
| 10 | Existing application capability | Trunks with allowed lists (add/remove/all), native VLAN incl. mismatch leakage and %CDP mismatch warning; no DTP |
| 11 | Device support | switches |
| 12 | CLI support | switchport mode trunk, switchport trunk allowed/native, vlan trunk allowed/native |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78<br>`s.trunkchk` src/core/trunkcheck.ts — nativeVlanMismatches() l.42, cdpMismatchLog() l.70 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| 14 | Unit test evidence | `t.trunk` tests/l3.test.ts:38, :50, :62, :89, :103<br>`t.trunk` tests/challenge.test.ts:131<br>`t.native` tests/l3.test.ts:70 "native VLAN: … a mismatch leaks VLANs"<br>`t.native` tests/native-vlan.test.ts:68-167 |
| 15 | E2E test evidence | `t.trunk` e2e/app.spec.ts:339<br>`t.native` e2e/native-vlan.spec.ts:4 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 2.2.a VERIFIED; 2.2.b VERIFIED; 2.2.c VERIFIED |
| 18 | Coverage score | 1.00 |
| 19 | Missing functionality | DTP negotiation |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | — |
| 22 | Estimated complexity | — |
| 23 | Development priority | — |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.3 — Configure and verify CDP and LLDP

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.3 |
| 6 | Objective summary | Configure and verify CDP and LLDP (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | show cdp/lldp neighbors, enable/disable per port |
| 10 | Existing application capability | CERT-Q4a: show cdp neighbors and show cdp neighbors detail on Cisco IOS router/ISP router/2960 (privileged EXEC), derived from real cables with both ports operationally up; correct local/remote interfaces, IP only from an up peer interface, deterministic; Aruba/hosts/diagram excluded. Read-only topology view: no advertisements, holdtime/timers, interface filter, CDP configuration or LLDP. Native-VLAN mismatch message unchanged |
| 11 | Device support | cisco-router, isp-router, cisco-switch |
| 12 | CLI support | show cdp neighbors, show cdp neighbors detail |
| 13 | Source file evidence | `s.cdp` src/core/cli/cdp.ts — neighbors() l.25 (physical Lab.links, both ports operationally up via linkStatus(), Cisco IOS kinds only), entryAddress() l.43, showCdpNeighbors() l.53; registry specs cisco.show.cdp.neighbors / .detail in src/core/cli/cisco.ts (privileged EXEC) -- CERT-Q4a, main 950fb0c; read-only topology view: no CDP advertisements, timers/holdtime, CDP/LLDP configuration or LLDP<br>`s.trunkchk` src/core/trunkcheck.ts — nativeVlanMismatches() l.42, cdpMismatchLog() l.70 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| 14 | Unit test evidence | `t.cdp` tests/cdp.test.ts:50, :56, :103, :111, :121, :131, :147, :158, :188, :197, :219, :237<br>`t.syslog` tests/l2tables.test.ts:120 (%IP-4-DUPADDR)<br>`t.syslog` tests/native-vlan.test.ts:150, :167 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| 15 | E2E test evidence | `t.cdp` e2e/cdp.spec.ts:6 -- CERT-Q4a (33 unit + 1 E2E, real executeLine on real topology): local/remote ports, orientation, operational state not inferred from local admin, unplug/reconnect, unsupported kinds and patch panel excluded, detail IP/version without invented data, deterministic export/import, mode/do/help/Tab, LLDP/cdp config rejected |
| 16 | Production verification evidence | `p.cdp` Main CI run 43377797700 (950fb0c: npm test success, E2E 138/138, deploy success) · Pages deployment 7758721759 · production smoke10 (scratchpad, live site, 2026-11-13): UI-built R1-SW1-R2 topology, summary/detail ports, shutdown removes the neighbor, PC/Aruba/IP phone excluded, AOS-CX rejects the command |
| 17 | Coverage status | PARTIAL |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | show lldp neighbors (IOS and AOS-CX), cdp run / cdp enable / lldp run / lldp transmit|receive, interface-filtered queries, advertisement/holdtime behaviour |
| 20 | Missing test coverage | LLDP and enable/disable tests (after implementation) |
| 21 | Recommended implementation | CERT-Q4b (LLDP + CDP/LLDP config; needs an optional Lab schema field) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.4 — Configure and verify L2/L3 EtherChannel (LACP)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.4 |
| 6 | Objective summary | Configure and verify L2/L3 EtherChannel (LACP) (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | channel-group, port-channel, LACP states, load sharing |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-3 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.5 — Interpret Rapid PVST+ operation

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.5 (sub-topics 2.5.a, 2.5.b, 2.5.c, 2.5.d) |
| 6 | Objective summary | Interpret Rapid PVST+ operation (paraphrase) |
| 7 | Learning outcome | Interpret |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Loop-free L2 topology with elected root, roles/states, show spanning-tree |
| 10 | Existing application capability | No STP; an L2 loop is tolerated silently (tests/network.test.ts:159) — fidelity gap |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78 |
| 14 | Unit test evidence | `t.loop` tests/network.test.ts:159 "a layer-2 loop does not hang the engine" (no STP / no storm modelled)<br>`t.loop` tests/traceroute.test.ts:223 |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 2.5.a MISSING; 2.5.b MISSING; 2.5.c MISSING; 2.5.d MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Entire STP |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-6 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.6 — Cisco wireless architectures and AP modes

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.6 |
| 6 | Objective summary | Cisco wireless architectures and AP modes (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | AP diagram object only |
| 11 | Device support | wireless-ap(diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); CERT-P2-1 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | No |

### 2.7 — Physical connections of WLAN components (AP, WLC, access/trunk, LAG)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.7 |
| 6 | Objective summary | Physical connections of WLAN components (AP, WLC, access/trunk, LAG) (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Cable AP/WLC to access or trunk ports with behaviour |
| 10 | Existing application capability | AP can be cabled to a switch port but does not bridge |
| 11 | Device support | wireless-ap(diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | DIAGRAM_ONLY |
| 18 | Coverage score | 0.15 |
| 19 | Missing functionality | AP bridging, WLC, LAG |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-1 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | No |

### 2.8 — Device management access (Telnet, SSH, HTTP/S, console, TACACS+/RADIUS, cloud)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.8 |
| 6 | Objective summary | Device management access (Telnet, SSH, HTTP/S, console, TACACS+/RADIUS, cloud) (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Several access methods |
| 10 | Existing application capability | Console CLI only |
| 11 | Device support | routers, switches |
| 12 | CLI support | console |
| 13 | Source file evidence | `s.ui` src/components/Canvas.tsx, Palette.tsx, Console.tsx, Inspector.tsx, CommandLibrary.tsx, ChallengePanel.tsx, GuidePanel.tsx, FileManager.tsx |
| 14 | Unit test evidence | `t.cli` tests/cli.test.ts:11, :27, :89, :182, :192, :209, :214 (every registry example executed on every supported device kind) |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | PARTIAL |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | SSH/Telnet/HTTP, AAA |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.9 — Interpret WLAN GUI configuration

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 2.0 Network Access |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.9 |
| 6 | Objective summary | Interpret WLAN GUI configuration (paraphrase) |
| 7 | Learning outcome | Interpret |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | WLC GUI screens |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-1 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | No |

### 3.1 — Components of the routing table

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 3.0 IP Connectivity |
| 4 | Domain weight | 25% |
| 5 | Objective ID | 3.1 (sub-topics 3.1.a, 3.1.b, 3.1.c, 3.1.d, 3.1.e, 3.1.f, 3.1.g) |
| 6 | Objective summary | Components of the routing table (paraphrase) |
| 7 | Learning outcome | Interpret |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | show ip route with all components for several sources |
| 10 | Existing application capability | IOS-style show ip route (classful grouping) for connected/local/static/default; AOS-CX show ip route |
| 11 | Device support | routers, l3/aruba switches, 2960 |
| 12 | CLI support | show ip route |
| 13 | Source file evidence | `s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort)<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.static` tests/l3.test.ts:165, :182, :192, :206, :217<br>`t.static` tests/campus3.test.ts:70<br>`t.default` tests/l3.test.ts:200 "default route S* is shown on R2" (asserts "Gateway of last resort is 10.0.0.1 …") |
| 15 | E2E test evidence | `t.static` e2e/app.spec.ts:366<br>`t.default` e2e/app.spec.ts:366 (asserts "Gateway of last resort is not set") |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 3.1.a PARTIAL; 3.1.b VERIFIED; 3.1.c VERIFIED; 3.1.d VERIFIED; 3.1.e PARTIAL; 3.1.f PARTIAL; 3.1.g VERIFIED |
| 18 | Coverage score | 0.74 |
| 19 | Missing functionality | Dynamic-route codes/AD/metric |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Comes with CERT-P0-5 (OSPF) and floating static (CERT-P0-7) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.2 — How a router makes a forwarding decision

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 3.0 IP Connectivity |
| 4 | Domain weight | 25% |
| 5 | Objective ID | 3.2 (sub-topics 3.2.a, 3.2.b, 3.2.c) |
| 6 | Objective summary | How a router makes a forwarding decision (paraphrase) |
| 7 | Learning outcome | Determine |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | LPM, AD and metric tie-breaking |
| 10 | Existing application capability | LPM + connected-over-static |
| 11 | Device support | routers, AOS-CX switches |
| 12 | CLI support | show ip route, traceroute |
| 13 | Source file evidence | `s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.q3lpm` tests/route-selection.test.ts:101, :110, :116, :127, :140, :147, :158, :174 -- CERT-Q3 A1-A8: real IOS CLI + trace/ping, overlapping prefixes, order independence, connected tie, missing route, down next-hop fallback, deterministic export/import; Cisco router only; no ECMP/AD/metric fidelity claim |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.2.a VERIFIED; 3.2.b PARTIAL; 3.2.c MISSING |
| 18 | Coverage score | 0.47 |
| 19 | Missing functionality | AD comparison between sources, metrics |
| 20 | Missing test coverage | AOS-CX-specific LPM; AD/metric not implemented |
| 21 | Recommended implementation | CERT-Q3 completed (LPM evidence), CERT-P0-7, CERT-P0-5 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.3 — Configure and verify IPv4 and IPv6 static routing

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 3.0 IP Connectivity |
| 4 | Domain weight | 25% |
| 5 | Objective ID | 3.3 (sub-topics 3.3.a, 3.3.b, 3.3.c, 3.3.d, 3.3.v6) |
| 6 | Objective summary | Configure and verify IPv4 and IPv6 static routing (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | ip route / ipv6 route with all variants |
| 10 | Existing application capability | IPv4 network/default/host static routes on IOS and AOS-CX with next-hop validation; return-path failures explained |
| 11 | Device support | routers, AOS-CX switches |
| 12 | CLI support | ip route, no ip route |
| 13 | Source file evidence | `s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532<br>`s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort)<br>`s.aruba` src/core/cli/aruba.ts — 41 command specs |
| 14 | Unit test evidence | `t.static` tests/l3.test.ts:165, :182, :192, :206, :217<br>`t.static` tests/campus3.test.ts:70<br>`t.default` tests/l3.test.ts:200 "default route S* is shown on R2" (asserts "Gateway of last resort is 10.0.0.1 …")<br>`t.q3host` tests/route-selection.test.ts:189, :200, :210, :217 -- CERT-Q3 B1-B4: exact /32 host selection vs neighbours, route/config output, unreachable next-hop fallback, invalid input leaves routes unchanged; IPv4 Cisco router only (IPv6 remains separately MISSING) |
| 15 | E2E test evidence | `t.static` e2e/app.spec.ts:366<br>`t.default` e2e/app.spec.ts:366 (asserts "Gateway of last resort is not set") |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 3.3.a VERIFIED; 3.3.b VERIFIED; 3.3.c VERIFIED; 3.3.d MISSING; 3.3.v6 MISSING |
| 18 | Coverage score | 0.60 |
| 19 | Missing functionality | Floating static (AD), IPv6 static |
| 20 | Missing test coverage | AOS-CX-specific host route; IPv6 not implemented |
| 21 | Recommended implementation | CERT-Q3 completed (host-route evidence), CERT-P0-7, CERT-P1-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.4 — Configure and verify single-area OSPFv2

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 3.0 IP Connectivity |
| 4 | Domain weight | 25% |
| 5 | Objective ID | 3.4 (sub-topics 3.4.a, 3.4.b, 3.4.c, 3.4.d) |
| 6 | Objective summary | Configure and verify single-area OSPFv2 (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | router ospf, network/area, neighbors, DR/BDR, router-id, OSPF routes in table |
| 10 | Existing application capability | Parser rejects router ospf (probe) |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.4.a MISSING; 3.4.b MISSING; 3.4.c MISSING; 3.4.d MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Entire OSPF |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-5 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.5 — First hop redundancy protocols

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 3.0 IP Connectivity |
| 4 | Domain weight | 25% |
| 5 | Objective ID | 3.5 |
| 6 | Objective summary | First hop redundancy protocols (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Virtual gateway failover |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-2 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.1 — Inside source NAT (static and pools)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.1 |
| 6 | Objective summary | Inside source NAT (static and pools) (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | ip nat inside/outside, static, pool, overload, translations table |
| 10 | Existing application capability | None; internet cloud does not route (tests/diagram-devices.test.ts:91) |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-3 (needs routable internet edge) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.2 — NTP client and server

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.2 |
| 6 | Objective summary | NTP client and server (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | ntp server/master, show ntp status/associations, clock |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-6 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.3 — Role of DHCP and DNS

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.3 |
| 6 | Objective summary | Role of DHCP and DNS (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Observe DHCP lease and name resolution |
| 10 | Existing application capability | Static addressing only (ipconfig prints DHCP Enabled: No); server has no services |
| 11 | Device support | server(partial) |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.pc` src/core/cli/pc.ts — 8 specs (ipconfig, ipconfig /all, ping, tracert, tracert -h, arp -a, cls, help); "DHCP Enabled: No" (l.29) |
| 14 | Unit test evidence | `t.endpoint` tests/endpoint-devices.test.ts:74, :92, :112<br>`t.endpoint` tests/device-capability.test.ts:136 (server = IP host only) |
| 15 | E2E test evidence | `t.endpoint` e2e/endpoint-devices.spec.ts:100 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | DHCP, DNS |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-4, CERT-P1-2 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.4 — Function of SNMP

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.4 |
| 6 | Objective summary | Function of SNMP (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-6 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.5 — Syslog features (facilities, severity levels)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.5 |
| 6 | Objective summary | Syslog features (facilities, severity levels) (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | logging configuration, severity filtering, show logging |
| 10 | Existing application capability | Four IOS-format messages with facility-severity-mnemonic (%LINK-3-UPDOWN, %LINK-5-CHANGED, %IP-4-DUPADDR, %CDP-4-NATIVE_VLAN_MISMATCH); no logging config, show logging rejected (probe) |
| 11 | Device support | Cisco devices |
| 12 | CLI support | — (messages appear in console) |
| 13 | Source file evidence | `s.syslog` src/core/cli/cisco.ts l.774 %LINK-5-CHANGED, l.785 %LINK-3-UPDOWN, l.207 %IP-4-DUPADDR (lines at 3e00c13; l.791, l.802, l.208 at 950fb0c); src/core/trunkcheck.ts l.8 %CDP-4-NATIVE_VLAN_MISMATCH |
| 14 | Unit test evidence | `t.syslog` tests/l2tables.test.ts:120 (%IP-4-DUPADDR)<br>`t.syslog` tests/native-vlan.test.ts:150, :167 (%CDP-4-NATIVE_VLAN_MISMATCH) |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | PARTIAL |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | logging buffered/host/trap, show logging |
| 20 | Missing test coverage | %LINK-* messages not asserted |
| 21 | Recommended implementation | CERT-Q4 (show logging buffer), CERT-P1-6 |
| 22 | Estimated complexity | S |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.6 — DHCP client and relay

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.6 |
| 6 | Objective summary | DHCP client and relay (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | ip address dhcp, ip helper-address, DHCP server pool |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-4 (= DEV-01D) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.7 — QoS per-hop behaviour

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.7 |
| 6 | Objective summary | QoS per-hop behaviour (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.8 — Remote access using SSH

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.8 |
| 6 | Objective summary | Remote access using SSH (paraphrase) |
| 7 | Learning outcome | Configure |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | hostname/domain, crypto key, username, line vty, transport input ssh, ssh from a host |
| 10 | Existing application capability | None for SSH (domain name, crypto key, username, line vty, transport input and the ssh client are not implemented; CERT-P0-1a adds only enable secret) |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.9 — TFTP/FTP capabilities

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 4.0 IP Services |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 4.9 |
| 6 | Objective summary | TFTP/FTP capabilities (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None (write memory exists, no file transfer) |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort) |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.1 — Key security concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.1 |
| 6 | Objective summary | Key security concepts (paraphrase) |
| 7 | Learning outcome | Define |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.2 — Security program elements

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.2 |
| 6 | Objective summary | Security program elements (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.3 — Device access control with local passwords

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.3 |
| 6 | Objective summary | Device access control with local passwords (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | enable secret, line console/vty password, login local, username |
| 10 | Existing application capability | CERT-P0-1a: enable secret, enable secret 0/5 and no enable secret on Cisco IOS router / ISP router / 2960 — hidden Password: prompt, 3 wrong answers (a simulator setting), type-5 MD5-crypt hash in running-config, masked history/echo/storage/export on every device; NOT implemented: line console/vty password, login / login local, username, enable password, service password-encryption |
| 11 | Device support | cisco-router, isp-router, cisco-switch |
| 12 | CLI support | enable secret, enable secret 0, enable secret 5, no enable secret, enable (Password:) |
| 13 | Source file evidence | `s.secret` src/core/secret.ts — md5() l.17, md5crypt() l.65, hashType5() l.102, verifyType5() l.107; TYPE5_RE l.62 (MD5-crypt "$1$<salt>$<22 chars>", synchronous) -- CERT-P0-1a, main 51251c0; byte compatibility with openssl passwd -1 vectors, not with a physical device<br>`s.enable` src/core/cli/cisco.ts — setEnableSecret() l.23; registry specs cisco.enable (l.490, asks Password: when a secret exists), cisco.enable.secret / .secret.0 / .secret.5 (l.676-700), cisco.no.enable.secret (l.704); running-config line "enable secret 5 <hash>" (l.79) -- CERT-P0-1a, main 51251c0. Enable secret only: no enable password, username, line console/vty, login, SSH, service password-encryption<br>`s.credin` src/core/cli/engine.ts — redactLine() l.53 (vendor-independent after fix1), answerPrompt() l.407 (hidden answer, ENABLE_ATTEMPTS = 3 simulator setting), executeLine() l.429; src/components/Console.tsx l.63, l.164 (type=password while a prompt is pending); src/store.ts l.553 (a secret answer is not written to the transcript) -- CERT-P0-1a + fix1, main 51251c0<br>`s.persist` src/core/persist.ts — validateLab() l.216, serializeExport() l.242, parseImport() l.246 (JSON, schemaVersion 1; baseline 51251c0 — they were l.211 / l.223 / l.227 at 950fb0c, shifted by CERT-P0-1a); withoutTransient() l.229 (a pending credential prompt is never stored or exported); optional security.enableSecret schema l.76 (type-5 hash only) |
| 14 | Unit test evidence | `t.secret` tests/secret.test.ts:21, :35, :45 (RFC 1321 MD5 vectors, type-5 verify, random 4-char salt)<br>`t.secret` tests/enable-secret.test.ts:51, :63, :78, :96, :106, :116, :129, :139, :151, :166, :175, :183, :200, :205, :224, :242, :252, :269 -- CERT-P0-1a at 51251c0: enable without a secret unchanged, Password: prompt, right/wrong/3 wrong answers, disable, hidden answer is never a command, Catalyst + ISP router, running-config hash only, secret 0 / 5 forms, no enable secret, non-Cisco rejection, history/echo/error masking, localStorage + workspace + export + import, 40 randomised secrets, legacy Labs<br>`t.secfix` tests/enable-secret-all-devices.test.ts:39, :49, :72, :82, :92, :106, :121 -- CERT-P0-1a fix1 (33 unit tests): redaction on every vendor, Cisco/Aruba/PC/IP endpoint kinds, no-CLI kinds, store transcript, Cisco authentication unchanged; with the 3a27eef engine put back 22 of 33 fail |
| 15 | E2E test evidence | `t.secretE2E` e2e/enable-secret.spec.ts:8<br>`t.secretE2E` e2e/enable-secret-unsupported.spec.ts:11 -- CERT-P0-1a + fix1 in a real browser: hidden Password:, wrong then right answer, nothing on screen / history / storage; Aruba + PC reject and the raw secret is absent from screen, history, storage, export and after reload |
| 16 | Production verification evidence | `p.p01a` CERT-P0-1a + fix1 at main = production 51251c0. REPORTED by the gates (logs of CI are not readable without login, so the unit count in CI is unverified): Linux CI run 43784316839 (ci/cert-p0-1a-fix1) and main CI run 43784804302 — build ok, E2E 140 passed / 0 failed / 0 flaky / 0 skipped, deploy ok · Pages deployment 7813043791 · production JS/CSS/HTML byte-identical to a clean build of 51251c0 · production smoke 63/63 (58 + CDP 1 + enable secret 3 + all-device security 1; 0 console errors, 0 failed requests) · synthetic-secret check of 12 input forms on Cisco router, Cisco switch, ISP router, Aruba switch, PC. REPRODUCED DIRECTLY by this evidence update (2026-11-16): local unit suite 855/855; production smoke11 3/3 and smoke12 1/1 against the live site (bundle index-DwEygOnl.js). Simulator behaviour only: no real Cisco hardware or IOS image was used |
| 17 | Coverage status | PARTIAL |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | line console/vty password, login / login local, username, enable password, service password-encryption |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.4 — Password policy elements and alternatives

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.4 |
| 6 | Objective summary | Password policy elements and alternatives (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.5 — IPsec remote-access and site-to-site VPNs

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.5 |
| 6 | Objective summary | IPsec remote-access and site-to-site VPNs (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); P3-2 |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.6 — Configure and verify ACLs

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.6 |
| 6 | Objective summary | Configure and verify ACLs (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | standard/extended numbered/named ACLs applied in/out, hit counters, ping/traceroute effect |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-2 |
| 22 | Estimated complexity | L |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.7 — Layer 2 security (DHCP snooping, DAI, port security)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.7 |
| 6 | Objective summary | Layer 2 security (DHCP snooping, DAI, port security) (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | switchport port-security, err-disable, snooping/DAI |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-4 (port security first; snooping after DHCP) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.8 — AAA concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.8 |
| 6 | Objective summary | AAA concepts (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.9 — Wireless security protocols (WPA/WPA2/WPA3)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.9 |
| 6 | Objective summary | Wireless security protocols (WPA/WPA2/WPA3) (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); P2-1 |
| 22 | Estimated complexity | S |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.10 — Configure WLAN in GUI with WPA2-PSK

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 5.0 Security Fundamentals |
| 4 | Domain weight | 15% |
| 5 | Objective ID | 5.10 |
| 6 | Objective summary | Configure WLAN in GUI with WPA2-PSK (paraphrase) |
| 7 | Learning outcome | Configure & verify |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | WLC/AP GUI, SSID + PSK, client association |
| 10 | Existing application capability | None |
| 11 | Device support | wireless-ap(diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-1 |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.1 — How automation impacts network management

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.1 |
| 6 | Objective summary | How automation impacts network management (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2); P3-1 |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.2 — Traditional vs controller-based networking

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.2 |
| 6 | Objective summary | Traditional vs controller-based networking (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.3 — Controller-based / SDN architecture

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.3 (sub-topics 6.3.a, 6.3.b) |
| 6 | Objective summary | Controller-based / SDN architecture (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 6.3.a MISSING; 6.3.b MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.4 — AI (generative/predictive) and ML in network operations

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.4 |
| 6 | Objective summary | AI (generative/predictive) and ML in network operations (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | Concept note (Q2) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | No |

### 6.5 — REST-based APIs (auth, CRUD, HTTP verbs, encoding)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.5 |
| 6 | Objective summary | REST-based APIs (auth, CRUD, HTTP verbs, encoding) (paraphrase) |
| 7 | Learning outcome | Describe |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Read/modify Lab via REST-like calls |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P3-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.6 — Configuration management tools (Ansible, Terraform)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.6 |
| 6 | Objective summary | Configuration management tools (Ansible, Terraform) (paraphrase) |
| 7 | Learning outcome | Recognize |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | — |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | All |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P3-1 |
| 22 | Estimated complexity | M |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 6.7 — Components of JSON-encoded data

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | 6.0 Automation and Programmability |
| 4 | Domain weight | 10% |
| 5 | Objective ID | 6.7 |
| 6 | Objective summary | Components of JSON-encoded data (paraphrase) |
| 7 | Learning outcome | Recognize |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Inspect JSON as a learning activity |
| 10 | Existing application capability | Lab export is JSON (schemaVersion 1) but not presented as learning content |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.persist` src/core/persist.ts — validateLab() l.216, serializeExport() l.242, parseImport() l.246 (JSON, schemaVersion 1; baseline 51251c0 — they were l.211 / l.223 / l.227 at 950fb0c, shifted by CERT-P0-1a); withoutTransient() l.229 (a pending credential prompt is never stored or exported); optional security.enableSecret schema l.76 (type-5 hash only) |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Guided JSON view |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P3-1 (JSON view of device config) |
| 22 | Estimated complexity | S |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

# B. CCNA 200-301 v2.0 (separate model — upcoming)

Official v2.0 exam topics (© 2026 Cisco) retrieved 2026-11-13. **Dates are NOT in the official PDF**: secondary sources (training vendors) report publication at Cisco Live on 2026-05-20, last v1.1 test date 2027-02-02 and first v2.0 test date 2027-02-03 — treat as unverified until confirmed on Cisco's site.

## B.1 Structural changes v1.1 → v2.0 (from the two official PDFs)

| Area | v1.1 | v2.0 |
|---|---|---|
| Domains | 6: Fundamentals 20, Access 20, IP Connectivity 25, IP Services 10, Security 15, Automation 10 | 5: Infrastructure & Connectivity 25, Switching & Access 25, IP Routing 20, Services & Security 20, AI & Operations 10 |
| Verbs | Many "describe/explain" | Many more "troubleshoot / diagnose / configure" (1.1, 1.3, 1.4, 1.6, 1.7, 2.4, 3.2, 4.4) — favours a simulator |
| New topics | — | DHCPv4 server troubleshooting (1.7), OSPFv3 (3.3), HSRP/VRRP status (3.4), AAA client (4.1), SFTP/SCP (4.2), NAT/PAT on IOS XE (4.3), DNS record diagnosis (4.4), standard/extended/named ACLs (4.6), storm control + RA guard (4.7.c/d), agentic/generative AI prompts (5.1–5.2), Ansible execution (5.5), packet capture / extended ping / show logs (2.4) |
| Removed / folded | TCP vs UDP (1.5), topology architectures (1.2), virtualization VRFs, REST/JSON (6.5, 6.7), QoS (4.7), TFTP/FTP (4.9), wireless GUI (2.9, 5.10), many security "describe" items | — |

## B.2 Coverage by domain (v2.0 model)

| Domain | Official weight | Topics | Training coverage | Lab coverage (relevance-weighted) |
|---|---:|---:|---:|---:|
| 1.0 Network Infrastructure and Connectivity | 25% | 7 | 11.4% | 16.0% |
| 2.0 Switching and Network Access | 25% | 5 | 35.4% | 35.4% |
| 3.0 IP Routing | 20% | 4 | 25.0% | 28.6% |
| 4.0 Network Services and Security | 20% | 7 | 0.0% | 0.0% |
| 5.0 AI, and Network Operations and Management | 10% | 6 | 6.7% | 10.0% |
| **Weighted total** | 100% | | **17.4%** | **19.6%** |

Item counts: VERIFIED 6 · IMPLEMENTED_UNVERIFIED 0 · PARTIAL 8 · DIAGRAM_ONLY 2 · THEORY_ONLY 0 · MISSING 37 · UNKNOWN 0 — **53 items** in **29 topics**.

## B.3 Compact matrix (v2.0)

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Lab rel. | Status | Score | Phase(s) |
|---|---|---|---|---|:-:|---|---:|---|
| CCNA | v2.0 | 1.0 (25%) | **1.1** | Diagnose interface and cable issues (copper/fiber, duplex, speed, distance, signal, pinout) | H | MISSING | 0.00 | CERT-P1-5, CERT-P2-4 |
| CCNA | v2.0 | 1.0 (25%) | **1.2** | Hypervisors, VMs and containers | L | MISSING | 0.00 | CERT-Q2 |
| CCNA | v2.0 | 1.0 (25%) | **1.3** | Troubleshoot IPv4 configuration, assignment and subnetting (public/private) — _static config/subnetting VERIFIED; assignment (DHCP) and public/private missing_ | H | PARTIAL | 0.40 | CERT-P0-4, CERT-P0-3 |
| CCNA | v2.0 | 1.0 (25%) | **1.4** | Troubleshoot IPv6 configuration, assignment and prefix sizing | H | MISSING | 0.00 | CERT-P1-1 |
| CCNA | v2.0 | 1.0 (25%) | **1.5** | **Wireless principles** | L | *(mean of subs)* | **0.00** | CERT-P2-1, CERT-Q2 |
| CCNA | v2.0 | 1.0 | 1.5.a | Band and channel selection | | MISSING | 0.00 | — |
| CCNA | v2.0 | 1.0 | 1.5.b | RF characteristics | | MISSING | 0.00 | — |
| CCNA | v2.0 | 1.0 | 1.5.c | Security protocols | | MISSING | 0.00 | — |
| CCNA | v2.0 | 1.0 | 1.5.d | Cause of interference | | MISSING | 0.00 | — |
| CCNA | v2.0 | 1.0 (25%) | **1.6** | Troubleshoot wired and wireless client connectivity (Windows/macOS/Linux) — _wired, Windows-style only_ | H | PARTIAL | 0.40 | CERT-P2-3, CERT-P2-1 |
| CCNA | v2.0 | 1.0 (25%) | **1.7** | Troubleshoot DHCPv4 client, server and relay on IOS | H | MISSING | 0.00 | CERT-P0-4 |
| CCNA | v2.0 | 2.0 (25%) | **2.1** | **Configure infrastructure connectivity (switch-switch, switch-router)** | H | *(mean of subs)* | **0.75** | CERT-P1-3 |
| CCNA | v2.0 | 2.0 | 2.1.a | L2/L3 physical interfaces | | VERIFIED | 1.00 | — |
| CCNA | v2.0 | 2.0 | 2.1.b | L2 802.1Q trunks | | VERIFIED | 1.00 | — |
| CCNA | v2.0 | 2.0 | 2.1.c | L2/L3 LACP port-channel | | MISSING | 0.00 | CERT-P1-3 |
| CCNA | v2.0 | 2.0 | 2.1.d | SVI | | VERIFIED | 1.00 | — |
| CCNA | v2.0 | 2.0 (25%) | **2.2** | **Edge-host port attributes (VLAN, PoE, port channel, LACP)** | H | *(mean of subs)* | **0.22** | CERT-P1-5, CERT-P2-4, CERT-P2-1 |
| CCNA | v2.0 | 2.0 | 2.2.a | Desktop, printer, IoT — _VLAN yes; PoE no_ | | PARTIAL | 0.40 | CERT-P2-4 |
| CCNA | v2.0 | 2.0 | 2.2.b | Wireless APs | | DIAGRAM_ONLY | 0.15 | CERT-P2-1 |
| CCNA | v2.0 | 2.0 | 2.2.c | VoIP phone — _IP phone is an IP host; no voice VLAN/PoE_ | | PARTIAL | 0.40 | CERT-P1-5 |
| CCNA | v2.0 | 2.0 | 2.2.d | Virtualized hosts | | MISSING | 0.00 | — |
| CCNA | v2.0 | 2.0 | 2.2.e | Network appliances | | DIAGRAM_ONLY | 0.15 | CERT-P2-6 |
| CCNA | v2.0 | 2.0 (25%) | **2.3** | Validate documentation using CDP and LLDP — _CERT-Q4a (t.cdp, p.cdp): CDP neighbor/detail output checks cabling and port documentation on Cisco IOS; LLDP MISSING_ | H | PARTIAL | 0.40 | CERT-Q4 |
| CCNA | v2.0 | 2.0 (25%) | **2.4** | Troubleshoot L2/L3 with show (incl. logs), ping, extended ping, traceroute, packet capture — _show/ping/traceroute VERIFIED; show logs, extended ping, packet capture missing_ | H | PARTIAL | 0.40 | CERT-Q4, CERT-P3-4 |
| CCNA | v2.0 | 2.0 (25%) | **2.5** | **Configure Rapid PVST+** | H | *(mean of subs)* | **0.00** | CERT-P0-6 |
| CCNA | v2.0 | 2.0 | 2.5.a | Root port/bridge, port names | | MISSING | 0.00 | — |
| CCNA | v2.0 | 2.0 | 2.5.b | Port states and roles | | MISSING | 0.00 | — |
| CCNA | v2.0 | 2.0 | 2.5.c | PortFast | | MISSING | 0.00 | — |
| CCNA | v2.0 | 2.0 | 2.5.d | Root guard, loop guard, BPDU guard | | MISSING | 0.00 | — |
| CCNA | v2.0 | 3.0 (20%) | **3.1** | Interpret a routing table to identify the next hop (protocol, prefix/mask, AD, metric, default) — _static/connected/default only; fixed AD/metric_ | H | PARTIAL | 0.40 | CERT-P0-5, CERT-P0-7 |
| CCNA | v2.0 | 3.0 (20%) | **3.2** | **Troubleshoot IPv4 and IPv6 static routing** | H | *(mean of subs)* | **0.60** | CERT-Q3, CERT-P0-7, CERT-P1-1 |
| CCNA | v2.0 | 3.0 | 3.2.a | Default route | | VERIFIED | 1.00 | — |
| CCNA | v2.0 | 3.0 | 3.2.b | Network route | | VERIFIED | 1.00 | — |
| CCNA | v2.0 | 3.0 | 3.2.c | Host route — _CERT-Q3 B1-B4 (t.q3host): IPv4 /32 forwarding and next-hop fault fallback; IPv6 separately MISSING_ | | VERIFIED | 1.00 | CERT-Q3 |
| CCNA | v2.0 | 3.0 | 3.2.d | Floating static | | MISSING | 0.00 | CERT-P0-7 |
| CCNA | v2.0 | 3.0 | 3.2.v6 *(derived)* | (derived) IPv6 static | | MISSING | 0.00 | CERT-P1-1 |
| CCNA | v2.0 | 3.0 (20%) | **3.3** | **Configure single-area OSPFv2 and OSPFv3** | H | *(mean of subs)* | **0.00** | CERT-P0-5, CERT-P1-1 |
| CCNA | v2.0 | 3.0 | 3.3.a | Neighbor adjacencies | | MISSING | 0.00 | — |
| CCNA | v2.0 | 3.0 | 3.3.b | Point-to-point | | MISSING | 0.00 | — |
| CCNA | v2.0 | 3.0 | 3.3.c | Broadcast (DR/BDR) | | MISSING | 0.00 | — |
| CCNA | v2.0 | 3.0 | 3.3.d | Router ID | | MISSING | 0.00 | — |
| CCNA | v2.0 | 3.0 (20%) | **3.4** | Interpret FHRP status (HSRP, VRRP) | M | MISSING | 0.00 | CERT-P2-2 |
| CCNA | v2.0 | 4.0 (20%) | **4.1** | Local usernames and AAA client (TACACS+/RADIUS) for management | H | MISSING | 0.00 | CERT-P0-1 |
| CCNA | v2.0 | 4.0 (20%) | **4.2** | Manage config/software files with SFTP/SCP | M | MISSING | 0.00 | CERT-P0-1 |
| CCNA | v2.0 | 4.0 (20%) | **4.3** | Configure NAT/PAT on IOS XE | H | MISSING | 0.00 | CERT-P0-3 |
| CCNA | v2.0 | 4.0 (20%) | **4.4** | Diagnose DNS record issues (A, AAAA, CNAME, MX, NS, PTR) | H | MISSING | 0.00 | CERT-P1-2 |
| CCNA | v2.0 | 4.0 (20%) | **4.5** | IPsec VPNs (protocols, transport modes) | L | MISSING | 0.00 | CERT-Q2, CERT-P3-2 |
| CCNA | v2.0 | 4.0 (20%) | **4.6** | Configure IPv4 ACLs (standard/extended, numbered/named) | H | MISSING | 0.00 | CERT-P0-2 |
| CCNA | v2.0 | 4.0 (20%) | **4.7** | **Configure Layer 2 security** | H | *(mean of subs)* | **0.00** | CERT-P1-4 |
| CCNA | v2.0 | 4.0 | 4.7.a | DHCP snooping | | MISSING | 0.00 | — |
| CCNA | v2.0 | 4.0 | 4.7.b | Dynamic ARP inspection | | MISSING | 0.00 | — |
| CCNA | v2.0 | 4.0 | 4.7.c | Storm control | | MISSING | 0.00 | — |
| CCNA | v2.0 | 4.0 | 4.7.d | RA guard | | MISSING | 0.00 | — |
| CCNA | v2.0 | 4.0 | 4.7.e | Port security | | MISSING | 0.00 | — |
| CCNA | v2.0 | 5.0 (10%) | **5.1** | Role of agentic AI in network operations | L | MISSING | 0.00 | CERT-Q2 |
| CCNA | v2.0 | 5.0 (10%) | **5.2** | Select a prompt for a generative AI system (data classification, format, persona) | M | MISSING | 0.00 | CERT-P3-1 |
| CCNA | v2.0 | 5.0 (10%) | **5.3** | Network management approaches (device/cloud/controller/automation/IaC) | L | MISSING | 0.00 | CERT-Q2 |
| CCNA | v2.0 | 5.0 (10%) | **5.4** | Function of SNMP | L | MISSING | 0.00 | CERT-P1-6 |
| CCNA | v2.0 | 5.0 (10%) | **5.5** | Use configuration management (e.g. Ansible) to execute commands | H | MISSING | 0.00 | CERT-P3-1 |
| CCNA | v2.0 | 5.0 (10%) | **5.6** | Interpret syslog content, severity levels and facilities — _four IOS-format messages; no logging buffer/config_ | M | PARTIAL | 0.40 | CERT-Q4, CERT-P1-6 |

v2.0 evidence uses the same evidence keys as the equivalent v1.1 rows (e.g. v2.0 2.1.a/b/d ↔ v1.1 2.1/2.2; 3.2 ↔ 3.3). v2.0 cards are abbreviated because the v2.0 exam is not yet live.
