# Screan

> **Warning**: This project is in very early alpha stage. Features may be incomplete, buggy, or change without notice. Use at your own risk.

A simple, elegant screenshot studio for creating App Store and Google Play screenshots.

## Features

- **App Store formats**: iPhone (6.9", 6.7", 6.5", 5.5"), iPad (13", 12.9", 11"), Mac (2880, 1280)
- **Google Play formats**: Phone (1080p, 1440p), Tablet (7", 10")
- **Position presets**: Top, Center, Bottom layouts
- **Customizable text**: Title and subtitle with separate font controls
- **Background colors**: Fully customizable
- **Device frame**: Optional border around screenshots
- **Shadow**: Add depth to your screenshots
- **Multi-format export**: Export all formats at once as a ZIP file
- **Drag & drop**: Easy screenshot import
- **Dark/Light mode**: Toggle between themes

## Usage

1. Select your target platform (iPhone, iPad, Mac, Android Phone, or Tablet)
2. Drag & drop your screenshots or click to add
3. Select a position preset (Top, Center, Bottom)
4. Customize title, subtitle, and colors
5. Choose which device formats to export
6. Click "Export" to download a ZIP with all formats

## Tech Stack

Pure HTML, CSS, and JavaScript. No build step, no frameworks. Only external dependency is JSZip for export.

## Development Status

This is an alpha release. Known limitations:
- Font rendering may vary across browsers
- Large batch exports may be slow
- Some edge cases in image sizing

## License

MIT
