# Personal Website

A modern, minimalist personal website built with Nuxt 3, featuring a blog, documentation system, and column sections.

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Content**: [Nuxt Content](https://content.nuxtjs.org/)
- **Deployment**: Static Site Generation

## Development

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd web
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

The site will be available at `http://localhost:3000`

### Project Structure

```
web/
├── components/        # Vue components
├── content/          # Markdown and JSON content
│   ├── store/         # Store pages
│   ├── tech/         # Tech blog posts
│   └── column/       # Column content and navigation
├── layouts/          # Page layouts
├── pages/           # Route pages
├── public/          # Static assets
└── assets/          # CSS and other assets
```

### Content Management

- **Tech**: Add markdown files to `content/tech/`
- **Store**: Add markdown files to `content/store/`
- **Columns**: Update `content/column/columns.json`

## Building and Deployment

### Local Build

To build the site locally:

```bash
# Generate static site
pnpm generate

# Preview the built site
pnpm preview
```

The static site will be generated in the `.output/public` directory.

### Production Deployment

1. Build the site:
```bash
pnpm generate
```

2. Deploy the `.output/public` directory to your hosting service.

#### Deployment Options

- **Static Hosting** (Recommended):
  - Netlify
  - Vercel
  - GitHub Pages
  - Cloudflare Pages

- **Server Hosting**:
  - Node.js server
  - Docker container

### Environment Variables

Create a `.env` file in the root directory:

```env
NUXT_PUBLIC_SITE_URL=https://your-site.com
# Add other environment variables as needed
```

## Customization

### Styling

- Main styles are in `assets/css/`
- Tailwind configuration in `tailwind.config.js`
- Prose styles for markdown in `assets/css/prose.css`

### Content Configuration

- Update site metadata in `nuxt.config.ts`
- Modify layouts in `layouts/`
- Customize components in `components/`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
