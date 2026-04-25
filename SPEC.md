# Gym POS System - Specification

## 1. Project Overview

- **Project Name**: GymPOS
- **Type**: Desktop/Web POS Application
- **Core Functionality**: Point of Sale system for gyms with membership management, product sales, and member tracking
- **Target Users**: Gym staff and administrators

## 2. UI/UX Specification

### Layout Structure

- **Sidebar Navigation** (left, 240px width):
  - Logo/Brand
  - Navigation links: Dashboard, Members, Sales, Products, Memberships
  - User info at bottom

- **Main Content Area**: Dynamic based on selected view
- **Header**: Page title, search bar, quick actions

### Visual Design

- **Color Palette**:
  - Primary: #2563EB (Blue)
  - Secondary: #1E293B (Dark Slate)
  - Accent: #10B981 (Emerald Green)
  - Background: #F8FAFC
  - Surface: #FFFFFF
  - Text Primary: #1E293B
  - Text Secondary: #64748B
  - Danger: #EF4444
  - Warning: #F59E0B

- **Typography**:
  - Font Family: Inter, system-ui, sans-serif
  - Headings: 24px (h1), 20px (h2), 16px (h3)
  - Body: 14px
  - Small: 12px

- **Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48)

- **Visual Effects**:
  - Card shadows: 0 1px 3px rgba(0,0,0,0.1)
  - Hover transitions: 150ms ease
  - Border radius: 8px (cards), 6px (buttons), 4px (inputs)

### Components

- **Buttons**: Primary (blue), Secondary (gray), Danger (red), Success (green)
- **Cards**: White background, shadow, 8px radius
- **Tables**: Striped rows, hover highlight
- **Forms**: Labeled inputs with validation
- **Modals**: Centered overlay with backdrop
- **Badges**: Status indicators (active, expired, pending)

## 3. Functionality Specification

### Dashboard
- Today's sales summary (total revenue, transactions count)
- Active members count
- Quick stats cards
- Recent transactions list

### Members Management
- List all members with search/filter
- Add new member (name, phone, email, membership type, start date)
- Edit member details
- View member history
- Member status: Active, Expired, Frozen

### Memberships
- Predefined membership types (e.g., Monthly, Quarterly, Annual)
- Set prices for each type
- Define duration in days

### Products
- List gym products (supplements, accessories)
- Add/Edit/Delete products
- Set prices and stock quantities
- Product categories

### Sales/POS
- Quick member search (for membership renewal)
- Product selection
- Calculate totals
- Process sale (cash, card)
- Print receipt (optional)
- Daily sales history

### Data Storage
- Local JSON file storage (for simplicity)
- Located in user data directory

## 4. Acceptance Criteria

- [ ] Application launches without errors
- [ ] Can navigate between all sections
- [ ] Can add, edit, delete members
- [ ] Can create different membership types with prices
- [ ] Can add and sell products
- [ ] Sales are recorded and displayed in history
- [ ] Dashboard shows accurate statistics
- [ ] Data persists between sessions
- [ ] Responsive UI that works on different screen sizes
