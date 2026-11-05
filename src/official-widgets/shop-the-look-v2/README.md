# Shop The Look V2

Shows a reference image (the best outfit image of the query product) with its caption, and the other items of the outfit as cards. Calls the Multisearch **Outfit Recommendations** API (`qinfo` and `return_query_temp_url` are requested).

- Host element: `<div class="ps-widget-<placementId>" data-pid="<product-id>"></div>`, or `data-im-url="<image-url>"` to query by image. If both are set, `data-pid` wins.
- Reference image fallback: best outfit image > query temporary image URL > query main image.
- `searchSettings.boi_only: true` restricts results to objects found in best outfit images. Unset by default.
- Dev: `npm run start:shop-the-look-v2` (set `appKey` / `placementId` in `dev-configs.ts` and `data-pid` in `index.html`).
- Build: `npm run build:shop-the-look-v2`

## Card options

Each card shows the product name, price and discount (no secondary title). The cards use the shared product card, so the card settings work as in shop-the-look (v1), configured through `customizations.productCard`: `price`, `discount` (on by default), `originalPrice` (off by default), `title`, `images` (main and hover image), `addToWishlist` and `addToCart` (both off by default; they need the `onAddToWishlistToggle` / `onAddToCartToggle` callbacks). The cards per row come from `customizations.productGrid.<breakpoint>.productsPerRow` and the gap between cards (in px) from `marginHorizontal` (default 2) and extra products scroll in a carousel.

`productCard.layout` adjusts the card layout:

| Setting | Default | Description |
|---|---|---|
| `details` | `stacked` | `stacked`: the name with the price under it, as in the shopping assistant card. `inline`: name left, price right (stacks on phones). |
| `uppercase` | `true` | Upper-case card texts, the caption and the heading. |

The heading text is `localization.text.<locale>.widgetTitle`, and `generalLayout.showWidgetTitle: false` hides it.

## Responsive layout

Breakpoints are the project's `customizations.breakpoints` (phone up to 767px, tablet up to 1023px, desktop above). The layout follows the browser window width, not the width of the host element.

| | Phone | Tablet | Desktop |
|---|---|---|---|
| Layout | Stacked: look image and name, heading, carousel (16px side padding) | Side by side, look image 38% | Side by side, look image 33% (25% from 1280px) |
| Cards in view (`productsPerRow`) | 1.4 | 2.15 (a peek of the third) | 2 |
| Arrows | Over the carousel edges (swipe works too) | Over the carousel edges | Beside the carousel |
| Name and price | Name (2 lines max), price below | Side by side | Side by side |

Product images are lazy-loaded.

## Query by image

With `data-im-url` (and no `data-pid`) the widget sends `im_url` and shows the API's `query_tmp_url` as the reference image. That URL is a signed link that expires after about 10 minutes (`X-Amz-Expires=600`), so on a page left open longer the reference image will stop loading until the widget is re-rendered. There is no caption in this mode unless `qinfo` carries a title.
