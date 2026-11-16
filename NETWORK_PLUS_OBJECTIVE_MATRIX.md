# Network+ Objective Matrix — Network Lab Studio

> Generated 2026-11-13 from `certification-audit/scripts/model.mjs` by `gen.mjs`. Audit evidence at main `950fb0c` (CERT-Q4a CDP evidence update; CERT-Q3 at `3e00c13`).
> **Exam:** CompTIA Network+ **N10-009 (Exam Objectives v4.0)** — CompTIA "Network+ N10-009 Certification Exam Objectives v4.0" (© 2023 CompTIA) — copy hosted at https://onlc.com/comptia/n10-009-exam-objectives.pdf (sha256 2c6c73e4…3e01); domain weights and exam code cross-checked on https://www.comptia.org/certifications/network (retrieved 2026-11-13). CompTIA-hosted PDF links returned HTML, not the PDF.
> CompTIA numbers objectives 1.1–5.5. **Bullet IDs such as `2.2-b3` are derived** (order of top-level bullets in the official document) so that each meaningful sub-objective can be assessed. Wording is paraphrased.

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


## 1. Coverage by domain

| Domain | Official weight | Topics | Training coverage | Lab coverage (relevance-weighted) |
|---|---:|---:|---:|---:|
| 1.0 Networking Concepts | 23% | 8 | 24.3% | 51.1% |
| 2.0 Network Implementation | 20% | 4 | 21.1% | 23.6% |
| 3.0 Network Operations | 19% | 5 | 7.0% | 7.0% |
| 4.0 Network Security | 14% | 3 | 4.5% | 7.9% |
| 5.0 Network Troubleshooting | 24% | 5 | 37.0% | 39.5% |
| **Weighted total** | 100% | | **20.7%** | **28.4%** |

Item counts: VERIFIED 37 · IMPLEMENTED_UNVERIFIED 0 · PARTIAL 23 · DIAGRAM_ONLY 7 · THEORY_ONLY 0 · MISSING 143 · UNKNOWN 0 — **210 assessed bullets** in **25 objectives**.

## 2. Compact matrix

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Outcome | Lab rel. | Status | Score | Priority | Phase(s) |
|---|---|---|---|---|---|:-:|---|---:|---|---|
| N+ | N10-009 | 1.0 (23%) | **1.1** | **OSI model concepts** | Explain | M | *(mean)* | **0.34** | P3 | CERT-Q2, CERT-P3-4 |
| N+ | N10-009 | 1.0 | 1.1-b1 | Layer 1 Physical — _link up/down/no-cable only_ | | | PARTIAL | 0.40 | P2 | CERT-P2-4 |
| N+ | N10-009 | 1.0 | 1.1-b2 | Layer 2 Data link | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.1-b3 | Layer 3 Network | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.1-b4 | Layer 4 Transport | | | MISSING | 0.00 | P3 | CERT-P3-4 |
| N+ | N10-009 | 1.0 | 1.1-b5 | Layer 5 Session | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.1-b6 | Layer 6 Presentation | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.1-b7 | Layer 7 Application | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 (23%) | **1.2** | **Networking appliances, applications and functions** | Compare | L | *(mean)* | **0.26** | P2 | CERT-Q2, CERT-P2-6 |
| N+ | N10-009 | 1.0 | 1.2-b1 | Router | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.2-b2 | Switch | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.2-b3 | Firewall | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-6 |
| N+ | N10-009 | 1.0 | 1.2-b4 | IDS/IPS | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b5 | Load balancer | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b6 | Proxy | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b7 | NAS — _IP host only_ | | | PARTIAL | 0.40 | P0 | CERT-P0-4 |
| N+ | N10-009 | 1.0 | 1.2-b8 | SAN | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b9 | Wireless AP | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-1 |
| N+ | N10-009 | 1.0 | 1.2-b10 | Wireless controller | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 1.0 | 1.2-b11 | CDN | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b12 | VPN | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b13 | QoS | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.2-b14 | TTL — _TTL per router crossed, traceroute_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 (23%) | **1.3** | **Cloud concepts and connectivity** | Summarize | L | *(mean)* | **0.00** | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b1 | NFV | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b2 | VPC | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b3 | Network security groups | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b4 | Network security lists | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b5 | Cloud gateways (internet, NAT) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b6 | Connectivity (VPN, Direct Connect) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b7 | Deployment models | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b8 | Service models | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b9 | Scalability | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b10 | Elasticity | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.3-b11 | Multitenancy | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 (23%) | **1.4** | **Ports, protocols, services and traffic types** | Explain | L | *(mean)* | **0.24** | P3 | CERT-Q2, CERT-P3-4 |
| N+ | N10-009 | 1.0 | 1.4-b1 | Well-known protocol/port table | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b2 | ICMP | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.4-b3 | TCP | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b4 | UDP | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b5 | GRE | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b6 | IPSec (AH, ESP, IKE) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b7 | Unicast | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.4-b8 | Multicast | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b9 | Anycast | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.4-b10 | Broadcast — _VLAN = broadcast domain; no broadcast traffic shown_ | | | PARTIAL | 0.40 | P3 | CERT-P3-4 |
| N+ | N10-009 | 1.0 (23%) | **1.5** | **Transmission media and transceivers** | Compare | L | *(mean)* | **0.00** | P2 | CERT-P2-4 |
| N+ | N10-009 | 1.0 | 1.5-b1 | Wireless (802.11, cellular, satellite) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 1.0 | 1.5-b2 | Wired (802.3, fiber types, DAC, coax, speeds, plenum) | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 1.0 | 1.5-b3 | Transceivers (protocol, SFP/QSFP) | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 1.0 | 1.5-b4 | Connector types | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 1.0 (23%) | **1.6** | **Topologies, architectures and types** | Compare | M | *(mean)* | **0.50** | P0 | CERT-P0-6, CERT-P0-5 |
| N+ | N10-009 | 1.0 | 1.6-b1 | Mesh | | | PARTIAL | 0.40 | P0 | CERT-P0-6 |
| N+ | N10-009 | 1.0 | 1.6-b2 | Hybrid | | | PARTIAL | 0.40 | P0 | CERT-P0-6 |
| N+ | N10-009 | 1.0 | 1.6-b3 | Star / hub and spoke | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.6-b4 | Spine and leaf | | | PARTIAL | 0.40 | P0 | CERT-P0-5 |
| N+ | N10-009 | 1.0 | 1.6-b5 | Point to point — _/30, /31 routed links_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.6-b6 | Three-tier hierarchical — _Campus 3 Tier sample, no redundancy_ | | | PARTIAL | 0.40 | P0 | CERT-P0-6 |
| N+ | N10-009 | 1.0 | 1.6-b7 | Collapsed core | | | PARTIAL | 0.40 | P0 | CERT-P0-6 |
| N+ | N10-009 | 1.0 | 1.6-b8 | Traffic flows (north-south, east-west) | | | MISSING | 0.00 | P0 | CERT-P0-6, CERT-P0-5 |
| N+ | N10-009 | 1.0 (23%) | **1.7** | **Use appropriate IPv4 addressing (scenario)** | Apply | H | *(mean)* | **0.60** | P0 | CERT-Q3, CERT-P0-4, CERT-P0-3 |
| N+ | N10-009 | 1.0 | 1.7-b1 | Public vs private (APIPA, RFC1918, loopback) — _loopback/0.x/224+ rejected as host addresses; no APIPA, no public/private semantics_ | | | PARTIAL | 0.40 | P0 | CERT-P0-4 |
| N+ | N10-009 | 1.0 | 1.7-b2 | Subnetting (VLSM, CIDR) | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 1.0 | 1.7-b3 | IPv4 address classes A–E — _class D/E rejected as host; classful grouping in show ip route; no class concept_ | | | PARTIAL | 0.40 | Quick win | CERT-Q3 |
| N+ | N10-009 | 1.0 (23%) | **1.8** | **Evolving use cases (SDN/SD-WAN, VXLAN, ZTA, SASE/SSE, IaC, IPv6)** | Summarize | L | *(mean)* | **0.00** | P1 | CERT-Q2, CERT-P1-1, CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b1 | SDN and SD-WAN | | | MISSING | 0.00 | P1 | CERT-Q2, CERT-P1-1, CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b2 | VXLAN | | | MISSING | 0.00 | P1 | CERT-Q2, CERT-P1-1, CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b3 | Zero trust architecture | | | MISSING | 0.00 | P1 | CERT-Q2, CERT-P1-1, CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b4 | SASE/SSE | | | MISSING | 0.00 | P1 | CERT-Q2, CERT-P1-1, CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b5 | Infrastructure as code (automation, source control) | | | MISSING | 0.00 | P3 | CERT-P3-1 |
| N+ | N10-009 | 1.0 | 1.8-b6 | IPv6 addressing (exhaustion, tunneling, dual stack, NAT64) | | | MISSING | 0.00 | P1 | CERT-P1-1 |
| N+ | N10-009 | 2.0 (20%) | **2.1** | **Characteristics of routing technologies** | Explain | M | *(mean)* | **0.38** | P0 | CERT-P0-5, CERT-P0-7, CERT-P0-3, CERT-P2-2, CERT-Q3 |
| N+ | N10-009 | 2.0 | 2.1-b1 | Static routing | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 | 2.1-b2 | Dynamic routing (BGP, EIGRP, OSPF) | | | MISSING | 0.00 | P0 | CERT-P0-5 |
| N+ | N10-009 | 2.0 | 2.1-b3 | Route selection: administrative distance | | | PARTIAL | 0.40 | P0 | CERT-P0-7 |
| N+ | N10-009 | 2.0 | 2.1-b4 | Route selection: prefix length — _CERT-Q3 A1-A8 (t.q3lpm): real-engine Cisco IPv4 LPM; not AD/metric/ECMP verification_ | | | VERIFIED | 1.00 | Quick win | CERT-Q3 |
| N+ | N10-009 | 2.0 | 2.1-b5 | Route selection: metric | | | MISSING | 0.00 | P0 | CERT-P0-5 |
| N+ | N10-009 | 2.0 | 2.1-b6 | Address translation (NAT, PAT) | | | MISSING | 0.00 | P0 | CERT-P0-3 |
| N+ | N10-009 | 2.0 | 2.1-b7 | FHRP | | | MISSING | 0.00 | P2 | CERT-P2-2 |
| N+ | N10-009 | 2.0 | 2.1-b8 | Virtual IP | | | MISSING | 0.00 | P2 | CERT-P2-2 |
| N+ | N10-009 | 2.0 | 2.1-b9 | Subinterfaces | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 (20%) | **2.2** | **Configure switching technologies and features (scenario)** | Configure | H | *(mean)* | **0.40** | P0 | CERT-P1-5, CERT-P1-3, CERT-P0-6 |
| N+ | N10-009 | 2.0 | 2.2-b1 | VLAN database | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 | 2.2-b2 | SVI | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 | 2.2-b3 | Native VLAN | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 | 2.2-b4 | Voice VLAN | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 2.0 | 2.2-b5 | 802.1Q tagging | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 2.0 | 2.2-b6 | Link aggregation | | | MISSING | 0.00 | P1 | CERT-P1-3 |
| N+ | N10-009 | 2.0 | 2.2-b7 | Speed | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 2.0 | 2.2-b8 | Duplex | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 2.0 | 2.2-b9 | Spanning tree | | | MISSING | 0.00 | P0 | CERT-P0-6 |
| N+ | N10-009 | 2.0 | 2.2-b10 | MTU / jumbo frames | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 2.0 (20%) | **2.3** | **Select and configure wireless devices and technologies (scenario)** | Configure | H | *(mean)* | **0.00** | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b1 | Channels | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b2 | Frequency options | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b3 | SSID/BSSID/ESSID | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b4 | Network types | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b5 | Encryption (WPA2, WPA3) | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b6 | Guest networks / captive portal | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b7 | Authentication (PSK vs enterprise) | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b8 | Antennas | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 | 2.3-b9 | Autonomous vs lightweight AP | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 2.0 (20%) | **2.4** | **Physical installation factors** | Explain | L | *(mean)* | **0.06** | P2 | CERT-P2-5, CERT-Q2 |
| N+ | N10-009 | 2.0 | 2.4-b1 | Locations (IDF, MDF) | | | MISSING | 0.00 | P2 | CERT-P2-5 |
| N+ | N10-009 | 2.0 | 2.4-b2 | Rack size | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-5 |
| N+ | N10-009 | 2.0 | 2.4-b3 | Port-side exhaust/intake | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 2.0 | 2.4-b4 | Cabling (patch panel, fiber panel) — _patch panel object, does not pass traffic_ | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-5 |
| N+ | N10-009 | 2.0 | 2.4-b5 | Lockable | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 2.0 | 2.4-b6 | Power (UPS, PDU, load, voltage) — _UPS object only_ | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-5 |
| N+ | N10-009 | 2.0 | 2.4-b7 | Environmental (humidity, fire, temperature) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 (19%) | **3.1** | **Organizational processes and procedures** | Explain | M | *(mean)* | **0.16** | P2 | CERT-P2-5, CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.1-b1 | Physical vs logical diagrams — _canvas is a logical diagram with physical objects_ | | | PARTIAL | 0.40 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b2 | Rack diagrams | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b3 | Cable maps and diagrams — _links with port labels_ | | | PARTIAL | 0.40 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b4 | Network diagrams L1/L2/L3 | | | PARTIAL | 0.40 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b5 | Asset inventory | | | MISSING | 0.00 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b6 | IPAM | | | MISSING | 0.00 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 | 3.1-b7 | SLA | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.1-b8 | Wireless survey / heat map | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.1-b9 | Life-cycle management | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.1-b10 | Change management | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.1-b11 | Configuration management (production, backup, baseline) — _running vs startup config, write memory, export/import_ | | | PARTIAL | 0.40 | P2 | CERT-P2-5 |
| N+ | N10-009 | 3.0 (19%) | **3.2** | **Use network monitoring technologies (scenario)** | Apply | H | *(mean)* | **0.07** | P1 | CERT-P1-6, CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b1 | SNMP (traps, MIB, v2c/v3, community, auth) | | | MISSING | 0.00 | P1 | CERT-P1-6 |
| N+ | N10-009 | 3.0 | 3.2-b2 | Flow data | | | MISSING | 0.00 | P1 | CERT-P1-6, CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b3 | Packet capture | | | MISSING | 0.00 | P3 | CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b4 | Baseline metrics / anomaly alerting | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 3.0 | 3.2-b5 | Log aggregation (syslog collector, SIEM) | | | MISSING | 0.00 | P1 | CERT-P1-6 |
| N+ | N10-009 | 3.0 | 3.2-b6 | API integration | | | MISSING | 0.00 | P3 | CERT-P3-1 |
| N+ | N10-009 | 3.0 | 3.2-b7 | Port mirroring | | | MISSING | 0.00 | P1 | CERT-P1-6, CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b8 | Network discovery | | | MISSING | 0.00 | P1 | CERT-P1-6, CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b9 | Traffic analysis | | | MISSING | 0.00 | P1 | CERT-P1-6, CERT-P3-4 |
| N+ | N10-009 | 3.0 | 3.2-b10 | Performance monitoring | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 3.0 | 3.2-b11 | Availability monitoring — _link status + Inspector + ping checks_ | | | PARTIAL | 0.40 | — | — |
| N+ | N10-009 | 3.0 | 3.2-b12 | Configuration monitoring — _challenge config-line / no-dup-ip checks_ | | | PARTIAL | 0.40 | — | — |
| N+ | N10-009 | 3.0 (19%) | **3.3** | **Disaster recovery concepts** | Explain | L | *(mean)* | **0.00** | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.3-b1 | DR metrics (RPO, RTO, MTTR, MTBF) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.3-b2 | DR sites | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.3-b3 | High availability (active-active/passive) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 | 3.3-b4 | Testing (tabletop, validation) | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 3.0 (19%) | **3.4** | **Implement IPv4 and IPv6 network services (scenario)** | Implement | H | *(mean)* | **0.00** | P0 | CERT-P0-4, CERT-P1-2, CERT-P1-6, CERT-P1-1 |
| N+ | N10-009 | 3.0 | 3.4-b1 | DHCP (reservations, scope, lease, options, relay, exclusions) | | | MISSING | 0.00 | P0 | CERT-P0-4 |
| N+ | N10-009 | 3.0 | 3.4-b2 | SLAAC | | | MISSING | 0.00 | P1 | CERT-P1-1 |
| N+ | N10-009 | 3.0 | 3.4-b3 | DNS (DNSSEC, DoH/DoT, records, zones, authoritative, recursive) | | | MISSING | 0.00 | P1 | CERT-P1-2 |
| N+ | N10-009 | 3.0 | 3.4-b4 | Hosts file | | | MISSING | 0.00 | P1 | CERT-P1-2 |
| N+ | N10-009 | 3.0 | 3.4-b5 | Time protocols (NTP, PTP, NTS) | | | MISSING | 0.00 | P1 | CERT-P1-6 |
| N+ | N10-009 | 3.0 (19%) | **3.5** | **Network access and management methods** | Compare | M | *(mean)* | **0.13** | P0 | CERT-P0-1, CERT-P3-2 |
| N+ | N10-009 | 3.0 | 3.5-b1 | Site-to-site VPN | | | MISSING | 0.00 | P3 | CERT-P3-2 |
| N+ | N10-009 | 3.0 | 3.5-b2 | Client-to-site VPN | | | MISSING | 0.00 | P3 | CERT-P3-2 |
| N+ | N10-009 | 3.0 | 3.5-b3 | SSH | | | MISSING | 0.00 | P0 | CERT-P0-1 |
| N+ | N10-009 | 3.0 | 3.5-b4 | GUI | | | MISSING | 0.00 | P0 | CERT-P0-1, CERT-P3-2 |
| N+ | N10-009 | 3.0 | 3.5-b5 | API | | | MISSING | 0.00 | P3 | CERT-P3-1 |
| N+ | N10-009 | 3.0 | 3.5-b6 | Console — _device console CLI_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 3.0 | 3.5-b7 | Jump box/host | | | MISSING | 0.00 | P0 | CERT-P0-1, CERT-P3-2 |
| N+ | N10-009 | 3.0 | 3.5-b8 | In-band vs out-of-band | | | MISSING | 0.00 | P0 | CERT-P0-1, CERT-P3-2 |
| N+ | N10-009 | 4.0 (14%) | **4.1** | **Basic network security concepts** | Explain | L | *(mean)* | **0.06** | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b1 | Encryption, certificates, IAM | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b2 | Geofencing | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b3 | Physical security | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b4 | Deception technologies | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b5 | Security terminology / CIA | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b6 | Audits and compliance | | | MISSING | 0.00 | P0 | CERT-Q2, CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.1-b7 | Network segmentation enforcement (IoT, OT, guest, BYOD) — _VLAN isolation verified incl. IoT endpoints; no enforcement policy_ | | | PARTIAL | 0.40 | P0 | CERT-P0-2 |
| N+ | N10-009 | 4.0 (14%) | **4.2** | **Types of attacks and their impact** | Summarize | L | *(mean)* | **0.00** | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b1 | DoS/DDoS | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b2 | VLAN hopping | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b3 | MAC flooding | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b4 | ARP poisoning/spoofing | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b5 | DNS poisoning/spoofing | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b6 | Rogue DHCP / AP, evil twin | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b7 | On-path attack | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b8 | Social engineering | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 | 4.2-b9 | Malware | | | MISSING | 0.00 | Quick win | CERT-Q2 |
| N+ | N10-009 | 4.0 (14%) | **4.3** | **Apply security features, defenses and solutions (scenario)** | Apply | H | *(mean)* | **0.08** | P0 | CERT-P0-1, CERT-P0-2, CERT-P1-4, CERT-P2-6 |
| N+ | N10-009 | 4.0 | 4.3-b1 | Disable unused ports and services — _shutdown verified; services n/a_ | | | PARTIAL | 0.40 | P0 | CERT-P0-1 |
| N+ | N10-009 | 4.0 | 4.3-b2 | Change default passwords | | | MISSING | 0.00 | P0 | CERT-P0-1 |
| N+ | N10-009 | 4.0 | 4.3-b3 | NAC: port security, 802.1X, MAC filtering | | | MISSING | 0.00 | P1 | CERT-P1-4 |
| N+ | N10-009 | 4.0 | 4.3-b4 | Key management | | | MISSING | 0.00 | P0 | CERT-P0-1, CERT-P0-2, CERT-P1-4, CERT-P2-6 |
| N+ | N10-009 | 4.0 | 4.3-b5 | ACL | | | MISSING | 0.00 | P0 | CERT-P0-2 |
| N+ | N10-009 | 4.0 | 4.3-b6 | URL / content filtering | | | MISSING | 0.00 | P0 | CERT-P0-1, CERT-P0-2, CERT-P1-4, CERT-P2-6 |
| N+ | N10-009 | 4.0 | 4.3-b7 | Zones (trusted/untrusted, screened subnet) — _firewall object has LAN/WAN/DMZ ports, no policy_ | | | DIAGRAM_ONLY | 0.15 | P2 | CERT-P2-6 |
| N+ | N10-009 | 5.0 (24%) | **5.1** | **Troubleshooting methodology** | Explain | M | *(mean)* | **0.54** | Quick win | CERT-Q1 |
| N+ | N10-009 | 5.0 | 5.1-b1 | Identify the problem — _Check shows failing checks; hints_ | | | PARTIAL | 0.40 | Quick win | CERT-Q1 |
| N+ | N10-009 | 5.0 | 5.1-b2 | Establish a theory | | | PARTIAL | 0.40 | Quick win | CERT-Q1 |
| N+ | N10-009 | 5.0 | 5.1-b3 | Test the theory — _ping/traceroute/show + checks_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.1-b4 | Plan of action | | | MISSING | 0.00 | Quick win | CERT-Q1 |
| N+ | N10-009 | 5.0 | 5.1-b5 | Implement or escalate — _fixing via CLI turns checks green_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.1-b6 | Verify full functionality — _Check re-evaluates live Lab_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.1-b7 | Document findings | | | MISSING | 0.00 | Quick win | CERT-Q1 |
| N+ | N10-009 | 5.0 (24%) | **5.2** | **Troubleshoot cabling and physical interface issues (scenario)** | Troubleshoot | H | *(mean)* | **0.13** | P1 | CERT-P1-5, CERT-P2-4 |
| N+ | N10-009 | 5.0 | 5.2-b1 | Incorrect cable type | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 5.0 | 5.2-b2 | Signal degradation | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 5.0 | 5.2-b3 | Improper termination / TX-RX transposed | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 5.0 | 5.2-b4 | Interface counters (CRC, runts, giants, drops) | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 5.0 | 5.2-b5 | Port status: administratively down | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.2-b6 | Port status: error disabled / suspended | | | MISSING | 0.00 | P1 | CERT-P1-5 |
| N+ | N10-009 | 5.0 | 5.2-b7 | PoE (budget, standard) | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 5.0 | 5.2-b8 | Transceivers (mismatch, signal) | | | MISSING | 0.00 | P2 | CERT-P2-4 |
| N+ | N10-009 | 5.0 (24%) | **5.3** | **Troubleshoot network service issues (scenario)** | Troubleshoot | H | *(mean)* | **0.67** | P0 | CERT-P0-6, CERT-P0-2, CERT-P0-4 |
| N+ | N10-009 | 5.0 | 5.3-b1 | STP (loops, root, roles, states) | | | MISSING | 0.00 | P0 | CERT-P0-6 |
| N+ | N10-009 | 5.0 | 5.3-b2 | Incorrect VLAN assignment | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.3-b3 | ACLs | | | MISSING | 0.00 | P0 | CERT-P0-2 |
| N+ | N10-009 | 5.0 | 5.3-b4 | Route selection: routing table | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.3-b5 | Route selection: default routes | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.3-b6 | Address pool exhaustion | | | MISSING | 0.00 | P0 | CERT-P0-4 |
| N+ | N10-009 | 5.0 | 5.3-b7 | Incorrect default gateway | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.3-b8 | Incorrect IP / duplicate IP | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.3-b9 | Incorrect subnet mask — _Challenge 5 PC mask /30_ | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 (24%) | **5.4** | **Troubleshoot performance issues (scenario)** | Troubleshoot | M | *(mean)* | **0.00** | P2 | CERT-P3-3, CERT-P2-1 |
| N+ | N10-009 | 5.0 | 5.4-b1 | Congestion/contention, bottlenecking | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 5.0 | 5.4-b2 | Bandwidth / throughput | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 5.0 | 5.4-b3 | Latency | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 5.0 | 5.4-b4 | Packet loss | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 5.0 | 5.4-b5 | Jitter | | | MISSING | 0.00 | P3 | CERT-P3-3 |
| N+ | N10-009 | 5.0 | 5.4-b6 | Wireless (interference, coverage, roaming) | | | MISSING | 0.00 | P2 | CERT-P2-1 |
| N+ | N10-009 | 5.0 (24%) | **5.5** | **Use appropriate tools and protocols (scenario)** | Apply | H | *(mean)* | **0.52** | P2 | CERT-Q4, CERT-P2-3, CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b1 | Protocol analyzer | | | MISSING | 0.00 | P3 | CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b2 | ping | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b3 | traceroute/tracert | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b4 | nslookup / dig | | | MISSING | 0.00 | P1 | CERT-P1-2 |
| N+ | N10-009 | 5.0 | 5.5-b5 | tcpdump | | | MISSING | 0.00 | P3 | CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b6 | netstat | | | MISSING | 0.00 | P2 | CERT-P2-3 |
| N+ | N10-009 | 5.0 | 5.5-b7 | ip/ifconfig/ipconfig — _ipconfig only_ | | | PARTIAL | 0.40 | P2 | CERT-P2-3 |
| N+ | N10-009 | 5.0 | 5.5-b8 | arp | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b9 | Nmap | | | MISSING | 0.00 | P2 | CERT-Q4, CERT-P2-3, CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b10 | LLDP/CDP — _CDP on Cisco IOS only (show cdp neighbors [detail], t.cdp); LLDP missing_ | | | PARTIAL | 0.40 | Quick win | CERT-Q4 |
| N+ | N10-009 | 5.0 | 5.5-b11 | Speed tester | | | MISSING | 0.00 | P2 | CERT-Q4, CERT-P2-3, CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b12 | Hardware tools (toner, cable tester, taps, Wi-Fi analyzer, VFL) | | | MISSING | 0.00 | P2 | CERT-Q4, CERT-P2-3, CERT-P3-4 |
| N+ | N10-009 | 5.0 | 5.5-b13 | show mac-address-table | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b14 | show route | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b15 | show interface | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b16 | show config | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b17 | show arp | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b18 | show vlan | | | VERIFIED | 1.00 | — | — |
| N+ | N10-009 | 5.0 | 5.5-b19 | show power | | | MISSING | 0.00 | P2 | CERT-Q4, CERT-P2-3, CERT-P3-4 |

## 3. Objective cards (all 24 required fields)

### 1.1 — OSI model concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.1 (derived bullets 1.1-b1 … 1.1-b7) |
| 6 | Objective summary | OSI model concepts (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Layer 1 Physical; Layer 2 Data link; Layer 3 Network; Layer 4 Transport; Layer 5 Session; Layer 6 Presentation; Layer 7 Application |
| 10 | Existing application capability | Layer 1 Physical (PARTIAL: link up/down/no-cable only); Layer 2 Data link (VERIFIED); Layer 3 Network (VERIFIED) |
| 11 | Device support | all simulated devices |
| 12 | CLI support | show/ping/traceroute |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.ping` tests/network.test.ts:21-150<br>`t.ping` tests/audit-phase-a.test.ts:77-194 |
| 15 | E2E test evidence | `t.vlan` e2e/app.spec.ts:75<br>`t.ping` e2e/app.spec.ts:26, :99 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.1-b1 PARTIAL; 1.1-b2 VERIFIED; 1.1-b3 VERIFIED; 1.1-b4 MISSING; 1.1-b5 MISSING; 1.1-b6 MISSING; 1.1-b7 MISSING |
| 18 | Coverage score | 0.34 |
| 19 | Missing functionality | Layer 1 Physical; Layer 4 Transport; Layer 5 Session; Layer 6 Presentation; Layer 7 Application |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)); CERT-P3-4 (Packet/frame view (capture-style)) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.2 — Networking appliances, applications and functions

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.2 (derived bullets 1.2-b1 … 1.2-b14) |
| 6 | Objective summary | Networking appliances, applications and functions (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Router; Switch; Firewall; IDS/IPS; Load balancer; Proxy; NAS; SAN; Wireless AP; Wireless controller; CDN; VPN; QoS; TTL |
| 10 | Existing application capability | Router (VERIFIED); Switch (VERIFIED); Firewall (DIAGRAM_ONLY); NAS (PARTIAL: IP host only); Wireless AP (DIAGRAM_ONLY); TTL (VERIFIED: TTL per router crossed, traceroute) |
| 11 | Device support | routers, switches, nas(partial), firewall/AP(diagram) |
| 12 | CLI support | ping (TTL) |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109<br>`t.endpoint` tests/endpoint-devices.test.ts:74, :92, :112<br>`t.endpoint` tests/device-capability.test.ts:136 (server = IP host only)<br>`t.ttl` tests/audit-phase-a.test.ts:77-104 (TTL 128/125/255/64 per routers crossed)<br>`t.trace` tests/traceroute.test.ts:118-223<br>`t.trace` tests/endpoint-devices.test.ts:92 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104<br>`t.endpoint` e2e/endpoint-devices.spec.ts:100<br>`t.trace` e2e/endpoint-routing.spec.ts:147 (3c9aed7) |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.2-b1 VERIFIED; 1.2-b2 VERIFIED; 1.2-b3 DIAGRAM_ONLY; 1.2-b4 MISSING; 1.2-b5 MISSING; 1.2-b6 MISSING; 1.2-b7 PARTIAL; 1.2-b8 MISSING; 1.2-b9 DIAGRAM_ONLY; 1.2-b10 MISSING; 1.2-b11 MISSING; 1.2-b12 MISSING; 1.2-b13 MISSING; 1.2-b14 VERIFIED |
| 18 | Coverage score | 0.26 |
| 19 | Missing functionality | Firewall; IDS/IPS; Load balancer; Proxy; NAS; SAN; Wireless AP; Wireless controller; CDN; VPN; QoS |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)); CERT-P2-6 (Firewall zone policy) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.3 — Cloud concepts and connectivity

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.3 (derived bullets 1.3-b1 … 1.3-b11) |
| 6 | Objective summary | Cloud concepts and connectivity (paraphrase) |
| 7 | Learning outcome | Summarize |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: NFV; VPC; Network security groups; Network security lists; Cloud gateways (internet, NAT); Connectivity (VPN, Direct Connect); Deployment models; Service models; Scalability; Elasticity; Multitenancy |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.3-b1 MISSING; 1.3-b2 MISSING; 1.3-b3 MISSING; 1.3-b4 MISSING; 1.3-b5 MISSING; 1.3-b6 MISSING; 1.3-b7 MISSING; 1.3-b8 MISSING; 1.3-b9 MISSING; 1.3-b10 MISSING; 1.3-b11 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | NFV; VPC; Network security groups; Network security lists; Cloud gateways (internet, NAT); Connectivity (VPN, Direct Connect); Deployment models; Service models; Scalability; Elasticity; Multitenancy |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)) |
| 22 | Estimated complexity | S |
| 23 | Development priority | Quick win |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.4 — Ports, protocols, services and traffic types

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.4 (derived bullets 1.4-b1 … 1.4-b10) |
| 6 | Objective summary | Ports, protocols, services and traffic types (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Well-known protocol/port table; ICMP; TCP; UDP; GRE; IPSec (AH, ESP, IKE); Unicast; Multicast; Anycast; Broadcast |
| 10 | Existing application capability | ICMP (VERIFIED); Unicast (VERIFIED); Broadcast (PARTIAL: VLAN = broadcast domain; no broadcast traffic shown) |
| 11 | Device support | hosts, routers |
| 12 | CLI support | ping |
| 13 | Source file evidence | `s.ping` src/core/network.ts — ping() l.711, trace() l.624 |
| 14 | Unit test evidence | `t.ping` tests/network.test.ts:21-150<br>`t.ping` tests/audit-phase-a.test.ts:77-194 |
| 15 | E2E test evidence | `t.ping` e2e/app.spec.ts:26, :99 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.4-b1 MISSING; 1.4-b2 VERIFIED; 1.4-b3 MISSING; 1.4-b4 MISSING; 1.4-b5 MISSING; 1.4-b6 MISSING; 1.4-b7 VERIFIED; 1.4-b8 MISSING; 1.4-b9 MISSING; 1.4-b10 PARTIAL |
| 18 | Coverage score | 0.24 |
| 19 | Missing functionality | Well-known protocol/port table; TCP; UDP; GRE; IPSec (AH, ESP, IKE); Multicast; Anycast; Broadcast |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)); CERT-P3-4 (Packet/frame view (capture-style)) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P3 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.5 — Transmission media and transceivers

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.5 (derived bullets 1.5-b1 … 1.5-b4) |
| 6 | Objective summary | Transmission media and transceivers (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Wireless (802.11, cellular, satellite); Wired (802.3, fiber types, DAC, coax, speeds, plenum); Transceivers (protocol, SFP/QSFP); Connector types |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.5-b1 MISSING; 1.5-b2 MISSING; 1.5-b3 MISSING; 1.5-b4 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Wireless (802.11, cellular, satellite); Wired (802.3, fiber types, DAC, coax, speeds, plenum); Transceivers (protocol, SFP/QSFP); Connector types |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-4 (Physical layer (cable/media types, PoE, transceivers)) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 1.6 — Topologies, architectures and types

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.6 (derived bullets 1.6-b1 … 1.6-b8) |
| 6 | Objective summary | Topologies, architectures and types (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Mesh; Hybrid; Star / hub and spoke; Spine and leaf; Point to point; Three-tier hierarchical; Collapsed core; Traffic flows (north-south, east-west) |
| 10 | Existing application capability | Mesh (PARTIAL); Hybrid (PARTIAL); Star / hub and spoke (VERIFIED); Spine and leaf (PARTIAL); Point to point (VERIFIED: /30, /31 routed links); Three-tier hierarchical (PARTIAL: Campus 3 Tier sample, no redundancy); Collapsed core (PARTIAL) |
| 11 | Device support | routers, L3/L2 switches, hosts |
| 12 | CLI support | ip address, ip route |
| 13 | Source file evidence | `s.samples` src/core/sample.ts — 10 sample Labs incl. 7 graded challenges; src/core/sampleGuides.ts |
| 14 | Unit test evidence | `t.campus3` tests/campus3.test.ts:13-93<br>`t.routed` tests/l3.test.ts:321, :332<br>`t.routed` tests/campus3.test.ts:23 "uses /31 routed links and SVI gateways"<br>`t.routed` tests/samples.test.ts:141<br>`t.topo` tests/network.test.ts:9 |
| 15 | E2E test evidence | `t.campus3` e2e/campus3.spec.ts:3<br>`t.topo` e2e/app.spec.ts:124, :161, :174<br>`t.topo` e2e/devices.spec.ts:21 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.6-b1 PARTIAL; 1.6-b2 PARTIAL; 1.6-b3 VERIFIED; 1.6-b4 PARTIAL; 1.6-b5 VERIFIED; 1.6-b6 PARTIAL; 1.6-b7 PARTIAL; 1.6-b8 MISSING |
| 18 | Coverage score | 0.50 |
| 19 | Missing functionality | Mesh; Hybrid; Spine and leaf; Three-tier hierarchical; Collapsed core; Traffic flows (north-south, east-west) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-6 (STP / Rapid PVST+); CERT-P0-5 (Single-area OSPFv2) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.7 — Use appropriate IPv4 addressing (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.7 (derived bullets 1.7-b1 … 1.7-b3) |
| 6 | Objective summary | Use appropriate IPv4 addressing (scenario) (paraphrase) |
| 7 | Learning outcome | Apply |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Public vs private (APIPA, RFC1918, loopback); Subnetting (VLSM, CIDR); IPv4 address classes A–E |
| 10 | Existing application capability | Public vs private (APIPA, RFC1918, loopback) (PARTIAL: loopback/0.x/224+ rejected as host addresses; no APIPA, no public/private semantics); Subnetting (VLSM, CIDR) (VERIFIED); IPv4 address classes A–E (PARTIAL: class D/E rejected as host; classful grouping in show ip route; no class concept) |
| 11 | Device support | all IP devices |
| 12 | CLI support | ip address, PC IP form, ipconfig |
| 13 | Source file evidence | `s.ip` src/core/ip.ts — isValidMask() l.18, isHostAddress() l.46 (rejects 0.x, 127.x, >=224), subnetsOverlap() l.57, parseCidr() l.72 |
| 14 | Unit test evidence | `t.ipval` tests/cli.test.ts:49 "router rejects bad mask, overlapping subnet …"<br>`t.ipval` tests/l3.test.ts:311, :321<br>`t.addrchal` tests/samples.test.ts:151 "Challenge 5: addressing faults" (dot1Q, PC mask /30, WAN IP)<br>`t.routed` tests/l3.test.ts:321, :332<br>`t.routed` tests/campus3.test.ts:23 "uses /31 routed links and SVI gateways"<br>`t.routed` tests/samples.test.ts:141 |
| 15 | E2E test evidence | `t.ipval` e2e/app.spec.ts:113 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 1.7-b1 PARTIAL; 1.7-b2 VERIFIED; 1.7-b3 PARTIAL |
| 18 | Coverage score | 0.60 |
| 19 | Missing functionality | Public vs private (APIPA, RFC1918, loopback); IPv4 address classes A–E |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q3 (Tests for implemented-but-unverified behaviour (LPM, host route, class D/E, %LINK messages)); CERT-P0-4 (DHCP server/client/relay (= DEV-01D part)); CERT-P0-3 (NAT/PAT + routable internet edge) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 1.8 — Evolving use cases (SDN/SD-WAN, VXLAN, ZTA, SASE/SSE, IaC, IPv6)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 1.0 Networking Concepts |
| 4 | Domain weight | 23% |
| 5 | Objective ID | 1.8 (derived bullets 1.8-b1 … 1.8-b6) |
| 6 | Objective summary | Evolving use cases (SDN/SD-WAN, VXLAN, ZTA, SASE/SSE, IaC, IPv6) (paraphrase) |
| 7 | Learning outcome | Summarize |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: SDN and SD-WAN; VXLAN; Zero trust architecture; SASE/SSE; Infrastructure as code (automation, source control); IPv6 addressing (exhaustion, tunneling, dual stack, NAT64) |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 1.8-b1 MISSING; 1.8-b2 MISSING; 1.8-b3 MISSING; 1.8-b4 MISSING; 1.8-b5 MISSING; 1.8-b6 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | SDN and SD-WAN; VXLAN; Zero trust architecture; SASE/SSE; Infrastructure as code (automation, source control); IPv6 addressing (exhaustion, tunneling, dual stack, NAT64) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)); CERT-P1-1 (IPv6 (addressing, static, ping/traceroute v6)); CERT-P3-1 (Automation view (JSON config, REST-style API, playbook runner)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.1 — Characteristics of routing technologies

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 2.0 Network Implementation |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.1 (derived bullets 2.1-b1 … 2.1-b9) |
| 6 | Objective summary | Characteristics of routing technologies (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Static routing; Dynamic routing (BGP, EIGRP, OSPF); Route selection: administrative distance; Route selection: prefix length; Route selection: metric; Address translation (NAT, PAT); FHRP; Virtual IP; Subinterfaces |
| 10 | Existing application capability | Static routing (VERIFIED); Route selection: administrative distance (PARTIAL); Route selection: prefix length (VERIFIED: CERT-Q3 A1-A8 (t.q3lpm): real-engine Cisco IPv4 LPM; not AD/metric/ECMP verification); Subinterfaces (VERIFIED) |
| 11 | Device support | routers, AOS-CX switches |
| 12 | CLI support | ip route, encapsulation dot1Q, show ip route |
| 13 | Source file evidence | `s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532 |
| 14 | Unit test evidence | `t.static` tests/l3.test.ts:165, :182, :192, :206, :217<br>`t.static` tests/campus3.test.ts:70<br>`t.default` tests/l3.test.ts:200 "default route S* is shown on R2" (asserts "Gateway of last resort is 10.0.0.1 …")<br>`t.intervlan` tests/l3.test.ts:114-156 (router-on-a-stick), :244 "Aruba switch routes between VLANs when it is the gateway"<br>`t.q3lpm` tests/route-selection.test.ts:101, :110, :116, :127, :140, :147, :158, :174 -- CERT-Q3 A1-A8: real IOS CLI + trace/ping, overlapping prefixes, order independence, connected tie, missing route, down next-hop fallback, deterministic export/import; Cisco router only; no ECMP/AD/metric fidelity claim |
| 15 | E2E test evidence | `t.static` e2e/app.spec.ts:366<br>`t.default` e2e/app.spec.ts:366 (asserts "Gateway of last resort is not set")<br>`t.intervlan` e2e/app.spec.ts:385, :410 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 2.1-b1 VERIFIED; 2.1-b2 MISSING; 2.1-b3 PARTIAL; 2.1-b4 VERIFIED; 2.1-b5 MISSING; 2.1-b6 MISSING; 2.1-b7 MISSING; 2.1-b8 MISSING; 2.1-b9 VERIFIED |
| 18 | Coverage score | 0.38 |
| 19 | Missing functionality | Dynamic routing (BGP, EIGRP, OSPF); Route selection: administrative distance; Route selection: metric; Address translation (NAT, PAT); FHRP; Virtual IP |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-5 (Single-area OSPFv2); CERT-P0-7 (Administrative distance & floating static); CERT-P0-3 (NAT/PAT + routable internet edge); CERT-P2-2 (FHRP (HSRP/VRRP)); CERT-Q3 (Tests for implemented-but-unverified behaviour (LPM, host route, class D/E, %LINK messages)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.2 — Configure switching technologies and features (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 2.0 Network Implementation |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.2 (derived bullets 2.2-b1 … 2.2-b10) |
| 6 | Objective summary | Configure switching technologies and features (scenario) (paraphrase) |
| 7 | Learning outcome | Configure |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: VLAN database; SVI; Native VLAN; Voice VLAN; 802.1Q tagging; Link aggregation; Speed; Duplex; Spanning tree; MTU / jumbo frames |
| 10 | Existing application capability | VLAN database (VERIFIED); SVI (VERIFIED); Native VLAN (VERIFIED); 802.1Q tagging (VERIFIED) |
| 11 | Device support | cisco-switch, aruba-switch, l3-switch |
| 12 | CLI support | vlan, switchport, vlan access/trunk, interface vlan |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78 |
| 14 | Unit test evidence | `t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.svi` tests/l3.test.ts:257, :268, :278, :294, :303, :311<br>`t.native` tests/l3.test.ts:70 "native VLAN: … a mismatch leaks VLANs"<br>`t.native` tests/native-vlan.test.ts:68-167<br>`t.trunk` tests/l3.test.ts:38, :50, :62, :89, :103<br>`t.trunk` tests/challenge.test.ts:131 |
| 15 | E2E test evidence | `t.vlan` e2e/app.spec.ts:75<br>`t.native` e2e/native-vlan.spec.ts:4<br>`t.trunk` e2e/app.spec.ts:339 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 2.2-b1 VERIFIED; 2.2-b2 VERIFIED; 2.2-b3 VERIFIED; 2.2-b4 MISSING; 2.2-b5 VERIFIED; 2.2-b6 MISSING; 2.2-b7 MISSING; 2.2-b8 MISSING; 2.2-b9 MISSING; 2.2-b10 MISSING |
| 18 | Coverage score | 0.40 |
| 19 | Missing functionality | Voice VLAN; Link aggregation; Speed; Duplex; Spanning tree; MTU / jumbo frames |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-5 (Interface speed/duplex/errors, err-disabled, voice VLAN); CERT-P1-3 (EtherChannel / LACP); CERT-P0-6 (STP / Rapid PVST+) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.3 — Select and configure wireless devices and technologies (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 2.0 Network Implementation |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.3 (derived bullets 2.3-b1 … 2.3-b9) |
| 6 | Objective summary | Select and configure wireless devices and technologies (scenario) (paraphrase) |
| 7 | Learning outcome | Configure |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Channels; Frequency options; SSID/BSSID/ESSID; Network types; Encryption (WPA2, WPA3); Guest networks / captive portal; Authentication (PSK vs enterprise); Antennas; Autonomous vs lightweight AP |
| 10 | Existing application capability | None |
| 11 | Device support | wireless-ap(diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 2.3-b1 MISSING; 2.3-b2 MISSING; 2.3-b3 MISSING; 2.3-b4 MISSING; 2.3-b5 MISSING; 2.3-b6 MISSING; 2.3-b7 MISSING; 2.3-b8 MISSING; 2.3-b9 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Channels; Frequency options; SSID/BSSID/ESSID; Network types; Encryption (WPA2, WPA3); Guest networks / captive portal; Authentication (PSK vs enterprise); Antennas; Autonomous vs lightweight AP |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-1 (Wireless (AP bridge, SSID/WPA2-PSK, WLC GUI)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 2.4 — Physical installation factors

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 2.0 Network Implementation |
| 4 | Domain weight | 20% |
| 5 | Objective ID | 2.4 (derived bullets 2.4-b1 … 2.4-b7) |
| 6 | Objective summary | Physical installation factors (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Locations (IDF, MDF); Rack size; Port-side exhaust/intake; Cabling (patch panel, fiber panel); Lockable; Power (UPS, PDU, load, voltage); Environmental (humidity, fire, temperature) |
| 10 | Existing application capability | Rack size (DIAGRAM_ONLY); Cabling (patch panel, fiber panel) (DIAGRAM_ONLY: patch panel object, does not pass traffic); Power (UPS, PDU, load, voltage) (DIAGRAM_ONLY: UPS object only) |
| 11 | Device support | rack, ups, patch-panel (diagram) |
| 12 | CLI support | — |
| 13 | Source file evidence | `s.prof` src/core/profiles.ts — 19 device kinds; simLevel full(7)/partial(6)/diagram(6) |
| 14 | Unit test evidence | `t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 2.4-b1 MISSING; 2.4-b2 DIAGRAM_ONLY; 2.4-b3 MISSING; 2.4-b4 DIAGRAM_ONLY; 2.4-b5 MISSING; 2.4-b6 DIAGRAM_ONLY; 2.4-b7 MISSING |
| 18 | Coverage score | 0.06 |
| 19 | Missing functionality | Locations (IDF, MDF); Rack size; Port-side exhaust/intake; Cabling (patch panel, fiber panel); Lockable; Power (UPS, PDU, load, voltage); Environmental (humidity, fire, temperature) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-5 (Documentation objects (zones, IDF/MDF, rack/cable maps, IPAM view)); CERT-Q2 (Concept notes for describe-level objectives (content only)) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 3.1 — Organizational processes and procedures

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 3.0 Network Operations |
| 4 | Domain weight | 19% |
| 5 | Objective ID | 3.1 (derived bullets 3.1-b1 … 3.1-b11) |
| 6 | Objective summary | Organizational processes and procedures (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Physical vs logical diagrams; Rack diagrams; Cable maps and diagrams; Network diagrams L1/L2/L3; Asset inventory; IPAM; SLA; Wireless survey / heat map; Life-cycle management; Change management; Configuration management (production, backup, baseline) |
| 10 | Existing application capability | Physical vs logical diagrams (PARTIAL: canvas is a logical diagram with physical objects); Rack diagrams (DIAGRAM_ONLY); Cable maps and diagrams (PARTIAL: links with port labels); Network diagrams L1/L2/L3 (PARTIAL); Configuration management (production, backup, baseline) (PARTIAL: running vs startup config, write memory, export/import) |
| 11 | Device support | all (canvas) |
| 12 | CLI support | show running-config, write memory, copy run start, export/import |
| 13 | Source file evidence | `s.ui` src/components/Canvas.tsx, Palette.tsx, Console.tsx, Inspector.tsx, CommandLibrary.tsx, ChallengePanel.tsx, GuidePanel.tsx, FileManager.tsx<br>`s.persist` src/core/persist.ts — validateLab() l.216, serializeExport() l.242, parseImport() l.246 (JSON, schemaVersion 1; baseline 51251c0 — they were l.211 / l.223 / l.227 at 950fb0c, shifted by CERT-P0-1a); withoutTransient() l.229 (a pending credential prompt is never stored or exported); optional security.enableSecret schema l.76 (type-5 hash only) |
| 14 | Unit test evidence | `t.config` tests/cli.test.ts:20, :98 "write memory fills startup-config", :104<br>`t.config` tests/challenge.test.ts:117<br>`t.config` tests/persist.test.ts:10<br>`t.topo` tests/network.test.ts:9 |
| 15 | E2E test evidence | `t.config` e2e/safety.spec.ts:14<br>`t.config` e2e/app.spec.ts:216, :234<br>`t.topo` e2e/app.spec.ts:124, :161, :174<br>`t.topo` e2e/devices.spec.ts:21 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.1-b1 PARTIAL; 3.1-b2 DIAGRAM_ONLY; 3.1-b3 PARTIAL; 3.1-b4 PARTIAL; 3.1-b5 MISSING; 3.1-b6 MISSING; 3.1-b7 MISSING; 3.1-b8 MISSING; 3.1-b9 MISSING; 3.1-b10 MISSING; 3.1-b11 PARTIAL |
| 18 | Coverage score | 0.16 |
| 19 | Missing functionality | Physical vs logical diagrams; Rack diagrams; Cable maps and diagrams; Network diagrams L1/L2/L3; Asset inventory; IPAM; SLA; Wireless survey / heat map; Life-cycle management; Change management; Configuration management (production, backup, baseline) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P2-5 (Documentation objects (zones, IDF/MDF, rack/cable maps, IPAM view)); CERT-Q2 (Concept notes for describe-level objectives (content only)) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 3.2 — Use network monitoring technologies (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 3.0 Network Operations |
| 4 | Domain weight | 19% |
| 5 | Objective ID | 3.2 (derived bullets 3.2-b1 … 3.2-b12) |
| 6 | Objective summary | Use network monitoring technologies (scenario) (paraphrase) |
| 7 | Learning outcome | Apply |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: SNMP (traps, MIB, v2c/v3, community, auth); Flow data; Packet capture; Baseline metrics / anomaly alerting; Log aggregation (syslog collector, SIEM); API integration; Port mirroring; Network discovery; Traffic analysis; Performance monitoring; Availability monitoring; Configuration monitoring |
| 10 | Existing application capability | Availability monitoring (PARTIAL: link status + Inspector + ping checks); Configuration monitoring (PARTIAL: challenge config-line / no-dup-ip checks) |
| 11 | Device support | — |
| 12 | CLI support | Inspector, challenge checks |
| 13 | Source file evidence | `s.chal` src/core/challenge.ts — evaluateCheck() l.79; check kinds ping/link-up/config-line/trunk-vlan/port-admin/route/no-dup-ip (src/core/types.ts l.125-137)<br>`s.ui` src/components/Canvas.tsx, Palette.tsx, Console.tsx, Inspector.tsx, CommandLibrary.tsx, ChallengePanel.tsx, GuidePanel.tsx, FileManager.tsx |
| 14 | Unit test evidence | `t.chal` tests/challenge.test.ts:12, :30, :46<br>`t.chal` tests/campus3.test.ts:93<br>`t.link` tests/network.test.ts:30, :45, :150<br>`t.link` tests/challenge.test.ts:60, :145 |
| 15 | E2E test evidence | `t.chal` e2e/challenge.spec.ts:19, :56<br>`t.chal` e2e/challenges-more.spec.ts:24-92<br>`t.chal` e2e/l2.spec.ts:68<br>`t.chal` e2e/hints-tab.spec.ts:8<br>`t.link` e2e/app.spec.ts:26 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.2-b1 MISSING; 3.2-b2 MISSING; 3.2-b3 MISSING; 3.2-b4 MISSING; 3.2-b5 MISSING; 3.2-b6 MISSING; 3.2-b7 MISSING; 3.2-b8 MISSING; 3.2-b9 MISSING; 3.2-b10 MISSING; 3.2-b11 PARTIAL; 3.2-b12 PARTIAL |
| 18 | Coverage score | 0.07 |
| 19 | Missing functionality | SNMP (traps, MIB, v2c/v3, community, auth); Flow data; Packet capture; Baseline metrics / anomaly alerting; Log aggregation (syslog collector, SIEM); API integration; Port mirroring; Network discovery; Traffic analysis; Performance monitoring; Availability monitoring; Configuration monitoring |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-6 (NTP, syslog configuration, SNMP basics); CERT-P3-4 (Packet/frame view (capture-style)) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.3 — Disaster recovery concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 3.0 Network Operations |
| 4 | Domain weight | 19% |
| 5 | Objective ID | 3.3 (derived bullets 3.3-b1 … 3.3-b4) |
| 6 | Objective summary | Disaster recovery concepts (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: DR metrics (RPO, RTO, MTTR, MTBF); DR sites; High availability (active-active/passive); Testing (tabletop, validation) |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.3-b1 MISSING; 3.3-b2 MISSING; 3.3-b3 MISSING; 3.3-b4 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | DR metrics (RPO, RTO, MTTR, MTBF); DR sites; High availability (active-active/passive); Testing (tabletop, validation) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)) |
| 22 | Estimated complexity | S |
| 23 | Development priority | Quick win |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 3.4 — Implement IPv4 and IPv6 network services (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 3.0 Network Operations |
| 4 | Domain weight | 19% |
| 5 | Objective ID | 3.4 (derived bullets 3.4-b1 … 3.4-b5) |
| 6 | Objective summary | Implement IPv4 and IPv6 network services (scenario) (paraphrase) |
| 7 | Learning outcome | Implement |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: DHCP (reservations, scope, lease, options, relay, exclusions); SLAAC; DNS (DNSSEC, DoH/DoT, records, zones, authoritative, recursive); Hosts file; Time protocols (NTP, PTP, NTS) |
| 10 | Existing application capability | None |
| 11 | Device support | server(partial) |
| 12 | CLI support | ipconfig (DHCP Enabled: No) |
| 13 | Source file evidence | `s.pc` src/core/cli/pc.ts — 8 specs (ipconfig, ipconfig /all, ping, tracert, tracert -h, arp -a, cls, help); "DHCP Enabled: No" (l.29) |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 3.4-b1 MISSING; 3.4-b2 MISSING; 3.4-b3 MISSING; 3.4-b4 MISSING; 3.4-b5 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | DHCP (reservations, scope, lease, options, relay, exclusions); SLAAC; DNS (DNSSEC, DoH/DoT, records, zones, authoritative, recursive); Hosts file; Time protocols (NTP, PTP, NTS) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-4 (DHCP server/client/relay (= DEV-01D part)); CERT-P1-2 (DNS service + nslookup); CERT-P1-6 (NTP, syslog configuration, SNMP basics); CERT-P1-1 (IPv6 (addressing, static, ping/traceroute v6)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 3.5 — Network access and management methods

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 3.0 Network Operations |
| 4 | Domain weight | 19% |
| 5 | Objective ID | 3.5 (derived bullets 3.5-b1 … 3.5-b8) |
| 6 | Objective summary | Network access and management methods (paraphrase) |
| 7 | Learning outcome | Compare |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Site-to-site VPN; Client-to-site VPN; SSH; GUI; API; Console; Jump box/host; In-band vs out-of-band |
| 10 | Existing application capability | Console (VERIFIED: device console CLI) |
| 11 | Device support | routers, switches |
| 12 | CLI support | console CLI |
| 13 | Source file evidence | `s.ui` src/components/Canvas.tsx, Palette.tsx, Console.tsx, Inspector.tsx, CommandLibrary.tsx, ChallengePanel.tsx, GuidePanel.tsx, FileManager.tsx |
| 14 | Unit test evidence | `t.cli` tests/cli.test.ts:11, :27, :89, :182, :192, :209, :214 (every registry example executed on every supported device kind) |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 3.5-b1 MISSING; 3.5-b2 MISSING; 3.5-b3 MISSING; 3.5-b4 MISSING; 3.5-b5 MISSING; 3.5-b6 VERIFIED; 3.5-b7 MISSING; 3.5-b8 MISSING |
| 18 | Coverage score | 0.13 |
| 19 | Missing functionality | Site-to-site VPN; Client-to-site VPN; SSH; GUI; API; Jump box/host; In-band vs out-of-band |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-1 (Device access security: enable secret, username, line con/vty, SSH); CERT-P3-2 (VPN/IPsec concept lab) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 4.1 — Basic network security concepts

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 4.0 Network Security |
| 4 | Domain weight | 14% |
| 5 | Objective ID | 4.1 (derived bullets 4.1-b1 … 4.1-b7) |
| 6 | Objective summary | Basic network security concepts (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Encryption, certificates, IAM; Geofencing; Physical security; Deception technologies; Security terminology / CIA; Audits and compliance; Network segmentation enforcement (IoT, OT, guest, BYOD) |
| 10 | Existing application capability | Network segmentation enforcement (IoT, OT, guest, BYOD) (PARTIAL: VLAN isolation verified incl. IoT endpoints; no enforcement policy) |
| 11 | Device support | switches, IoT endpoints |
| 12 | CLI support | switchport access vlan |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | `t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.endpoint` tests/endpoint-devices.test.ts:74, :92, :112<br>`t.endpoint` tests/device-capability.test.ts:136 (server = IP host only) |
| 15 | E2E test evidence | `t.vlan` e2e/app.spec.ts:75<br>`t.endpoint` e2e/endpoint-devices.spec.ts:100 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 4.1-b1 MISSING; 4.1-b2 MISSING; 4.1-b3 MISSING; 4.1-b4 MISSING; 4.1-b5 MISSING; 4.1-b6 MISSING; 4.1-b7 PARTIAL |
| 18 | Coverage score | 0.06 |
| 19 | Missing functionality | Encryption, certificates, IAM; Geofencing; Physical security; Deception technologies; Security terminology / CIA; Audits and compliance; Network segmentation enforcement (IoT, OT, guest, BYOD) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)); CERT-P0-2 (IPv4 ACLs (standard/extended, numbered/named)) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 4.2 — Types of attacks and their impact

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 4.0 Network Security |
| 4 | Domain weight | 14% |
| 5 | Objective ID | 4.2 (derived bullets 4.2-b1 … 4.2-b9) |
| 6 | Objective summary | Types of attacks and their impact (paraphrase) |
| 7 | Learning outcome | Summarize |
| 8 | Lab relevance | L (0) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: DoS/DDoS; VLAN hopping; MAC flooding; ARP poisoning/spoofing; DNS poisoning/spoofing; Rogue DHCP / AP, evil twin; On-path attack; Social engineering; Malware |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 4.2-b1 MISSING; 4.2-b2 MISSING; 4.2-b3 MISSING; 4.2-b4 MISSING; 4.2-b5 MISSING; 4.2-b6 MISSING; 4.2-b7 MISSING; 4.2-b8 MISSING; 4.2-b9 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | DoS/DDoS; VLAN hopping; MAC flooding; ARP poisoning/spoofing; DNS poisoning/spoofing; Rogue DHCP / AP, evil twin; On-path attack; Social engineering; Malware |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q2 (Concept notes for describe-level objectives (content only)) |
| 22 | Estimated complexity | S |
| 23 | Development priority | Quick win |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 4.3 — Apply security features, defenses and solutions (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 4.0 Network Security |
| 4 | Domain weight | 14% |
| 5 | Objective ID | 4.3 (derived bullets 4.3-b1 … 4.3-b7) |
| 6 | Objective summary | Apply security features, defenses and solutions (scenario) (paraphrase) |
| 7 | Learning outcome | Apply |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Disable unused ports and services; Change default passwords; NAC: port security, 802.1X, MAC filtering; Key management; ACL; URL / content filtering; Zones (trusted/untrusted, screened subnet) |
| 10 | Existing application capability | Disable unused ports and services (PARTIAL: shutdown verified; services n/a); Zones (trusted/untrusted, screened subnet) (DIAGRAM_ONLY: firewall object has LAN/WAN/DMZ ports, no policy) |
| 11 | Device support | switches, firewall(diagram) |
| 12 | CLI support | shutdown |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | `t.link` tests/network.test.ts:30, :45, :150<br>`t.link` tests/challenge.test.ts:60, :145<br>`t.diagram` tests/device-capability.test.ts:146 "diagram: a firewall … does not forward", :156 (AP is a leaf)<br>`t.diagram` tests/diagram-devices.test.ts:59, :73, :91, :109 |
| 15 | E2E test evidence | `t.link` e2e/app.spec.ts:26<br>`t.diagram` e2e/diagram-devices.spec.ts:104 |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 4.3-b1 PARTIAL; 4.3-b2 MISSING; 4.3-b3 MISSING; 4.3-b4 MISSING; 4.3-b5 MISSING; 4.3-b6 MISSING; 4.3-b7 DIAGRAM_ONLY |
| 18 | Coverage score | 0.08 |
| 19 | Missing functionality | Disable unused ports and services; Change default passwords; NAC: port security, 802.1X, MAC filtering; Key management; ACL; URL / content filtering; Zones (trusted/untrusted, screened subnet) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-1 (Device access security: enable secret, username, line con/vty, SSH); CERT-P0-2 (IPv4 ACLs (standard/extended, numbered/named)); CERT-P1-4 (Port security (+ DHCP snooping/DAI after P0-4)); CERT-P2-6 (Firewall zone policy) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.1 — Troubleshooting methodology

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 5.0 Network Troubleshooting |
| 4 | Domain weight | 24% |
| 5 | Objective ID | 5.1 (derived bullets 5.1-b1 … 5.1-b7) |
| 6 | Objective summary | Troubleshooting methodology (paraphrase) |
| 7 | Learning outcome | Explain |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Identify the problem; Establish a theory; Test the theory; Plan of action; Implement or escalate; Verify full functionality; Document findings |
| 10 | Existing application capability | Identify the problem (PARTIAL: Check shows failing checks; hints); Establish a theory (PARTIAL); Test the theory (VERIFIED: ping/traceroute/show + checks); Implement or escalate (VERIFIED: fixing via CLI turns checks green); Verify full functionality (VERIFIED: Check re-evaluates live Lab) |
| 11 | Device support | all |
| 12 | CLI support | Challenge Check, hints |
| 13 | Source file evidence | `s.chal` src/core/challenge.ts — evaluateCheck() l.79; check kinds ping/link-up/config-line/trunk-vlan/port-admin/route/no-dup-ip (src/core/types.ts l.125-137) |
| 14 | Unit test evidence | `t.chal` tests/challenge.test.ts:12, :30, :46<br>`t.chal` tests/campus3.test.ts:93 |
| 15 | E2E test evidence | `t.chal` e2e/challenge.spec.ts:19, :56<br>`t.chal` e2e/challenges-more.spec.ts:24-92<br>`t.chal` e2e/l2.spec.ts:68<br>`t.chal` e2e/hints-tab.spec.ts:8 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 5.1-b1 PARTIAL; 5.1-b2 PARTIAL; 5.1-b3 VERIFIED; 5.1-b4 MISSING; 5.1-b5 VERIFIED; 5.1-b6 VERIFIED; 5.1-b7 MISSING |
| 18 | Coverage score | 0.54 |
| 19 | Missing functionality | Identify the problem; Establish a theory; Plan of action; Document findings |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q1 (Certification-tagged labs from existing features (no code; curriculum)) |
| 22 | Estimated complexity | S |
| 23 | Development priority | Quick win |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 5.2 — Troubleshoot cabling and physical interface issues (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 5.0 Network Troubleshooting |
| 4 | Domain weight | 24% |
| 5 | Objective ID | 5.2 (derived bullets 5.2-b1 … 5.2-b8) |
| 6 | Objective summary | Troubleshoot cabling and physical interface issues (scenario) (paraphrase) |
| 7 | Learning outcome | Troubleshoot |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Incorrect cable type; Signal degradation; Improper termination / TX-RX transposed; Interface counters (CRC, runts, giants, drops); Port status: administratively down; Port status: error disabled / suspended; PoE (budget, standard); Transceivers (mismatch, signal) |
| 10 | Existing application capability | Port status: administratively down (VERIFIED) |
| 11 | Device support | switches, routers |
| 12 | CLI support | shutdown/no shutdown, show interfaces |
| 13 | Source file evidence | `s.link` src/core/network.ts — linkStatus() l.35, portLine() l.57 (up / down / admin-down / no-cable) |
| 14 | Unit test evidence | `t.link` tests/network.test.ts:30, :45, :150<br>`t.link` tests/challenge.test.ts:60, :145<br>`t.showif` tests/cli.test.ts:37, :70, :134<br>`t.showif` tests/cli-batch2.test.ts:54, :76<br>`t.showif` tests/l3.test.ts:145 |
| 15 | E2E test evidence | `t.link` e2e/app.spec.ts:26 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 5.2-b1 MISSING; 5.2-b2 MISSING; 5.2-b3 MISSING; 5.2-b4 MISSING; 5.2-b5 VERIFIED; 5.2-b6 MISSING; 5.2-b7 MISSING; 5.2-b8 MISSING |
| 18 | Coverage score | 0.13 |
| 19 | Missing functionality | Incorrect cable type; Signal degradation; Improper termination / TX-RX transposed; Interface counters (CRC, runts, giants, drops); Port status: error disabled / suspended; PoE (budget, standard); Transceivers (mismatch, signal) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P1-5 (Interface speed/duplex/errors, err-disabled, voice VLAN); CERT-P2-4 (Physical layer (cable/media types, PoE, transceivers)) |
| 22 | Estimated complexity | M |
| 23 | Development priority | P1 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.3 — Troubleshoot network service issues (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 5.0 Network Troubleshooting |
| 4 | Domain weight | 24% |
| 5 | Objective ID | 5.3 (derived bullets 5.3-b1 … 5.3-b9) |
| 6 | Objective summary | Troubleshoot network service issues (scenario) (paraphrase) |
| 7 | Learning outcome | Troubleshoot |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: STP (loops, root, roles, states); Incorrect VLAN assignment; ACLs; Route selection: routing table; Route selection: default routes; Address pool exhaustion; Incorrect default gateway; Incorrect IP / duplicate IP; Incorrect subnet mask |
| 10 | Existing application capability | Incorrect VLAN assignment (VERIFIED); Route selection: routing table (VERIFIED); Route selection: default routes (VERIFIED); Incorrect default gateway (VERIFIED); Incorrect IP / duplicate IP (VERIFIED); Incorrect subnet mask (VERIFIED: Challenge 5 PC mask /30) |
| 11 | Device support | switches, routers, hosts |
| 12 | CLI support | show vlan, show ip route, ipconfig, ping |
| 13 | Source file evidence | `s.l2` src/core/network.ts — l2Domain() l.191, portCarries() l.81, allowsVlan() l.78<br>`s.l3` src/core/network.ts — l3Interfaces() l.130, selectRoute() l.462 (longest prefix; connected wins ties), deliver() l.532<br>`s.l2t` src/core/l2tables.ts — macTable() l.50, arpTable() l.74, duplicateIps() l.103 (steady-state model, header l.4-6)<br>`s.chal` src/core/challenge.ts — evaluateCheck() l.79; check kinds ping/link-up/config-line/trunk-vlan/port-admin/route/no-dup-ip (src/core/types.ts l.125-137) |
| 14 | Unit test evidence | `t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.static` tests/l3.test.ts:165, :182, :192, :206, :217<br>`t.static` tests/campus3.test.ts:70<br>`t.default` tests/l3.test.ts:200 "default route S* is shown on R2" (asserts "Gateway of last resort is 10.0.0.1 …")<br>`t.gw` tests/network.test.ts:80, :116, :125, :133<br>`t.gw` tests/l3.test.ts:278, :294<br>`t.dup` tests/l2tables.test.ts:120, :128<br>`t.dup` tests/challenge.test.ts:165<br>`t.dup` tests/cli-batch2.test.ts:160<br>`t.addrchal` tests/samples.test.ts:151 "Challenge 5: addressing faults" (dot1Q, PC mask /30, WAN IP)<br>`t.chal` tests/challenge.test.ts:12, :30, :46<br>`t.chal` tests/campus3.test.ts:93 |
| 15 | E2E test evidence | `t.vlan` e2e/app.spec.ts:75<br>`t.static` e2e/app.spec.ts:366<br>`t.default` e2e/app.spec.ts:366 (asserts "Gateway of last resort is not set")<br>`t.gw` e2e/app.spec.ts:99<br>`t.gw` e2e/endpoint-routing.spec.ts:180 (3c9aed7)<br>`t.dup` e2e/l2.spec.ts:20<br>`t.dup` e2e/challenges-more.spec.ts:39<br>`t.chal` e2e/challenge.spec.ts:19, :56<br>`t.chal` e2e/challenges-more.spec.ts:24-92<br>`t.chal` e2e/l2.spec.ts:68<br>`t.chal` e2e/hints-tab.spec.ts:8 |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 5.3-b1 MISSING; 5.3-b2 VERIFIED; 5.3-b3 MISSING; 5.3-b4 VERIFIED; 5.3-b5 VERIFIED; 5.3-b6 MISSING; 5.3-b7 VERIFIED; 5.3-b8 VERIFIED; 5.3-b9 VERIFIED |
| 18 | Coverage score | 0.67 |
| 19 | Missing functionality | STP (loops, root, roles, states); ACLs; Address pool exhaustion |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P0-6 (STP / Rapid PVST+); CERT-P0-2 (IPv4 ACLs (standard/extended, numbered/named)); CERT-P0-4 (DHCP server/client/relay (= DEV-01D part)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P0 |
| 24 | Shared benefit CCNA + Network+ | Yes |

### 5.4 — Troubleshoot performance issues (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 5.0 Network Troubleshooting |
| 4 | Domain weight | 24% |
| 5 | Objective ID | 5.4 (derived bullets 5.4-b1 … 5.4-b6) |
| 6 | Objective summary | Troubleshoot performance issues (scenario) (paraphrase) |
| 7 | Learning outcome | Troubleshoot |
| 8 | Lab relevance | M (0.5) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Congestion/contention, bottlenecking; Bandwidth / throughput; Latency; Packet loss; Jitter; Wireless (interference, coverage, roaming) |
| 10 | Existing application capability | None |
| 11 | Device support | — |
| 12 | CLI support | — |
| 13 | Source file evidence | — |
| 14 | Unit test evidence | — |
| 15 | E2E test evidence | — |
| 16 | Production verification evidence | — |
| 17 | Coverage status | 5.4-b1 MISSING; 5.4-b2 MISSING; 5.4-b3 MISSING; 5.4-b4 MISSING; 5.4-b5 MISSING; 5.4-b6 MISSING |
| 18 | Coverage score | 0.00 |
| 19 | Missing functionality | Congestion/contention, bottlenecking; Bandwidth / throughput; Latency; Packet loss; Jitter; Wireless (interference, coverage, roaming) |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-P3-3 (Performance simulation (latency, loss, bandwidth)); CERT-P2-1 (Wireless (AP bridge, SSID/WPA2-PSK, WLC GUI)) |
| 22 | Estimated complexity | XL |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Partly / No |

### 5.5 — Use appropriate tools and protocols (scenario)

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | 5.0 Network Troubleshooting |
| 4 | Domain weight | 24% |
| 5 | Objective ID | 5.5 (derived bullets 5.5-b1 … 5.5-b19) |
| 6 | Objective summary | Use appropriate tools and protocols (scenario) (paraphrase) |
| 7 | Learning outcome | Apply |
| 8 | Lab relevance | H (1) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: Protocol analyzer; ping; traceroute/tracert; nslookup / dig; tcpdump; netstat; ip/ifconfig/ipconfig; arp; Nmap; LLDP/CDP; Speed tester; Hardware tools (toner, cable tester, taps, Wi-Fi analyzer, VFL); show mac-address-table; show route; show interface; show config; show arp; show vlan; show power |
| 10 | Existing application capability | ping (VERIFIED); traceroute/tracert (VERIFIED); ip/ifconfig/ipconfig (PARTIAL: ipconfig only); arp (VERIFIED); LLDP/CDP (PARTIAL: CDP on Cisco IOS only (show cdp neighbors [detail], t.cdp); LLDP missing); show mac-address-table (VERIFIED); show route (VERIFIED); show interface (VERIFIED); show config (VERIFIED); show arp (VERIFIED); show vlan (VERIFIED) |
| 11 | Device support | all |
| 12 | CLI support | ping, tracert, arp -a, show mac/route/interface/config/arp/vlan |
| 13 | Source file evidence | `s.pc` src/core/cli/pc.ts — 8 specs (ipconfig, ipconfig /all, ping, tracert, tracert -h, arp -a, cls, help); "DHCP Enabled: No" (l.29)<br>`s.cisco` src/core/cli/cisco.ts — 58 command specs at dcbf4cb, 60 at 950fb0c (+ show cdp neighbors [detail]); show ip route renderer l.240-275 at 3e00c13 (+1 at 950fb0c) (codes C/L/S/S*, fixed [1/0], gateway of last resort)<br>`s.aruba` src/core/cli/aruba.ts — 41 command specs<br>`s.cdp` src/core/cli/cdp.ts — neighbors() l.25 (physical Lab.links, both ports operationally up via linkStatus(), Cisco IOS kinds only), entryAddress() l.43, showCdpNeighbors() l.53; registry specs cisco.show.cdp.neighbors / .detail in src/core/cli/cisco.ts (privileged EXEC) -- CERT-Q4a, main 950fb0c; read-only topology view: no CDP advertisements, timers/holdtime, CDP/LLDP configuration or LLDP |
| 14 | Unit test evidence | `t.ping` tests/network.test.ts:21-150<br>`t.ping` tests/audit-phase-a.test.ts:77-194<br>`t.trace` tests/traceroute.test.ts:118-223<br>`t.trace` tests/endpoint-devices.test.ts:92<br>`t.arp` tests/l2tables.test.ts:79, :90<br>`t.arp` tests/samples.test.ts:42<br>`t.mac` tests/l2tables.test.ts:29 "SW1 learns PC-A locally …"<br>`t.showif` tests/cli.test.ts:37, :70, :134<br>`t.showif` tests/cli-batch2.test.ts:54, :76<br>`t.showif` tests/l3.test.ts:145<br>`t.config` tests/cli.test.ts:20, :98 "write memory fills startup-config", :104<br>`t.config` tests/challenge.test.ts:117<br>`t.config` tests/persist.test.ts:10<br>`t.vlan` tests/cli.test.ts:61 "switch: create VLAN, set access VLAN, show vlan brief"; :75<br>`t.vlan` tests/network.test.ts:54, :72<br>`t.vlan` tests/l3.test.ts:27 "VLANs stay isolated without a router path"<br>`t.cdp` tests/cdp.test.ts:50, :56, :103, :111, :121, :131, :147, :158, :188, :197, :219, :237 |
| 15 | E2E test evidence | `t.ping` e2e/app.spec.ts:26, :99<br>`t.trace` e2e/endpoint-routing.spec.ts:147 (3c9aed7)<br>`t.arp` e2e/l2.spec.ts:48<br>`t.arp` e2e/endpoint-routing.spec.ts:164 (3c9aed7)<br>`t.mac` e2e/l2.spec.ts:48<br>`t.config` e2e/safety.spec.ts:14<br>`t.config` e2e/app.spec.ts:216, :234<br>`t.vlan` e2e/app.spec.ts:75<br>`t.cdp` e2e/cdp.spec.ts:6 -- CERT-Q4a (33 unit + 1 E2E, real executeLine on real topology): local/remote ports, orientation, operational state not inferred from local admin, unplug/reconnect, unsupported kinds and patch panel excluded, detail IP/version without invented data, deterministic export/import, mode/do/help/Tab, LLDP/cdp config rejected |
| 16 | Production verification evidence | `p.smoke` Production smoke 58/58 (scratchpad scripts, live site, 2026-11-13): smoke/smoke2f ping+traceroute text = engine; smoke8 endpoints ping/tracert/arp/no-gateway/VLAN isolation; smoke6 challenge; smoke7 diagram objects do not forward; smoke9 Command Library |
| 17 | Coverage status | 5.5-b1 MISSING; 5.5-b2 VERIFIED; 5.5-b3 VERIFIED; 5.5-b4 MISSING; 5.5-b5 MISSING; 5.5-b6 MISSING; 5.5-b7 PARTIAL; 5.5-b8 VERIFIED; 5.5-b9 MISSING; 5.5-b10 PARTIAL; 5.5-b11 MISSING; 5.5-b12 MISSING; 5.5-b13 VERIFIED; 5.5-b14 VERIFIED; 5.5-b15 VERIFIED; 5.5-b16 VERIFIED; 5.5-b17 VERIFIED; 5.5-b18 VERIFIED; 5.5-b19 MISSING |
| 18 | Coverage score | 0.52 |
| 19 | Missing functionality | Protocol analyzer; nslookup / dig; tcpdump; netstat; ip/ifconfig/ipconfig; Nmap; LLDP/CDP; Speed tester; Hardware tools (toner, cable tester, taps, Wi-Fi analyzer, VFL); show power |
| 20 | Missing test coverage | — |
| 21 | Recommended implementation | CERT-Q4 (Read-only show commands from existing state: show cdp/lldp neighbors, show logging); CERT-P2-3 (Client OS commands (ifconfig/ip, netstat)); CERT-P3-4 (Packet/frame view (capture-style)) |
| 22 | Estimated complexity | L |
| 23 | Development priority | P2 |
| 24 | Shared benefit CCNA + Network+ | Yes |

