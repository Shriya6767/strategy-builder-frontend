# 🐛 FIX: Trail SL Values Not Loading Correctly

## ❌ **PROBLEM:**

User entered Trail SL values:
- **Instrument Moves:** 10
- **Stoploss Moves (Lock Value):** 5

After saving and reloading strategy, UI shows:
- **Instrument Moves:** 10 ✅
- **Stoploss Moves (Lock Value):** 10 ❌ (should be 5)

---

## 🔍 **ROOT CAUSE:**

**File:** `src/services/strategyApi.js`
**Function:** `buildSaveStrategyPayload()`
**Lines:** 301-302

```javascript
// ❌ BUG: Both fields were using trail_value!
instrument_moves: toNumber(leg.trail_value) || 0,   // 10
stoploss_moves: toNumber(leg.trail_value) || 0,     // 10 (WRONG! Should be trail_lock_value)
```

The `stoploss_moves` field was reading from `leg.trail_value` instead of `leg.trail_lock_value`, causing both values to be saved as **10**.

---

## ✅ **SOLUTION:**

Changed `stoploss_moves` to read from the correct field:

**File:** `src/services/strategyApi.js`
**Lines:** 301-302 (after fix)

```javascript
// ✅ FIXED: Each field uses its correct source
instrument_moves: toNumber(leg.trail_value) || 0,          // 10 ✅
stoploss_moves: toNumber(leg.trail_lock_value) || 0,       // 5 ✅
```

---

## 📋 **FLOW:**

### **Save (Frontend → Backend):**
```
Frontend fields:
- trail_value: 10
- trail_lock_value: 5

↓ buildSaveStrategyPayload() transforms to:

Backend fields:
- instrument_moves: 10
- stoploss_moves: 5
```

### **Load (Backend → Frontend):**
```
Backend returns:
- instrument_moves: 10
- stoploss_moves: 5

↓ handleLoadStrategyFromBackend() transforms to:

Frontend fields:
- trail_value: 10
- trail_lock_value: 5
```

---

## 🧪 **TESTING:**

### **Test Case:**
```
1. Open UI → Add leg → Enable Trail SL
2. Enter Instrument Moves: 10
3. Enter Stoploss Moves: 5
4. Save strategy
5. Refresh browser
6. Load saved strategy from "Saved Strategies" tab
7. ✅ EXPECTED: UI shows Instrument Moves=10, Stoploss Moves=5
8. ❌ BEFORE FIX: UI showed both as 10
```

---

## 📝 **FILES MODIFIED:**

1. **`src/services/strategyApi.js` (line 302)**
   - Changed: `stoploss_moves: toNumber(leg.trail_value)`
   - To: `stoploss_moves: toNumber(leg.trail_lock_value)`

---

## ⚠️ **IMPORTANT NOTES:**

1. **Existing saved strategies** may have incorrect data (both values saved as same number)
2. After this fix, **newly saved strategies** will store correct values
3. To fix existing strategies, users need to:
   - Load the strategy
   - Re-enter the correct Stoploss Moves value
   - Save again

---

## ✅ **VERIFICATION CHECKLIST:**

- [x] Save payload uses `trail_lock_value` for `stoploss_moves`
- [x] Load transformation reads `stoploss_moves` into `trail_lock_value`
- [x] Frontend displays both values correctly after load
- [x] Version from Context is used when loading strategy

---

**Status:** ✅ **FIXED**
**Date:** 2026-08-06
**Files Modified:** `src/services/strategyApi.js` (line 302)
