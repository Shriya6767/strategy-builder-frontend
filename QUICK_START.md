# Quick Start Guide - Strategy Config Database

## ⚡ Fast Setup (5 Steps)

### Step 1: Update Database Password
Edit `version_config_db.py` line 180:
```python
DB_CONFIG = {
    'host': 'localhost',
    'port': '5432',
    'database': 'strategy_data',    # ✅ Correct database
    'user': 'postgres',
    'password': 'YOUR_PASSWORD'     # ⚠️ Change this!
}
```

---

### Step 2: Create Table (if not exists)
Run the SQL file:
```bash
psql -U postgres -d strategy_data -f create_strategy_config_table.sql
```

Or manually in pgAdmin/psql:
```sql
CREATE TABLE IF NOT EXISTS strategy_config (
    strategy_id INTEGER PRIMARY KEY,
    strategy_name VARCHAR(255) NOT NULL,
    run_count INTEGER NOT NULL DEFAULT 0,
    save_count INTEGER NOT NULL DEFAULT 0
);
```

---

### Step 3: Install Python Package
```bash
pip install psycopg2-binary
```

---

### Step 4: Test Database Connection
```bash
python version_config_db.py
```

You should see:
```
✓ Database connection established
✓ Retrieved: {...}
✓ Run count incremented
...
```

---

### Step 5: Add to Your FastAPI App

In your `main.py` (or wherever your FastAPI app is):
```python
from version_config_api import router as version_config_router

app = FastAPI()
app.include_router(version_config_router)  # ✅ Add this line
```

---

## 🧪 Test It!

### Test 1: Check endpoints are available
Visit: `http://192.168.0.125:8000/docs`

You should see these new endpoints:
- `POST /api/version-config/save-strategy`
- `POST /api/version-config/increment-run-count`
- `GET /api/version-config/get-strategy/{id}`
- `GET /api/version-config/get-all-strategies`
- `DELETE /api/version-config/delete-strategy/{id}`

### Test 2: Save a strategy via Postman
```
POST http://192.168.0.125:8000/api/version-config/save-strategy
Content-Type: application/json

{
  "strategy_id": 999,
  "strategy_name": "Test Strategy"
}
```

### Test 3: Check database
```sql
SELECT * FROM strategy_config WHERE strategy_id = 999;
```

---

## 📋 Database Info

**Database:** `strategy_data`  
**Table:** `strategy_config`  
**Columns:**
- `strategy_id` (INTEGER PRIMARY KEY)
- `strategy_name` (VARCHAR(255) NOT NULL)
- `run_count` (INTEGER DEFAULT 0)
- `save_count` (INTEGER DEFAULT 0)

---

## 🔧 Frontend Integration

Update `App.jsx` to use database instead of localStorage:

```javascript
import { saveStrategyToDatabase, incrementRunCount } from './services/versionConfigApi';

// When saving strategy (around line 760):
await saveStrategyToDatabase(result.strategy_id, strategyName);

// When running backtest (around line 52):
if (strategyId && strategyId !== -999) {
  await incrementRunCount(strategyId);
}
```

---

## ✅ Done!

Your strategy data will now be stored in PostgreSQL instead of localStorage! 🎉

For detailed instructions, see: `VERSION_CONFIG_INTEGRATION_GUIDE.md`
