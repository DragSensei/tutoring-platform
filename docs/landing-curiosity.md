# Built from Curiosity — fresh hero direction

## Adopted production revision — 2026-10-11

Drag approved adapting the landing page, then requested the original robot instead of the generated scene, a filled Academy Portal button, full-width stacked lettering, solid “Build from”, outlined “curiosity.”, Anton on both lines, and mouse-following pupils. The production route `/` implements this revised direction; the concept history below describes the earlier proposal.

- `HeroHeadline.tsx` uses a bundled Anton font, proportional SVG typography and font-ready width fitting. Initial SVG sizes keep the headline visible without JavaScript. An accessible HTML heading supplies its semantic text.
- `HeroRobot.tsx` preserves the original SVG geometry from `landing-sol-variant.html`; its named artwork colors live in `hero-robot-palette.ts`. Pupils use bounded local-coordinate movement, animation-frame updates, leave/blur resets, and reduced-motion handling. Touch input does not drive them.
- The homepage header centers the branding and uses a filled, role-aware portal link. Existing About, Contact, login and authenticated role destinations are preserved; non-home shell branches retain their existing layout.
- Font source: [Google Fonts Anton](https://github.com/google/fonts/tree/main/ofl/anton), accessed 2026-10-11. `public/fonts/OFL-Anton.txt` retains the SIL Open Font License. The generated workshop illustration remains a historical concept asset and is not used in production.
- Rendered audit and visual inspection passed at 375, 768 and 1440 pixels: no horizontal spill, 9/9 mobile touch targets at least 44px. Screenshots: `.audit/curiosity-landing/{mobile,tablet,desktop}.png`. Browser inspection confirmed Anton on both lines, solid/outline treatments, bounded pupils, reduced-motion reset and no browser errors. Final lint/build and broader checkpoint status are recorded in `STATE.md`.

## Historical concept

Status: review-only concept, designed by the root agent. Drag explicitly requested solo design and a complete rethink of the hero. This supersedes the Workshop Poster as the proposed direction; adoption in the production landing page still requires design approval.

Preview: [landing-curiosity.html](./landing-curiosity.html).

## Art direction

A cinematic inventor's workbench makes robotics tangible. A photorealistic generated robot replaces the flat SVG mascot; large, quiet serif typography and warm light establish curiosity rather than a giant slogan poster. The centered academy branding and crimson action retain continuity with the existing project. Dark hero transitions into warm paper, editorial copy, and a ruled making sequence. No bento grid, unsupported statistics or testimonials.

Desktop places the message beside the scene. Mobile presents the message and controls first, then a deliberate robot crop, avoiding text over the face or illegible desktop scaling. No entrance animation hides essential content. Native links, visible focus and reduced-motion rules remain.

The original illustration is conceptual: not an academy kit photograph, real facility, testimonial or proof of course offerings. It contains no copied logos or reference artwork. English copy is exploratory; production localization remains governed by existing product contracts. Existing primary `/login` and secondary `/about` destinations are retained.

## Reference inspection and research

Reviewed 2026-10-11:

- [REF-005](../../../../_vault/ui/design-references/notes/REF-005.md), original personally viewed: cinematic illumination, one dominant physical object, quiet typography. Translate material detail and restrained emphasis; exclude fragrance branding, teal palette and low-contrast essential text.
- [REF-012](../../../../_vault/ui/design-references/notes/REF-012.md), original personally viewed: architectural depth and serif headline. Translate atmosphere and a clear visual focal point; exclude Web3 claims and the gray capture framing.
- [LEGO Education](https://education.lego.com/en-us/): official page describes hands-on exploration of coding and AI. This supports using a making scene as an industry convention; it does not establish Big Hero's curriculum, eligibility, kit or outcomes.
- [Code Club](https://codeclub.org/en/learn-to-code): official page describes guided coding/design projects. This supports showing a clear progression of discovery, making and iteration; no curriculum or source assets are copied.

Audience/use-case inference: prospective learners and families need a tangible sense of robotics and an understandable next action. No user interviews conducted. The scene is aspirational artwork, not evidence of academy facilities. Industry research informs presentation, not business policy.

## Assets and verification

- [landing-workshop-hero.png](./landing-workshop-hero.png): generated with the built-in imagegen tool; copied into this concept's document scope. Original output retained. No paid API fallback or new dependencies.
- Header reuses `../public/logo.png`.
- Chromium rendered review at 375px, 768px and 1440px: no horizontal overflow, broken images or JavaScript errors; all visible links at least 44px in each dimension. The skip link receives keyboard focus; there is one main landmark. Reduced-motion preference was enabled. Brand center offset was 0px at all three widths during the initial render; its header rules were unchanged afterward.
- Personally inspected all three compositions, then corrected the mobile order to show the heading and actions before the image and re-rendered all three. Desktop and tablet retain image/copy placement; final mobile render inspected again. Screenshots: [mobile](./landing-curiosity-375.png), [tablet](./landing-curiosity-768.png), [desktop](./landing-curiosity-1440.png).
- Rendered HTML SHA-256: `e265d289be350b1874a600ec38d8d2726042ff3940cde428247adfdf6481fd2c`.
- These checks cover the standalone concept, not production route navigation, a complete accessibility audit or business behavior. No product test suite or backend check was run for the isolated preview.

Checkpoint: review the complete concept and choose whether to adopt or revise it before production changes.
