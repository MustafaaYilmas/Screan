# Screan

> **Warning**: This project is in very early alpha stage. Features may be incomplete, buggy, or change without notice. Use at your own risk.

A simple, elegant screenshot studio for creating App Store and Google Play screenshots.

## Features

### Screenshot Formats
- **App Store formats**: iPhone (6.9", 6.7", 6.5", 5.5"), iPad (13", 12.9", 11"), Mac (2880, 1280)
- **Google Play formats**: Phone (1080p, 1440p), Tablet (7", 10")

### Design Options
- **Position presets**: Top, Center, Bottom layouts
- **Customizable text**: Title and subtitle with separate font controls
- **Background colors**: Fully customizable with color picker
- **Device frame**: Optional border around screenshots
- **Shadow**: Add depth to your screenshots

### Multi-Language Support
- **Localization**: Add multiple languages to your screenshots
- **AI Translation**: Automatic translation powered by Claude API (Haiku 4.5)
- **Language management**: Add/remove languages directly from the selector
- **Per-language content**: Each screenshot stores content for all configured languages

### Export & Storage
- **Multi-format export**: Export all formats at once as a ZIP file
- **Persistent storage**: Screenshots and settings saved in IndexedDB
- **Drag & drop**: Easy screenshot import

### User Interface
- **Dark/Light mode**: Toggle between themes
- **Preview toolbar**: Quick access to language switching and settings
- **Responsive design**: Works on various screen sizes

## Usage

1. Select your target platform (iPhone, iPad, Mac, Android Phone, or Tablet)
2. Drag & drop your screenshots or click to add
3. Select a position preset (Top, Center, Bottom)
4. Customize title, subtitle, and colors
5. Add languages from the language selector dropdown
6. Use AI translation (requires Claude API key) or manually translate
7. Choose which device formats to export
8. Click "Export" to download a ZIP with all formats

## AI Translation

Screan includes built-in AI translation powered by Claude API:

1. Add a new language from the dropdown selector
2. Enter your Claude API key (stored locally in your browser)
3. Click the magic wand icon to translate all screenshots
4. Translations are optimized for app store marketing text

> **Note**: The API key is stored locally and never sent anywhere except directly to Anthropic's API.

## Tech Stack

Pure HTML, CSS, and JavaScript. No build step, no frameworks.

External dependencies:
- **JSZip**: For ZIP export
- **Lucide Icons**: For UI icons
- **Claude API**: For AI translation (optional)

## Development Status

This is an alpha release. Known limitations:
- Font rendering may vary across browsers
- Large batch exports may be slow
- Some edge cases in image sizing

## License

MIT
