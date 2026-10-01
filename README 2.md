# Nexus Pro

A three-page website for Nexus Pro, a company that builds websites and systems for people.
Part 2 of the project: CSS styling and responsive design.

## Pages

| File | Content |
| --- | --- |
| `index.html` | Hero and "Why now" cards |
| `about.html` | Profile (pops in and out on scroll), "Why it matters", button to the contact page |
| `contact.html` | Name and email form for booking an appointment |

## Project structure

```
nexus-pro/
├── index.html
├── about.html
├── contact.html
├── style.css        (external stylesheet, linked from all three pages)
├── script.js        (grass reveal, profile pop, music, contact form)
├── README.md
└── assets/
    ├── sky-600.jpg, sky-900.jpg, sky-1200.jpg   (responsive background)
    ├── grass.webm                               (transparent grass video)
    └── calm.m4a                                 (background music)
```

## How to run

Open `index.html` in a current Chrome, Edge or Firefox. No build step is needed.
The grass video uses a transparent WebM, which Safari does not display with transparency.
The music starts on the first click, tap or scroll, at 30% volume.
Before sending the form, replace `YOUR_EMAIL_HERE` in `script.js` with the real email address.

## Part 2 requirements and where they are met

| Requirement | Where |
| --- | --- |
| External stylesheet linked to all pages | `style.css`, linked in the `<head>` of all three pages |
| Consistent naming convention | kebab-case, block-element (for example `.card-title`) |
| Base style: font, size, colour scheme, margin and padding | `style.css` section 2, using custom properties in `:root` |
| CSS reset | `style.css` section 1 |
| Typography: `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing` | `style.css` section 3 |
| Typography scale | `--step-0` to `--step-7`, ratio 1.333 |
| Layout with Grid and Flexbox | Grid with `grid-template-areas` on the page and the profile; Flexbox on the header, navigation, hero and form |
| Visual styles: `color`, `background-color`, `border`, `box-shadow` | cards, buttons, form fields, profile photo |
| Pseudo-classes `:hover`, `:focus`, `:active` | `style.css` section 6 |
| Breakpoints and media queries | `37.5em` (tablet) and `64em` (desktop), mobile first |
| Multi-column to single column | the card grid has two columns from tablet up and one column on mobile; the profile sits beside the text from tablet up and stacked on mobile |
| Relative units | `rem`, `em` and `%` for type, spacing and widths |
| Responsive images | `<picture>`, `srcset` and `sizes` for the sky background in all three pages |
| Minimum number of selectors using the cascade | shared classes, inherited values and custom properties |

## Changelog

### Part 2

- Created the external stylesheet `style.css` and linked it from all pages. All inline styles were removed.
- Split the single page into three pages (`index.html`, `about.html`, `contact.html`) with the same header, navigation and footer.
- Added a CSS reset and base styles (font family, font size, colour scheme, spacing) as custom properties.
- Added a typography scale (ratio 1.333) and applied weight, line height and letter spacing.
- Built the page layout with CSS Grid (`grid-template-areas`) and the header, navigation, hero and form with Flexbox.
- Added borders, shadows and colours to cards, buttons, form fields and the profile photo.
- Added `:hover`, `:focus` and `:active` states to links, cards, buttons and form fields.
- Added breakpoints at 37.5em and 64em. The card grid and the profile change between one and two columns.
- Converted the sky background to a `<picture>` element with three image sizes (`srcset` and `sizes`).
- Replaced the canvas-processed grass with a pre-made transparent video (`assets/grass.webm`).
- Tested at 375px, 800px and 1280px widths in Chrome with no horizontal scrolling and no script errors.

### Part 1 feedback corrections

To be completed: list each correction from the Part 1 feedback here with a detailed description of the change, so the lecturer is informed of every edit.
