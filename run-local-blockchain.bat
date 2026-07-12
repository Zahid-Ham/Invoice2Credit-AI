@echo off
title Invoice2Credit - Local Blockchain Node
echo ===================================================
echo   Invoice2Credit AI - Startup Local Blockchain Node
echo ===================================================
echo.

cd blockchain

echo [1/3] Compiling Solidity Smart Contracts...
call npm run compile
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] compilation failed. Make sure Node.js is installed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Starting Hardhat Local Node in a new window...
start "Hardhat Local Node" cmd /c "npx hardhat node"

echo Waiting 5 seconds for node to boot up...
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Deploying smart contracts to local network...
call npm run deploy:local
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed. Is the local node running?
    pause
    exit /b %errorlevel%
)

echo.
echo [4/4] Exporting deployment addresses to backend and frontend...
call npm run export:local
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment export failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   Local Blockchain Node is UP and configured!
echo   You can close this window now. Leave the
echo   "Hardhat Local Node" window running in the bg.
echo ===================================================
echo.
pause
