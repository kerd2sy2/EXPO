const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .lottie animation files
config.resolver.assetExts.push('lottie');

module.exports = config;

