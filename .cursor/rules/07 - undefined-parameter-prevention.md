# UNDEFINED PARAMETER PREVENTION RULE

## CORE PRINCIPLE: NEVER PASS UNDEFINED TO EXTERNAL SYSTEMS

**CRITICAL SAFETY RULE:** When interacting with external systems (Firebase, APIs, databases), NEVER pass `undefined` values. This prevents runtime errors and data corruption.

---

## MANDATORY PARAMETER HANDLING PROTOCOL

### 1. **Firebase/Firestore Interactions**
- **FORBIDDEN:** Passing `undefined` to any Firebase operation
- **REQUIRED:** Use `null` or omit the field entirely
- **Pattern:** `field: value ?? null` or `...(value && { field: value })`

### 2. **API Calls**
- **FORBIDDEN:** Including `undefined` in request payloads
- **REQUIRED:** Filter out undefined values before sending
- **Pattern:** `Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))`

### 3. **Database Operations**
- **FORBIDDEN:** Storing `undefined` in database fields
- **REQUIRED:** Convert to `null` or omit field
- **Pattern:** `field: value !== undefined ? value : null`

---

## IMPLEMENTATION EXAMPLES

### ✅ CORRECT PATTERNS

```typescript
// Firebase document update
const updateData = {
  name: user.name ?? null,
  email: user.email ?? null,
  ...(user.phone && { phone: user.phone })
};

// API request
const cleanPayload = Object.fromEntries(
  Object.entries(data).filter(([_, v]) => v !== undefined)
);

// Database insert
const record = {
  id: generateId(),
  title: data.title ?? null,
  description: data.description ?? null,
  ...(data.tags && { tags: data.tags })
};
```

### ❌ FORBIDDEN PATTERNS

```typescript
// NEVER do this
const badData = {
  name: user.name, // could be undefined
  email: user.email, // could be undefined
  phone: user.phone // could be undefined
};

// NEVER pass undefined to Firebase
await updateDoc(docRef, { field: undefinedValue });

// NEVER include undefined in API calls
const badPayload = { ...data }; // may contain undefined
```

---

## AUTOMATIC ENFORCEMENT

When writing code that interacts with external systems:

1. **Always check** for undefined values before external calls
2. **Convert undefined** to `null` or omit the field
3. **Use nullish coalescing** (`??`) operator
4. **Filter undefined** from objects before transmission
5. **Validate parameters** at function boundaries

This rule prevents runtime errors and ensures data integrity across all external system interactions.
