# Version Config Database Integration Guide

## Overview
This guide explains how to replace localStorage with PostgreSQL database for storing strategy_id and strategy_name.

**Database Name:** `strategy_data`  
**Table Name:** `strategy_config`

---

## Files Created

### Backend Files:
1. **`version_config_db.py`** - Database handler with all CRUD operations
2. **`version_config_api.py`** - FastAPI endpoints for the database operations

### Frontend Files:
3. **`src/services/versionConfigApi.js`** - Frontend service to call the backend APIs

---

## Step 1: Database Setup

Your PostgreSQL table should be created like this:
```sql
CREATE TABLE strategy_config (
    strategy_id INTEGER PRIMARY KEY,
    strategy_name VARCHAR(255) NOT NULL,
    run_count INTEGER NOT NULL DEFAULT 0,
    save_count INTEGER NOT NULL DEFAULT 0
);
```

✅ This should be in your `strategy_data` database.

---

## Step 2: Configure Database Connection

### Update `version_config_db.py`

Find this section in the file (around line 180):

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': '5432',
    'database': 'compare_builder',
    'user': 'postgres',
    'password': 'your_password_here'  # ⚠️ CHANGE THIS
}
```

**Replace with your actual PostgreSQL credentials:**
```python
DB_CONFIG = {
    'host': 'localhost',           # Your PostgreSQL host
    'port': '5432',                # Your PostgreSQL port
    'database': 'strategy_data',   # Database name
    'user': 'postgres',            # Your PostgreSQL username
    'password': 'YOUR_ACTUAL_PASSWORD'  # Your PostgreSQL password
}
```

---

## Step 3: Install Required Python Package

```bash
pip install psycopg2-binary
```

---

## Step 4: Integrate with Your FastAPI Backend

### Option A: If you have `main.py`:

Add these lines to your `main.py`:

```python
from fastapi import FastAPI
from version_config_api import router as version_config_router

app = FastAPI()

# Include the version config router
app.include_router(version_config_router)

# ... rest of your existing routes ...
```

### Option B: If you have a different structure:

Just import and include the router wherever you define your FastAPI app:
```python
from version_config_api import router as version_config_router
app.include_router(version_config_router)
```

---

## Step 5: Test Backend (Optional but Recommended)

Run the database handler directly to test:
```bash
python version_config_db.py
```

This will run automated tests and show you if the database connection works.

---

## Step 6: Update Frontend Code

### In `App.jsx`, update the save strategy function:

**FIND THIS CODE (around line 760):**
```javascript
// ? PERSIST: Save to localStorage so it survives page refresh
localStorage.setItem('current_strategy_id', result.strategy_id);
```

**REPLACE WITH:**
```javascript
import { saveStrategyToDatabase } from './services/versionConfigApi';

// Inside handleSaveStrategy function, after save is successful:

// Save to database instead of localStorage
try {
  await saveStrategyToDatabase(result.strategy_id, strategyName);
  console.log('[App] Strategy saved to database successfully');
} catch (error) {
  console.error('[App] Failed to save strategy to database:', error);
  // Optionally show error to user
}
```

### In `App.jsx`, update the run backtest function:

**FIND THIS CODE (around line 52 in handleRunBacktest):**
```javascript
// Before running backtest, increment run_count
```

**ADD THIS CODE at the start of handleRunBacktest:**
```javascript
import { incrementRunCount } from './services/versionConfigApi';

const handleRunBacktest = async (payload) => {
  setIsLoading(true);
  setBacktestLoading(true);
  
  // Increment run count in database if strategy_id exists
  const strategyId = payload.strategy.strategy_id;
  if (strategyId && strategyId !== -999) {
    try {
      await incrementRunCount(strategyId);
      console.log('[App] Run count incremented for strategy_id:', strategyId);
    } catch (error) {
      console.error('[App] Failed to increment run count:', error);
      // Don't block backtest if this fails
    }
  }
  
  // ... rest of handleRunBacktest code ...
};
```

---

## Step 7: Remove localStorage Usage (Optional)

Search your codebase for:
- `localStorage.setItem('current_strategy_id'`
- `localStorage.getItem('current_strategy_id'`

Replace these with database calls if needed.

---

## API Endpoints Available

Once integrated, these endpoints will be available:

### 1. Save Strategy
```
POST http://192.168.0.125:8000/api/version-config/save-strategy
Body: {
  "strategy_id": 101,
  "strategy_name": "My Strategy"
}
```

### 2. Increment Run Count
```
POST http://192.168.0.125:8000/api/version-config/increment-run-count
Body: {
  "strategy_id": 101
}
```

### 3. Get Strategy by ID
```
GET http://192.168.0.125:8000/api/version-config/get-strategy/101
```

### 4. Get All Strategies
```
GET http://192.168.0.125:8000/api/version-config/get-all-strategies
```

### 5. Delete Strategy
```
DELETE http://192.168.0.125:8000/api/version-config/delete-strategy/101
```

---

## Testing the Integration

### Test from Frontend:
1. Save a strategy → Check if it appears in the database
2. Run a backtest → Check if run_count increments
3. Save the same strategy again → Check if save_count increments

### Test from Postman:
Use the API endpoints listed above to manually test each operation.

### Check Database:
```sql
-- Connect to the database
\c strategy_data

-- View all strategies
SELECT * FROM strategy_config ORDER BY strategy_id DESC;
```

---

## Database Schema Details

| Column | Type | Description |
|--------|------|-------------|
| `strategy_id` | INTEGER PRIMARY KEY | Unique identifier for the strategy |
| `strategy_name` | VARCHAR(255) NOT NULL | Name of the strategy |
| `run_count` | INTEGER NOT NULL DEFAULT 0 | Number of times backtest was run |
| `save_count` | INTEGER NOT NULL DEFAULT 0 | Number of times strategy was saved |

---

## Behavior

### When User Saves Strategy:
1. Frontend calls `saveStrategyToDatabase(strategy_id, strategy_name)`
2. Backend checks if `strategy_id` already exists
3. If exists → Update name and increment `save_count`
4. If new → Insert with `save_count = 1`, `run_count = 0`

### When User Runs Backtest:
1. Frontend calls `incrementRunCount(strategy_id)`
2. Backend increments `run_count` by 1

---

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `version_config_db.py`
- Test connection: `python version_config_db.py`

### API Endpoint Not Found
- Ensure `version_config_api.py` router is included in your FastAPI app
- Check FastAPI docs: `http://192.168.0.125:8000/docs`

### Frontend Errors
- Check browser console for errors
- Verify `API_URL` in `src/services/api.js` is correct
- Check network tab to see if requests are being sent

---

## Summary

✅ **Backend**: Database handler + FastAPI endpoints created  
✅ **Frontend**: Service file created to call APIs  
✅ **Schema**: Table already exists in your database  

**Next Steps:**
1. Update `DB_CONFIG` with your PostgreSQL password
2. Install `psycopg2-binary`
3. Include router in your FastAPI app
4. Update `App.jsx` to use database instead of localStorage
5. Test the integration

---

## Questions?

If you need help with any step, let me know! 🚀
