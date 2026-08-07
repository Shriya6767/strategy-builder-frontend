# Strategy Loading Debug Guide

## Issue
When clicking a strategy button in the "Saved Strategies" tab, the backend shows "strategy loaded successfully" but the UI parameters don't populate in the StrategyBuilder.

## Changes Made
Added comprehensive console logging to track the entire data flow from backend to UI rendering.

## How to Debug

### Step 1: Open Browser Console
1. Open your React app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Clear any existing logs

### Step 2: Click a Strategy Button
1. Navigate to the "Saved Strategies" tab
2. Click on any strategy button
3. Watch the console logs

### Step 3: Analyze the Console Output

Look for these log sections in order:

#### A. SavedStrategiesList Component
```
[SavedStrategiesList] Strategy button clicked: {id: X, name: "..."}
[SavedStrategiesList] Calling onLoadStrategy with: {id: X, name: "..."}
```

#### B. App.jsx - Backend Call
```
[App] Loading strategy from backend: {strategyId: X, strategyName: "..."}
```

#### C. Backend Response (CRITICAL)
```
[App] ========== BACKEND RESPONSE START ==========
[App] Full response: {...}
[App] response.success: true/false
[App] response.data: {...}
[App] ========== BACKEND RESPONSE END ==========
```

**What to check:**
- Is `success: true`?
- Does `data` exist?
- Does `data.strategy` contain all the fields?
- Does `data.legs` contain the leg array?

#### D. Data Extraction
```
[App] Extracted strategy object: {...}
[App] Extracted legs array: [...]
[App] Number of legs: X
```

#### E. Config Mapping
```
[App] Loading complete config into StrategyBuilder: {...}
[App] Number of legs loaded: X
[App] First leg details: {...}
```

#### F. State Update
```
[App] Calling setStrategyConfig with loadedConfig
[App] setStrategyConfig called - React should re-render StrategyBuilder now
[App] setStrategyId called with: X
```

#### G. StrategyBuilder Re-render
```
[StrategyBuilder] ========== useEffect [savedConfig] TRIGGERED ==========
[StrategyBuilder] savedConfig: {...}
[StrategyBuilder] savedConfig keys: [...]
[StrategyBuilder] savedConfig.legs: [...]
[StrategyBuilder] savedConfig.legs.length: X
[StrategyBuilder] savedConfig is valid, restoring...
[StrategyBuilder] Calling setConfig with savedConfig
[StrategyBuilder] setConfig completed
```

## Common Issues & Solutions

### Issue 1: Backend returns 404
**Symptom:** Console shows "Failed to load resource: 404"
**Solution:** Backend doesn't have `/api/get-strategy` endpoint
- Check your Django/Flask backend
- Ensure the endpoint exists: `GET /api/get-strategy?strategy_id=X&strategy_name=Y`

### Issue 2: Backend returns wrong format
**Symptom:** `response.success` is undefined or `response.data` is null
**Expected format:**
```json
{
  "success": true,
  "data": {
    "strategy": {
      "symbol": "SPXW",
      "start_date": "2024-01-01",
      "entry_time": "13:30",
      ...all other fields...
    },
    "legs": [
      {
        "position_type": "BUY",
        "option_type": "CALL",
        ...all leg fields...
      }
    ]
  }
}
```

### Issue 3: Backend returns data but UI doesn't update
**Symptom:** All logs show data correctly but UI remains empty
**Check:**
1. Does section G (StrategyBuilder Re-render) appear in console?
2. If NO: React might not be detecting the state change
3. If YES: Check if `savedConfig.legs.length` matches expected count

### Issue 4: Key prop not forcing re-render
**Symptom:** StrategyBuilder useEffect doesn't trigger
**Solution:** The `key` prop should change with each strategy
- Current: `key={strategyId || 'default'}`
- Check if `strategyId` is actually changing in logs

## Backend Endpoint Requirements

Your backend should have this endpoint:

```python
# Django example
@api_view(['GET'])
def get_strategy(request):
    strategy_id = request.GET.get('strategy_id')
    strategy_name = request.GET.get('strategy_name')
    
    # Fetch from database
    strategy = Strategy.objects.get(id=strategy_id, name=strategy_name)
    legs = Leg.objects.filter(strategy_id=strategy_id)
    
    return Response({
        'success': True,
        'data': {
            'strategy': {
                'symbol': strategy.symbol,
                'start_date': strategy.start_date,
                'end_date': strategy.end_date,
                'entry_time': strategy.entry_time,
                'exit_time': strategy.exit_time,
                'initial_capital': strategy.initial_capital,
                'lot_size': strategy.lot_size,
                'strategy_type': strategy.strategy_type,
                # ... include ALL 70+ fields ...
            },
            'legs': [
                {
                    'position_type': leg.position_type,
                    'option_type': leg.option_type,
                    'strike_criteria': leg.strike_criteria,
                    # ... include all leg fields ...
                }
                for leg in legs
            ]
        }
    })
```

## Quick Test

Run this in browser console after clicking a strategy button:

```javascript
// Check if strategyConfig was updated in App.jsx
// (You'll need to expose this via window.debug or React DevTools)
console.log('Current strategyConfig:', /* check React state */);
```

## Files Modified
1. `/src/App.jsx` - Added detailed logging in `handleLoadStrategyFromBackend`
2. `/src/components/StrategyBuilder.jsx` - Added logging in `useEffect([savedConfig])`

## Next Steps After Testing
Once you run the test and share the console output:
1. If section C shows 404: Backend endpoint missing
2. If section C shows wrong format: Backend returning incorrect structure
3. If section G never appears: State update issue (unlikely with current code)
4. If all logs appear but UI empty: Possible form field binding issue
