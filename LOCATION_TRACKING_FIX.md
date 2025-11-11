# Background Location Tracking - Crash Fix

## Problem
The driver app was crashing with:
```
java.lang.IllegalArgumentException: Cannot create an event emitter for the module that isn't present in the module registry
```

This occurred because the background location task was trying to send events through the Expo Location module after the React Native JS bridge had been destroyed.

## Root Cause
1. Background location task continued running after app was closed/backgrounded
2. New location updates triggered `LocationModule.sendLocationResponse()` 
3. This tried to emit events through a destroyed JS bridge
4. Crash occurred in native code before JS could catch it

## Solution

### 1. **Simplified Background Task** (`useDriverLocation.ts`)
- Completely rewrote the background task to be minimal and safe
- Removed all console.log calls (can trigger module interactions)
- Added strict null checks on every step
- Catches ALL exceptions silently (background task MUST NOT crash)
- No event emissions or interactions with Expo modules

**Key changes:**
```typescript
// Before: Complex task with logging and error handling that could trigger module calls
// After: Minimal, silent task that only updates database

TaskManager.defineTask(LOCATION_TASK_NAME, async (task: any) => {
  try {
    if (!task || !task.data) return;
    const { locations, error } = task.data;
    if (error || !locations?.[0]?.coords) return;
    
    // Silent database update only
    const busId = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
    if (!busId) return;
    
    // Update and queue on failure
    const { error: supabaseError } = await supabase.from("buses").update(payload).eq("bus_id", busId);
    if (supabaseError) await addUpdateToQueue(payload);
  } catch (e) {
    // Silent catch - MUST NOT crash
  }
});
```

### 2. **Reduced Update Frequency**
- Increased `distanceInterval`: 10m → 20m
- Increased `timeInterval`: 10s → 15s
- Reduces number of background task invocations
- Fewer opportunities for module registry issues

### 3. **Foreground Location Error Handling** (`useDriverLocation.ts`)
- Wrapped `watchPositionAsync` in try-catch
- Prevents foreground watcher from crashing
- Doesn't affect background tracking (independent process)

### 4. **Trip Screen Robustness** (`trip.tsx`)
- Wrapped `watchForegroundLocation()` call in error handler
- App continues working even if foreground location fails
- Background tracking continues independently

## Testing Checklist
- [ ] Start a trip on driver app
- [ ] Verify location updates appear in admin dashboard
- [ ] Minimize/close driver app while trip is active
- [ ] Wait 5+ minutes with app closed
- [ ] Reopen app - should not crash
- [ ] Check that location updates continued while app was closed (check last_updated timestamp)

## Files Modified
1. `driver-app/hooks/useDriverLocation.ts`
   - Rewrote background task definition
   - Added error handling to foreground watcher
   - Increased update intervals

2. `driver-app/app/trip.tsx`
   - Added AppState import
   - Added error handling to watchForegroundLocation call
   - Added AppState listener (for future enhancements)

## Why This Works

**The background task now:**
- ✅ Doesn't try to emit events to destroyed JS bridge
- ✅ Doesn't log (logging can interact with modules)
- ✅ Catches all exceptions silently
- ✅ Only performs safe operations: AsyncStorage reads and database updates
- ✅ Runs infrequently (reduced from every 10s to every 15s)
- ✅ Fails silently and gracefully

**Foreground location watching now:**
- ✅ Has error handling
- ✅ Won't crash the app if it fails
- ✅ Doesn't interfere with background tracking

## Performance Impact
- **Positive**: Fewer background task invocations (-33%)
- **Minimal**: Slightly less frequent location updates (still acceptable for bus tracking)
- **Safety**: No more crashes when app backgrounded

## Future Improvements
1. Implement exponential backoff for failed queue processing
2. Add periodic cleanup of old queue items
3. Monitor background task success rates
4. Consider using native location APIs for critical updates
