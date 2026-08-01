# EV Charging Intelligence Dashboard

## Overview
This project is an end-to-end EV charging infrastructure dashboard that visualizes global charging stations using real-time data from the OpenChargeMap API.

It combines a FastAPI backend for data fetching and processing with a Next.js frontend for interactive map-based visualization.

---

## Architecture
- Frontend: Next.js (TypeScript), MapLibre GL  
- Backend: FastAPI (Python)  
- Data Source: OpenChargeMap API  

---

## Data Flow
OpenChargeMap API → FastAPI Backend → Data Normalisation → JSON API → Next.js Frontend → Map Rendering

---

## Data Normalisation
The raw API data contains nested structures.

A normalization process extracts and structures key fields:
- id  
- name  
- operator  
- latitude (lat)  
- longitude (lng)  
- power (kW)  
- level_id  
- status  

This ensures consistent and clean data for frontend usage.

---

## Features
- Global EV charging station visualization  
- Interactive map with markers  
- Backend metrics computation  

---

## Issues Faced and Fixes

### 404 Not Found
- Cause: API route was missing  
- Fix: Implemented `/api/stations` endpoint in FastAPI  

### 500 Internal Server Error
- Cause: Backend crash due to incorrect method usage and unsafe data access  
- Fix: Corrected method usage and added safe fallback handling  

### 403 Forbidden
- Cause: OpenChargeMap blocked API requests  
- Fix: Added `User-Agent` header  

### Map Not Showing Data
- Cause: Invalid filtering logic and missing latitude/longitude validation  
- Fix: Implemented safe filtering and null checks  

### React Runtime Error
- Cause: Accessing `stations.length` when undefined  
- Fix: Used `stations?.length || 0`  

---

## API Endpoints

### `/api/stations`
Returns normalized EV charging station data.

### `/api/metrics`
Returns aggregated statistics.
 
 ## API Endpoints

### `/api/stations`
Returns EV charging stations filtered by map bounds and zoom level.

### `/api/top-operators`
Returns top operators ranked by station count.

### `/api/stations/csv`
Exports the dataset as a CSV file.

### `/health`
Returns backend health status and total station count.

---

## How to Run

### Backend (FastAPI)

```bash
cd EV
venv\Scripts\activate   # or source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
---

### Frontend
cd frontend
npm install 
npm run dev
Frontend run at  http://localhost:3000⁠
  