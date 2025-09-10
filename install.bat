@echo off
echo Installing Curl MCP Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if curl is installed
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: curl is not installed or not in PATH
    echo Please install curl or ensure it's available in your system PATH
)

REM Install npm dependencies
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
echo Next steps:
echo 1. Add the server configuration to your Claude Desktop config file
echo 2. Copy the configuration from claude_desktop_config.json
echo 3. Restart Claude Desktop
echo.
echo Configuration path: %APPDATA%\Claude\claude_desktop_config.json
echo.
pause
