# Optimization Review - March 14, 2026

## Overview
A comprehensive review of the `mysite` web project, focusing on the `pages/tools`, `pages/games`, and shared infrastructure.

## 1. UX & Aesthetics
- **Consistent Visual Language**: The "sketchy" / hand-drawn aesthetic (using `sketch-card`, `font-hand`, `sketch-button`) is well-executed and provides a unique, cohesive brand identity.
- **Interactive Feedback**: Hover states and subtle rotations (e.g., `-rotate-1`) make the interface feel "alive" and responsive to user input.
- **Responsive Design**: Mobile-first approach is evident in the grid layouts and sticky navigation bars.

## 2. Code Quality & Architecture
- **Nuxt Conventions**: Excellent use of Nuxt 3/4 features including `definePageMeta`, `script setup`, and auto-imported composables.
- **Security**: `utils/safeRichText.ts` provides robust Markdown rendering with URL validation to prevent XSS.
- **Typing**: Good use of TypeScript interfaces and types in `utils/games/catalog.ts` and `utils/codeHighlight.ts`.
- **Refactoring Opportunity**: `components/WhiteboardCanvas.vue` is extremely large (~1800+ lines). It should be refactored by moving canvas logic into a dedicated composable (e.g., `useWhiteboardCanvas`) or splitting it into smaller sub-components (Toolbar, ColorPicker, TextEditor).

## 3. Performance
- **Code Splitting**: `nuxt.config.ts` correctly identifies heavy libraries like `highlight.js` and `marked` for manual chunking into `vendor-markdown`.
- **Worker Usage**: Heavy computation for games (e.g., `xiangqi-search.worker.ts`) is correctly offloaded to Web Workers to keep the UI thread responsive.

## 4. Accessibility & Maintainability
- **Accessibility**: While visually appealing, the site could benefit from more explicit `aria-label` attributes on interactive cards and buttons, especially those with only icons.
- **Data Management**: The hardcoded tools list in `pages/tools/index.vue` should be moved to a configuration file or a `@nuxt/content` collection to improve maintainability and allow for easier updates.
- **Build Warnings**: Fixed a recurring build warning where Nuxt's auto-import system conflicted with local `lang` parameters in `Marked` highlight callbacks.

## 5. Summary of Changes
### Pass 1: Data & Accessibility (Completed)
- **Refactored Tools Data**: Moved hardcoded tool-card data from `pages/tools/index.vue` to a new typed data module `utils/tools/catalog.ts` for better maintainability, following the pattern used for games.
- **Accessibility Improvements**: Added missing `aria-label` attributes to interactive elements in `pages/tools/index.vue`, `components/games/GameCatalogCard.vue`, `components/Footer.vue`, and `components/CollectionList.vue`.
- **Build Verification**: Confirmed that the project builds successfully.

### Pass 2: Component Unification & Keyboard Accessibility (Completed)
- **Shared Catalog Component**: Created `components/CatalogCard.vue` as a unified, flexible card component for both tools and games, reducing duplication and improving maintainability.
- **Keyboard Accessibility**: 
    - Added global `:focus-visible` styles in `assets/css/sketch.css` to ensure consistent, high-contrast focus indicators for all interactive elements (buttons, links, cards).
    - Integrated Tailwind `focus-visible:ring` for pill-shaped buttons in `components/games/GameShell.vue` to ensure polished focus states.
- **UI Cleanup & Refinement**:
    - Merged duplicate `<style scoped>` blocks in `components/CollectionArticle.vue`, cleaning up redundant CSS and refining the hand-drawn aesthetic for theme panels and back-to-top buttons.
    - Updated `pages/tools/index.vue` and `pages/games/index.vue` to use the new `CatalogCard` component.
- **Build Verification**: Confirmed that the project builds successfully with `npx nuxi build`.

## 6. Recommended Next Steps
- **Whiteboard Refactor**: Decouple the monolithic `components/WhiteboardCanvas.vue` (~1800 lines) into smaller, functional components (Toolbar, LayerManager, CanvasEngine) and a dedicated `useWhiteboard` composable.
- **Form Validation**: Add more robust client-side validation and ARIA live regions for the global settings modal in `Header.vue`.
- **Keyboard Shortcuts**: Add intuitive keyboard shortcuts for common actions in games (e.g., 'R' to restart, 'U' to undo) and tools (e.g., 'ESC' to close modals or clear inputs).
- **Service Worker / PWA**: Consider adding a service worker for basic offline support for the board games and utility tools.
