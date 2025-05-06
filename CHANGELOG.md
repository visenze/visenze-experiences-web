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
