# CLIENT BRIEF: Big Hero Robotics Academy Platform

- **Client / Company:** Big Hero Robotics Academy (أكاديمية بيج هيرو) — Founded 2017
- **Date:** September 17, 2026
- **Core Problem to Solve:** Unified multi-branch tutoring management, course catalog age gating, automated tutor allocation and timetable scheduling (Gadwal), token-based student session attendance check-ins within strict 4-hour windows, and automated billing, wallet, and payment reconciliation.
- **Required Platforms:** Web Application (Next.js 14 App Router, feature-driven unidirectional architecture, responsive student/tutor/admin portals) with extensible API architecture for future mobile apps.
- **Target Deadline:** Production Staging & Vercel/Neon deployment.
- **External Integrations:**
  - **Payment Rails:** InstaPay (`https://ipn.eg/S/bighero-online/instapay/8RVbh1` / `Bighero-online@instapay`), Orange Cash (`01211724448`), Paymob Gateway (`https://paymob.link/Hl788`).
  - **Hardware Kit Logistics:** Most Electronic robot kit procurement portal (`https://mostelectronic.com/shop/robotic-arms/big-hero-robot-kits`).
  - **Accreditation Registries:** Egyptian Engineers Syndicate (نقابة المهندسين), Ministry of Communications (وزارة الاتصالات), Arab Robotics Association (جمعية الروبوت العربية).
  - **Virtual Classroom Delivery:** Zoom / Google Meet API webhooks.
- **Design / Assets Provided:** Official Academy Brand Identity (`/logo.png`), Claude semantic design token palette (Canvas/Stone/Red theme), shadcn/ui components, Lucide icons, Motion.dev primitives.

---

## 1. Academy Overview & Delivery Channels

### 1.1 Institution Profile
* **Entity:** Big Hero Robotics Academy (أكاديمية بيج هيرو).
* **Foundation:** Established in 2017 as a specialized STEM, robotics, electronics, and coding academy.
* **Target Demographics:** Students aged 6 to 26 across beginner, intermediate, and advanced professional tracks.
* **Accreditations:** Certificates officially recognized and co-certified by:
  1. Egyptian Engineers Syndicate (نقابة المهندسين).
  2. Ministry of Communications and Information Technology (وزارة الاتصالات).
  3. Arab Robotics Association (جمعية الروبوت العربية).

### 1.2 Delivery Modalities & Multi-Branch Network
* **Online Branch:**
  * Live interactive video instruction (Zoom / Google Meet).
  * Interactive in-browser software simulation paired with home-delivered physical hardware kits.
* **Offline Branches (18+ Physical Centers):**
  * Cairo & Giza: مدينة نصر (Nasr City), زايد (Sheikh Zayed), التجمع (New Cairo), الدقي / هرم (Dokki / Haram), مدينتي (Madinaty), المعادي (Maadi), حلوان (Helwan), عين شمس (Ain Shams), أكتوبر (6th of October).
  * Delta & Canal: الإسكندرية (Alexandria), المنصورة (Mansoura), المحلة (El Mahalla), البحيرة (Beheira), المنوفية (Monufia), العبور (Obour), السويس (Suez).
  * Upper Egypt: الفيوم (Fayoum), بني سويف (Beni Suef), المنيا (Minya), أسيوط (Asyut), قنا (Qena), الأقصر (Luxor).
* **Geographic Fallback Routing:**
  * Inquiries originating from regions without an immediate physical branch (e.g., الشروق / El Shorouk) are deterministically routed to the nearest physical branch (مدينتي / العبور / التجمع) or default to the Online branch.

---

## 2. Target User Personas & Permissions Matrix

| User Persona | Role | Key Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Students (Ages 6–26)** | `STUDENT` | View enrolled courses, inspect upcoming lecture schedule, check in to active sessions via 4-hour token links, view wallet balance, and track capstone completion. |
| **Parents / Guardians** | `STUDENT` (Account Guardian) | Manage student billing, top up wallet balances, monitor attendance records, track deadline payment alerts (20th of the month), and download accredited certificates. |
| **Tutors / Engineering Faculty** | `TUTOR` | Manage assigned cohorts, view session schedule (Gadwal), monitor enrolled student headcounts, copy session token links for WhatsApp/classroom distribution, and track monthly/lifetime KPI metrics. |
| **Platform Administrators** | `ADMIN` | Academy-wide timetable management, course catalog curation, tutor workload allocation, wallet deposits/refunds, overdraft account audits, and branch routing. |

*Engineering Faculty Members:* Eng. Omar Ashraf, Eng. Ahmed Alaa, Eng. Omnia, Eng. Amr, Eng. Yousef.

---

## 3. Course Catalog & Age-Gated Eligibility Engine

```
[Candidate Ingestion]
        │
        ├── Age < 6: REJECT (Underage)
        │
        ├── Age == 6: PRIVATE TRACK ONLY (1-on-1 Customized Pacing)
        │
        ├── Age 7 – 10: PICTOBLOX TRACK (Block-Based Coding & Simulation)
        │
        ├── Age >= 10.5 (Rounded to 11): ELECTRONICS & ROBOTICS TRACK (Arduino & Hardware)
        │       ├── Level 1: Circuits -> Robot Car Assembly -> Arduino C++ -> Bluetooth Control
        │       └── Levels 2 & 3: Autonomous Obstacle Avoidance, Sumo Bots & Capstone
        │
        └── Advanced / Adults / Teachers (Age 14+):
                ├── Programming Track: Dual-Level C++ -> Dual-Level Python
                ├── Mechanical Design: 3D Modeling with Autodesk Fusion 360
                ├── PCB Design: Schematic Routing in Fusion 360 (Prerequisite Required)
                └── Teacher Enablement Track: School Computing Teacher Mentorship
```

### 3.1 Curricular Tracks Specification
1. **PictoBlox Track (Ages 7–10):**
   * **Curriculum:** Block-based visual programming (Scratch derivative), computational logic, animation, game design, sensor simulations.
   * **Duration:** 16 sessions (2 hours/session, 1 session/week ≈ 4 calendar months).
   * **Hardware Requirement:** 100% cloud/browser-based; no physical electronics kit required.
2. **Electronics & Robotics Track (Ages 11+ / Age 10.5 rounded up):**
   * **Level 1 Progression (4 Months):**
     * *Month 1:* Electronic components, circuit schematics, breadboard wiring, motor control fundamentals.
     * *Month 2:* Mechanical chassis assembly, motor drivers, battery power distribution, microcontroller mounting.
     * *Month 3:* C++ programming on Arduino microcontrollers, digital/analog I/O, sensors.
     * *Month 4:* HC-05 Bluetooth module integration, smartphone remote control, final capstone project.
   * **Levels 2 & 3 Progression:** Ultrasonic obstacle-avoidance algorithms, line-following PID robotics, Sumo battle bots, autonomous problem-solving capstones.
   * **Hardware Kit Logistics:** Unified Big Hero Robotics Kit covering both Level 1 and Level 2, procured through Most Electronic (`https://mostelectronic.com/shop/robotic-arms/big-hero-robot-kits`).
3. **Advanced & Professional Tracks (High School, University, Adults, Instructors):**
   * **Programming Track:** Dual-level intensive C++ followed by dual-level Python (data structures, algorithms, automation).
   * **Mechanical Engineering Track:** Parametric 3D CAD modeling, joint assemblies, and rapid prototyping in Autodesk Fusion 360.
   * **PCB Design Track:** Electronic schematic capture, multilayer PCB board routing, and Gerber manufacturing files in Fusion 360 (requires electronics foundation or assessment gate).
   * **Teacher Enablement Track:** Tailored 1-on-1 track preparing school computing and STEM teachers for classroom instruction and curriculum delivery.

### 3.2 Academic Constraints & Invariants
* **Strict Anti-Generative AI Coding Rule:** Generative AI tools (ChatGPT, Copilot, etc.) are strictly forbidden for student coding. All algorithms, logic trees, and circuit diagrams must be written and debugged by students from foundational first principles.
* **Accredited Certification Threshold:** A minimum score of 60% on the practical capstone evaluation is required to pass. Certification is graded as Pass/Fail (numerical grades are omitted from Syndicate and Ministry certificates to maintain uniform accreditation standing).
* **Value-First Sales/Onboarding Gate:** Prospective student admissions workflows must withhold pricing disclosures until course tracks, pedagogical methodology, hardware logistics, and syndicate accreditations have been thoroughly presented.

---

## 4. Platform Logistics, Classroom Structure & Scheduling Rules

* **Session Duration:** Exactly 2 hours per session (120 minutes).
* **Weekly Cadence:** 1 session per week per cohort (4 sessions per calendar month; 16 sessions per full level).
* **Group Size Constraints:**
  * **Group Cohorts:** Strict maximum capacity of **4 students** per group session to guarantee individual attention and hands-on debugging mentorship.
  * **Private Cohorts:** Strictly **1-on-1** bespoke pacing.
* **Hardware Prerequisites:**
  * Laptop or desktop PC running an updated operating system (Windows, macOS, Linux) with a modern web browser.
  * Mobile devices (smartphones and tablets) are strictly unsupported for academy course software and coding IDEs.
* **Instruction Language:** English curriculum materials and source code; lecture delivery flexibly conducted in Egyptian Arabic or English based on student and cohort requirements.
* **Attendance Window Invariant:** Student check-in tokens remain valid for exactly **4 hours** (`startTime + 4 hours`). Check-in attempts after the deadline are strictly rejected with HTTP 403 Forbidden.

---

## 5. Commercial, Booking & Financial Policies

### 5.1 Pricing Structure (Egyptian Pounds — EGP)

| Course Track | Monthly Tuition (Standard) | Monthly Tuition (Promotion) | Full Level Prepaid (4 Months) | Per-Session Cost Breakdown |
| :--- | :--- | :--- | :--- | :--- |
| **Group Cohort (Max 4)** | 1,700 EGP | **1,500 EGP** | 5,400 EGP (10% prepay discount) | 375.00 EGP / session |
| **Private Track (1-on-1)** | 2,200 EGP | **2,000 EGP** | 7,200 EGP (10% prepay discount) | 500.00 EGP / session |

*Special Discount Policies:*
* **Sibling Discount:** 1,400 EGP per student / month when 2 or more siblings enroll concurrently.
* **Syndicate & Referral Discount:** 10% discount applied upon membership verification with the Egyptian Engineers Syndicate.

### 5.2 Booking, Onboarding & Billing Lifecycle
1. **Commitment Deposit:**
   * A 500 EGP commitment deposit is collected to confirm registration and reserve a seat.
   * Credited directly toward Month 1 tuition upon cohort launch.
   * **100% Refundable Policy:** If the academy fails to form a matching cohort within 2 weeks of payment, the deposit is refunded in full without penalty.
2. **Free Orientation Session:**
   * Complimentary 30-minute orientation session prior to curriculum start.
   * Dedicated to software installation, platform walkthrough, and audio/video hardware checks (not a curriculum lecture).
3. **Monthly Billing Cycle:**
   * Tuition invoices are generated and due on the **20th of each calendar month**.
   * Late payments trigger automated portal reminders and temporary token check-in hold.

### 5.3 Payment Rails & Settlement Accounts
* **InstaPay:** Direct instant bank transfer via `https://ipn.eg/S/bighero-online/instapay/8RVbh1` (Account: `Bighero-online@instapay`).
* **Mobile Wallets (Orange Cash):** Instant cash transfer to academy billing line `01211724448`.
* **Paymob Online Gateway:** Credit card, debit card, and international remittance via Paymob hosted checkout link `https://paymob.link/Hl788`.

---

## 6. Technical Architecture & Database Contract Mapping

### 6.1 Entity Relations & Enums
* **User (`User`):** Role-based schema (`STUDENT`, `TUTOR`, `ADMIN`), unique phone and email, linked to 1:1 `Wallet`.
* **Session (`Session`):** Linked to `Tutor`, session type (`GROUP` @ 375 EGP vs `PRIVATE` @ 500 EGP), start/end times, computed 4-hour `deadline`, unique UUID `token`, status (`SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
* **Attendance (`AttendanceRecord`):** Composite unique constraint `@@unique([sessionId, studentId])`, timestamped check-in proof.
* **Wallet & Ledger (`Wallet`, `WalletTransaction`):** Append-only immutable financial transactions (`ADMIN_DEPOSIT`, `SESSION_DEDUCTION`, `REFUND`), atomic deduction inside `prisma.$transaction`, overdraft tracking via `is_flagged_overdraft`.

### 6.2 Data Privacy & Compliance
* Specification and codebase remain 100% free of customer Personal Identifiable Information (PII).
* All transactions and ledger records maintain audit trail integrity with `createdByUserId`.
