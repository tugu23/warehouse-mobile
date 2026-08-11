# Warehouse Mobile - E-Barimt Integration

## Overview

This document describes the E-Barimt (Electronic Bill of Sale) integration in the Warehouse Mobile app. E-Barimt is Mongolia's electronic invoice system required for VAT transactions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Warehouse Mobile App                      │
├─────────────────────────────────────────────────────────────┤
│  Order Detail Screen                                        │
│    └─> EBarimtPrintModal                                    │
│           ├─> EBarimtApiClient ──────> Backend API          │
│           ├─> OfflineQueueService ──> AsyncQueue           │
│           └─> EscPosPrintService ───> Bluetooth Printer      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. EBarimt API Client (`src/api/ebarimt.ts`)

Handles communication with the backend E-Barimt service.

**Endpoints:**
- `GET /api/ebarimt/status` - Check service availability
- `GET /api/ebarimt/information` - Get merchant info
- `POST /api/ebarimt/register/:orderId` - Register a sale
- `POST /api/ebarimt/return/:orderId` - Cancel/return a receipt
- `GET /api/ebarimt/check-tin/:tin` - Validate TIN
- `GET /api/etax/organization/:regNo` - Lookup organization

### 2. Offline Queue Service (`src/services/offline-queue.ts`)

Manages offline E-Barimt operations when network is unavailable.

**Features:**
- Stores failed operations in AsyncStorage
- Automatic retry with exponential backoff
- Queue processing when network restores
- Max 3 retry attempts per operation

**Queue Item Structure:**
```typescript
interface QueuedOperation {
  id: string;
  orderId: number;
  type: 'register' | 'return';
  payload: any;
  createdAt: number;
  retryCount: number;
}
```

### 3. ESC/POS Print Service (`src/services/escpos-service.ts`)

Sends formatted receipts to Bluetooth thermal printers.

**Features:**
- Bluetooth device scanning and pairing
- ESC/POS command generation
- QR code embedding for eBarimt verification
- Auto-cutter commands

**Print Flow:**
1. Connect to paired Bluetooth printer
2. Initialize printer (ESC @)
3. Print header, merchant info, items
4. Print QR code with verification URL
5. Print footer, cut paper

### 4. EBarimtPrintModal (`src/components/ebarimt-print-modal.tsx`)

UI component for E-Barimt operations.

**Features:**
- One-tap E-Barimt registration
- Visual status feedback
- Manual print trigger
- Error handling and retry

## User Flow

1. User opens an order from the Orders list
2. Taps "Э-Barimt" button in Order Detail screen
3. Modal appears with:
   - Order summary
   - "Бүртгэх" (Register) button
4. On success: Receipt data stored, option to print
5. On failure: Queued for retry or manual retry available

## Configuration

### Environment Variables (.env)

```env
EXPO_PUBLIC_API_URL=https://your-backend.example.com
EXPO_PUBLIC_EBARIMT_POS_ID=your-pos-id
```

### Required Permissions

**iOS (Info.plist):**
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Print receipts to Bluetooth printer</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Print receipts to Bluetooth printer</string>
```

**Android (app.json):**
```json
"android": {
  "permissions": [
    "BLUETOOTH",
    "BLUETOOTH_ADMIN",
    "BLUETOOTH_CONNECT",
    "BLUETOOTH_SCAN"
  ]
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Network offline | Queue operation, retry when online |
| API error | Show error, allow manual retry |
| Printer not connected | Show printer settings link |
| Print failed | Offer retry or skip printing |

## Database Schema (Backend Reference)

```sql
-- E-Barimt registrations
CREATE TABLE ebarimt_registrations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  bill_id VARCHAR(50) UNIQUE,
  lottery VARCHAR(20),
  receipt_date TIMESTAMP,
  qr_data TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  raw_response JSONB
);
```

## Testing

### Manual Test Checklist

- [ ] Register E-Barimt with online order
- [ ] Verify receipt appears in backend
- [ ] Print receipt to Bluetooth printer
- [ ] Test offline registration (airplane mode)
- [ ] Verify queue processes when back online
- [ ] Test TIN validation
- [ ] Test organization lookup

## Support

For E-Barimt API issues, contact the backend team.
For printing issues, verify Bluetooth printer compatibility with ESC/POS commands.
