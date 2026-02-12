#!/bin/bash

# Travlr App Setup Script
# This script will set up everything needed to run the Travlr app

set -e  # Exit on any error

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

clear
echo "=================================================="
echo "        Travlr App Setup Script"
echo "=================================================="
echo ""
echo "This script will install everything you need to"
echo "run the Travlr app on your Mac."
echo ""
echo "Please don't close this window until it's done!"
echo ""
echo "=================================================="
echo ""
sleep 2

# Step 1: Check and install Homebrew
print_step "Step 1/5: Checking for Homebrew (Mac package manager)..."
sleep 1

if command_exists brew; then
    print_success "Homebrew is already installed"
else
    print_warning "Homebrew not found. Installing Homebrew..."
    echo ""
    echo "You may be asked to enter your Mac password."
    echo "The password won't show as you type - this is normal!"
    echo ""
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi

    print_success "Homebrew installed successfully"
fi
echo ""

# Step 2: Check and install Node.js
print_step "Step 2/5: Checking for Node.js (JavaScript runtime)..."
sleep 1

if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is already installed (version $NODE_VERSION)"
else
    print_warning "Node.js not found. Installing Node.js..."
    brew install node
    print_success "Node.js installed successfully"
fi
echo ""

# Step 3: Verify we're in the project directory
print_step "Step 3/5: Verifying project directory..."
sleep 1

if [ -f "package.json" ]; then
    print_success "Found package.json - in correct directory"
else
    print_error "package.json not found!"
    echo ""
    echo "Make sure you run this script from the travlr project directory."
    echo "Example: cd ~/Desktop/travlr && bash setup.sh"
    exit 1
fi
echo ""

# Step 4: Install project dependencies
print_step "Step 4/5: Installing project dependencies..."
echo "This may take a few minutes. Please wait..."
sleep 1

npm install
print_success "All dependencies installed successfully"
echo ""

# Step 5: Check environment variables
print_step "Step 5/5: Checking environment configuration..."
sleep 1

if [ -f ".env.local" ]; then
    print_success "Environment file (.env.local) found"
    echo ""
    print_warning "IMPORTANT: Make sure your .env.local file contains:"
    echo "  - Supabase URL and API key"
    echo "  - Google Maps API key"
    echo ""
else
    print_warning "Missing .env.local file!"
    echo ""
    echo "Creating a template .env.local file for you..."
    cat > .env.local << 'EOF'
# Travlr Environment Variables
# Fill in your actual values below

# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps API Configuration (Client-side)
# Get this from: https://console.cloud.google.com/apis/credentials
# Enable: Maps JavaScript API, Places API, Geocoding API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Google Places API Configuration (Server-side only)
# Using same key as Maps API (can be separated for stricter security)
GOOGLE_PLACES_API_KEY=your_google_maps_api_key_here
EOF

    print_success "Template .env.local created!"
    echo ""
    print_error "IMPORTANT: You must edit .env.local and add your actual API keys before running the app!"
    echo ""
    echo "Contact the developer for the correct values to use."
    echo ""
    exit 0
fi

# All done!
echo ""
echo "=================================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Your Travlr app is ready to run!"
echo ""
echo "To start the app:"
echo -e "  1. Make sure you're in the project directory"
echo -e "  2. Run: ${BLUE}npm run dev${NC}"
echo -e "  3. Open your browser to: ${BLUE}http://localhost:3000${NC}"
echo ""
echo "To stop the app: Press Ctrl+C in the terminal"
echo ""
echo "=================================================="
echo ""

# Ask if they want to start the app now
read -p "Would you like to start the app now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_step "Starting Travlr app..."
    echo ""
    echo "The app will open at: http://localhost:3000"
    echo "Press Ctrl+C to stop the app when you're done testing"
    echo ""
    sleep 2
    npm run dev
fi
