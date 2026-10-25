# Big Hero Robotics Academy — landing page concepts

**Status:** historical review concepts. Drag approved adapting Built from Curiosity into the live homepage, then revised it to use the original robot and stacked Anton typography. See [the adopted production revision](./landing-curiosity.md); the HTML previews below retain their original proposals for comparison.

**Current proposal:** [Built from Curiosity](./landing-curiosity.html), a fresh hero designed solo after Drag rejected the Workshop Poster and authorized rethinking the whole hero. [Direction, sources and review evidence](./landing-curiosity.md). Earlier previews below are historical alternatives, not approved designs.

Open [`landing-concepts.html`](./landing-concepts.html) for the earlier concepts, or [`landing-overlap-variants.html`](./landing-overlap-variants.html) for the two updated right-overlap options. The new page is review-only and leaves the earlier HTML intact for comparison. Both previews use the existing local logo and original inline SVG artwork; neither imports remote imagery.

## Requested overlap variants

### 03 — Sol's Workshop Poster

Open [Sol's own variant](./landing-sol-variant.html). Designed directly by the root agent at Drag's explicit request, as a separate review concept. Earlier concepts remain available for comparison.

- Full-width crimson LEARN and dark CREATE; each real word is fitted separately to 98.5% of the stage width instead of assuming a full-width block means full-width lettering.
- Original dimensional SVG robot on the right, larger chassis, a gentle tilt, restrained orbital construction lines, and no copied reference assets. This is an illustrative mascot, not a promised academy kit.
- Centered branding at desktop and mobile; small workshop captions, readable supporting copy and unobscured actions below the poster. A dark, ruled learning-journey section gives the composition a quieter conclusion.
- References personally inspected: the original REF-001 controller poster and REF-007 fashion hero in the canonical root vault. Transferred the oversized type/object overlap and restrained editorial framing; excluded gaming claims, shopping controls and borrowed imagery.
- Primary `/login` and secondary `/about` destinations retained. English concept copy is exploratory; production localization and business claims remain governed by existing product contracts.
- Local reference-led concept iteration: no external research needed for this composition repair; no new product behavior, library or asset licensing assumption introduced.
- Review renders and geometry checks recorded below after final inspection. Approval remains required before adopting this direction in the live landing page.

The follow-up asks for two switchable review directions: “01 Oversized Studio” and “02 My take.” Both keep LEARN in crimson above CREATE in dark ink, fill the hero width with the words, and place a large original robot in front on the right so its painted silhouette covers substantial portions of both lines. The centered brand header remains; copy and the existing `/login` primary and `/about` secondary actions stay below the stage. No new academy claims or live application changes are included.

- **01 Oversized Studio** uses broad, poster-like lettering, a cropped right-edge robot, solid red/ivory/dark surfaces, and a simple editorial journey below.
- **02 My take** keeps the same composition and palette, with a more sculptural angled robot, shaded chassis, and one restrained arc behind the figure.
- Both use semantic headings, native keyboard-operable tabs, visible focus, responsive stage sizing, 44px minimum controls, and a reduced-motion baseline. These are implementation intentions; rendered viewport and overlap checks remain pending root review.

## A — Inventor Workshop

- Off-white and slate surfaces carry the existing crimson accent.
- An oversized, anchored headline shares the first screen with one large robot illustration and a few restrained schematic labels.
- Existing destinations remain `/login` (primary) and `/about` (secondary).
- A three-stage maker journey replaces the repeated feature-card pattern with an editorial sequence: imagine, make, refine.

## B — Editorial Academy (selected for revision)

- The header keeps the brand centered with navigation on a second row. One semantic two-line headline, “LEARN / CREATE,” fills the left side: LEARN is crimson and CREATE is dark ink. A much larger original robot sits in the right foreground, moved further right by the latest request, and partially overlaps the word endings. The word beginnings stay readable; the introduction and actions sit below the stage.
- The stage is open and unboxed, with only a soft contact shadow on the robot. The robot stays on the right and the words stay stacked on the left at narrow widths, with their beginnings readable and no horizontal page spill.
- The narrative moves through four varied text chapters, then a short dark craft/story band changes the page's visual pace.
- Existing destinations remain `/login` (primary) and `/about` (secondary).

Neither direction adds forms, payments, eligibility, course claims, invented student stories, testimonials, or unsupported statistics/certifications. Copy is proposed and should be reviewed before implementation. The robot drawings are illustrative concepts, not photographs or representations of an academy kit.

## Design observations

The project's theme config supplies crimson `#DC2626`, deeper red `#B91C1C`, and soft rose `#FEF2F2`; slate neutrals follow the current marketing components. Both concepts use system/Geist fallback typography, semantic headings, visible keyboard focus, touch-sized tabs/actions/navigation, responsive stacking, and a reduced-motion baseline.

Current marketing components use a centered hero, three similar small feature cards, and no project imagery. Their entrance animation starts in an opacity-hidden state and does not show explicit reduced-motion handling. These concepts propose a more image-led first screen and vary the content rhythm; they are mockups for direction review, not a claim that the live implementation should change before approval.

### Reference and field research

Inspected on 2026-10-11. The supplied reference images are used for composition cues only; no reference art or copy is reproduced. The cited REF-001/005/007 notes and originals were not present at the expected tutoring-project vault path in this checkout, so the new variants follow the user's supplied composition description and prior concept rather than claiming fresh inspection of those files.

- **REF-001** shows oversized lettering behind a dominant red hardware object. Direction B translates the subject-in-front layering with an original robot overlapping the semantic “LEARN / CREATE” headline on the left, with explanatory copy and actions below. [Reference notes](../../../../_vault/ui/design-references/notes/REF-001.md)
- **REF-010** uses a large image beside oversized red display type in a split composition. Direction B translates its image scale, red type, and restrained division without borrowing its fashion product details or controls. [Reference notes](../../../../_vault/ui/design-references/notes/REF-010.md)
- **REF-007** uses a monumental wordmark behind a central subject. Direction B borrows the overlap and scale relationship while retaining its own red/slate palette, original robot, and academy copy. [Reference notes](../../../../_vault/ui/design-references/notes/REF-007.md)
- **Hands-on learning fact:** LEGO Education describes scaffolded, hands-on computer science and AI learning with hardware organized by grade bands. This supports presenting the process of making and learning clearly; it does not establish Big Hero's age bands, curriculum, kit, or eligibility. [LEGO Education](https://education.lego.com/en-us/lego-education-computer-science-and-ai/)
- **Project discovery fact:** Code Club offers projects across different experience levels. This supports making the learning journey easy to scan; it does not define Big Hero's course structure or audience. [Code Club](https://codeclub.org/en/)

**Audience / use-case observation:** A prospective learner or family visiting an academy homepage needs a quick sense of what learning looks like and an obvious way to find the academy or enter its existing portal. This is an audience-oriented design inference, not verified user research. The proposed maker sequence and two clear links address that inference. Peer examples inform presentation only; they do not set Big Hero policy or product requirements.

## Limits and unresolved evidence

- The project has a logo image but no authentic workshop or student photography in the inspected assets. A photographic route would need academy-owned imagery before adoption; no stock placeholders are used here.
- Existing `AcademyIntel` copy includes age range, certification, branch count, and competition claims. These concepts omit them because their current accuracy was not established; confirm each claim with the owner before bringing any into a production page.
- A historical brief conflicts about branch count and contains an obsolete attendance-link policy. Neither was treated as current product truth.
- No dedicated approved `DESIGN.md` was identified in the inspected scope. The current palette and typography are evidenced by the project theme and globals; neither proposal is an approved visual direction.

## Review findings

The earlier B direction was rejected because its words stopped before the robot and the artwork did not occupy enough of the composition. The new file responds with width-filled stacked words and larger foreground artwork on the right. No browser rendering or viewport verification has been run for this revision; 375px, 768px, and 1440px visual review remains pending.

## Decision requested

B is selected for revision; the centered header and the specific left-stacked “LEARN / CREATE” headline with a large overlapping robot on the right are explicitly requested for this review. CTA priority remains unresolved. These previews follow the current existing-account emphasis (`/login` primary, `/about` secondary). The audience and primary action remain unresolved: should the page primarily serve current academy members entering the portal, or parents/prospective learners discovering the academy? If discovery is primary, the existing `/about` or `/contact` destinations may deserve priority; no enrollment flow or form is proposed. Approval applies to this page concept only. Validate any factual academy claims independently before implementation.

