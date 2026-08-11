# Oasis Warehouse Mobile

A mobile application for warehouse management with E-Barimt electronic invoice integration.

## Features

- 📦 **Inventory Management** - Track products and stock levels
- 📋 **Order Management** - Process and fulfill orders
- 🧾 **E-Barimt Integration** - Electronic invoice registration and printing
- 🖨️ **Bluetooth Printing** - Print receipts via ESC/POS thermal printers
- 📊 **Sales Reports** - View sales KPIs and analytics

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API URL and E-Barimt POS ID
   ```

3. Start development:
   ```bash
   npx expo start
   ```

## E-Barimt Integration

See [docs/E-BARIMT-INTEGRATION.md](docs/E-BARIMT-INTEGRATION.md) for detailed documentation on:
- API endpoints
- Offline queue management
- Bluetooth printing setup
- Troubleshooting

## Tech Stack

- **Framework**: Expo SDK 54 / React Native
- **Navigation**: expo-router
- **State**: React Context + AsyncStorage
- **API**: Axios
- **Printing**: react-native-esc-pos-printer
- **Bluetooth**: @aspect-dev/react-native-bluetooth-classic

## Documentation

- [E-Barimt Integration](docs/E-BARIMT-INTEGRATION.md)
- [Expo SDK v54 Docs](https://docs.expo.dev/versions/v54.0.0/)
