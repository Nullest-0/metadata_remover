# Metadata Auto Remover

A Chrome extension that removes metadata from files automatically at the moment of uploading them.

## How to install

1. Download this repo
2. Go to <chrome://extensions/> on Google Chrome
3. Enable `Developer mode`
4. Click on `Load unpacked` and select the folder / directory that you downloaded earlier

## Current Features

- Automatic metadata removal on file upload
- A page for manual metadata stripping & analysis

## Current Limitations

- Only supports `png` and `jpeg` files
- Expects the files to be non-corrupt
- Only works with `input` HTML tags. Drag & drop, copy & pasting files are not handled
- Analysis page doesn't correctly display all metadata types. Missing essentail metadata types like `EXIF` in `jpeg` files
