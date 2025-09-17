# Changelog

All notable changes to this project will be documented in this file.

The format is an adaptation of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added


### Fixed


### Changed


### Removed


### Deprecated


### Security


### Build


### Chore

## [1.0.17](https://github.com/visenze/visenze-experiences-web/compare/1.0.16...1.0.17)

<!-- BEGIN visenze-experiences-web 1.0.17 -->
### Added

- All widgets: Send `session_init` event to ViSenze analytics on widget initialization
<!-- END visenze-experiences-web 1.0.17 -->

## [1.0.16](https://github.com/visenze/visenze-experiences-web/compare/1.0.15...1.0.16) - 2025-09-10

<!-- BEGIN visenze-experiences-web 1.0.16 -->
### Added

- camera-search: Made the "capture image with your camera" button text localized and customizable
<!-- END visenze-experiences-web 1.0.16 -->

## [1.0.15](https://github.com/visenze/visenze-experiences-web/compare/1.0.14...1.0.15) - 2025-09-05

<!-- BEGIN visenze-experiences-web 1.0.15 -->
### Highlights

The following widgets are available under stable status and will follow our versioning policy:
- In-page carousel

### Added

- camera-search: Added entry point to activate device camera directly

### Updated

- All widgets: Updated brand logo
<!-- END visenze-experiences-web 1.0.15 -->

## [1.0.14](https://github.com/visenze/visenze-experiences-web/compare/1.0.13...1.0.14) - 2025-08-20

<!-- BEGIN visenze-experiences-web 1.0.14 -->
This release fixes some interactions within shopping-assistant widget, which is still in beta status.
<!-- END visenze-experiences-web 1.0.14 -->

## [1.0.13](https://github.com/visenze/visenze-experiences-web/compare/1.0.12...1.0.13) - 2025-07-18

<!-- BEGIN visenze-experiences-web 1.0.13 -->
### Fixes

- similar-search: Fixed bug where reference image was not displayed if `data-pid` is passed but `data-url` is not
- similar-search: Fixed bug where image+text query was only passing the text if `data-pid` is used as reference
<!-- END visenze-experiences-web 1.0.13 -->

<!-- BEGIN visenze-experiences-web 1.0.12 -->
## [1.0.12](https://github.com/visenze/visenze-experiences-web/compare/1.0.11...1.0.12) - 2025-07-18

### Added

- similar-search: Supported usage of product ID instead of product image URL as the basis for search
<!-- END visenze-experiences-web 1.0.12 -->

<!-- BEGIN visenze-experiences-web 1.0.11 -->
## [1.0.11](https://github.com/visenze/visenze-experiences-web/compare/1.0.10...1.0.11) - 2025-06-19

### Added

- All widgets: Added basic translations to Polish for most displayed texts
- (internal) Added configurations and callbacks for wishlist and add-to-cart icons
<!-- END visenze-experiences-web 1.0.11 -->

<!-- BEGIN visenze-experiences-web 1.0.10 -->
## [1.0.10](https://github.com/visenze/visenze-experiences-web/compare/1.0.9...1.0.10) - 2025-06-06

### Added

- All widgets: Configuration for source of main image + on-hover image; this replaced the internal `useBestProductImages` field
- All widgets: Configuration to show alternative products instead of the main result products; this replaced the internal `useAlternatives` field

### Changed

- camera-search, similar-search: Updated the default text for the search history
- camera-search, similar-search: Removed the scroll bar in product grid for larger screen size
<!-- END visenze-experiences-web 1.0.10 -->

<!-- BEGIN visenze-experiences-web 1.0.9 -->
## [1.0.9](https://github.com/visenze/visenze-experiences-web/compare/1.0.8...1.0.9) - 2025-06-02

### Fixed

- (internal) Fixed issue where config updated during runtime are not reflected when toggling dark mode / locale
<!-- END visenze-experiences-web 1.0.9 -->

<!-- BEGIN visenze-experiences-web 1.0.8 -->
## [1.0.8](https://github.com/visenze/visenze-experiences-web/compare/1.0.7...1.0.8) - 2025-05-23

### Fixed

- more-like-this: Fixed wrong condition for adding default margin classes
- camera-search, similar-search, embedded-search-results, search-bar: Fixed search bar input not activated by enter on certain devices
- All widgets: Added missing `wigmix-product-card-price-row` selector if original price does not exist
<!-- END visenze-experiences-web 1.0.8 -->

<!-- BEGIN visenze-experiences-web 1.0.7 -->
## [1.0.7](https://github.com/visenze/visenze-experiences-web/compare/1.0.6...1.0.7) - 2025-05-19

### Added

- camera-search, similar-search, icon-triggered-grid: Font color settings for popup trigger button text if the icon is configured to use the default color

### Chore

- search-bar: Moved search bar overlay out of search input div
- embedded-search-results, search-bar: Removed internal event `wigmix_internal_search_bar_append_image`
<!-- END visenze-experiences-web 1.0.7 -->

<!-- BEGIN visenze-experiences-web 1.0.6 -->
## [1.0.6](https://github.com/visenze/visenze-experiences-web/compare/1.0.5...1.0.6) - 2025-05-14

### Added

- Widget client: New method `renderMissing` to re-render widgets only on matched selectors that has no rendered widget yet

### Changed

- camera-search, search-bar: Updated the default images shown in the gallery
<!-- END visenze-experiences-web 1.0.6 -->

<!-- BEGIN visenze-experiences-web 1.0.5 -->
## [1.0.5](https://github.com/visenze/visenze-experiences-web/compare/1.0.4...1.0.5) - 2025-04-29

### Changed

- All widgets: Updated `show_best_product_images` parameter used in recommendation API calls to `false` by default

### Chore

- All widgets: Internal update to use `results.limit` and `results.showBestProductImages` configurations to influence API call results
<!-- END visenze-experiences-web 1.0.5 -->

<!-- BEGIN visenze-experiences-web 1.0.4 -->
## [1.0.4](https://github.com/visenze/visenze-experiences-web/compare/1.0.3...1.0.4) - 2025-04-25

### Added

- All widgets: Added support for hiding decimal values in price fields
- All widgets: Added basic translations to Spanish, French, Portuguese, German, Italian, Korean, Japanese, and Thai for most displayed texts

### Fixed

- Fixed bug where parameters specified in `searchSettings` were unable to override certain parameters when using recommendations API.

### Changed

- camera-search, similar-search, icon-triggered-grid: Updated popup trigger buttons to support combination of icon and text and use `button` instead of `div`
- similar-search, icon-triggered-grid: Updated popup trigger buttons to have white background by default
- camera-search, similar-search, embedded-search-results: Updated find similar buttons to use `button` instead of `div`
<!-- END visenze-experiences-web 1.0.4 -->

<!-- BEGIN visenze-experiences-web 1.0.3 -->
## [1.0.3](https://github.com/visenze/visenze-experiences-web/compare/1.0.2...1.0.3) - 2025-04-11

### Changed

- embedded-search-results: Display the different detected boxes for initial image query
<!-- END visenze-experiences-web 1.0.3 -->

<!-- BEGIN visenze-experiences-web 1.0.2 -->
## [1.0.2](https://github.com/visenze/visenze-experiences-web/compare/1.0.1...1.0.2) - 2025-03-26

### Fixed

- embedded-search-results: Fixed bug where navigating to the next page via infinite scrolling would cause facet filtering to use the wrong page number
- more-like-this: Fixed product slider horizontal margin settings not taking effect

### Changed

- All widgets: Updated default product card image aspect ratio to `2 / 3`
- All widgets: Updated product card image fitting behavior from `contain` to `cover` 
- camera-search, similar-search, search-bar: Standardized general modal layout
- camera-search, search-bar: Larger dropzone for uploading images
- search-bar: Displayed "Powered by ViSenze" logo by default on the upload modal footer
- shop-the-look: Reduced reference image size
- shop-the-look: Added slight opacity to product grid background in mobile view
- more-like-this, shop-the-look: Updated product slider to align left by default

### Removed

- camera-search: Removed "use camera" button

### Chore

- Added more unit tests for camera-search, similar-search, and embedded-search-results
<!-- END visenze-experiences-web 1.0.2 -->

<!-- BEGIN visenze-experiences-web 1.0.1 -->
## [1.0.1](https://github.com/visenze/visenze-experiences-web/compare/1.0.0...1.0.1) - 2025-03-11

### Highlights

The following widgets are available under stable status and will follow our versioning policy:
- Search bar
- Embedded search results
<!-- END visenze-experiences-web 1.0.1 -->

<!-- BEGIN visenze-experiences-web 1.0.0 -->
## 1.0.0 - 2025-02-28

### Highlights

This is the initial full release of ViSenze web widgets.

The following widgets are available under stable status and will follow our versioning policy:
- Camera search
- Similar search
- More like this (carousel of products)
- Shop the look (carousel of products with reference image)
- Embedded grid (grid of products)
- Shoppable lookbook (grid of products with reference image)
- Icon-triggered grid
<!-- END visenze-experiences-web 1.0.0 -->

[unreleased]: https://github.com/visenze/visenze-experiences-web/compare/1.0.1...develop
