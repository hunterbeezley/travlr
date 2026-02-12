# Travlr App - Setup Instructions

## Setup Steps

### 1. Get the Project Files

https://github.com/hunterbeezley/travlr

`git clone https://github.com/hunterbeezley/travlr.git`

### 2. Open Terminal

### 3. Navigate to the Project

In the Terminal, type this command and press Enter:

```bash
cd ~/YOUR_PATH_HERE 
```

### 4. Run the Setup Script

Copy and paste this command into Terminal and press Enter:

```bash
./setup.sh
```

The setup script will:
- Install Homebrew (if needed)
- Install Node.js (if needed)
- Install all app dependencies
- Check your environment configuration

**Important:** You may be asked to enter your Mac password. When you type it, nothing will appear on screen - this is normal! Just type your password and press Enter.

### 5. Run dev to test app

After setup completes, you can choose to start the app immediately, or start it later by running:

```bash
cd ~/YOUR_PATH_HERE
npm run dev
```

Then open your web browser and go to: **http://localhost:3000**

## Stopping the App

When you're done testing:
1. Go back to the Terminal window
2. Press `Ctrl + C` (hold Control and press C)
3. The app will stop



