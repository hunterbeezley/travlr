# Code Review Guide

Complete guide for reviewing code in the Rally app.

## 🎯 Code Review Goals

1. **Correctness** - Code works as intended
2. **Security** - No vulnerabilities introduced
3. **Performance** - Efficient and optimized
4. **Readability** - Easy to understand and maintain
5. **Design** - Follows patterns and architecture
6. **Testing** - Adequate test coverage

## 🔄 Review Process

### For Automated Reviews

Every pull request triggers automated checks:
- ESLint analysis
- TypeScript type checking
- Code formatting (Prettier)
- Complexity analysis
- Duplicate code detection
- Security pattern checks
- Performance analysis
- Accessibility checks
- Bundle size analysis

**View Results:** GitHub Actions → Code Review workflow

### For Human Reviews

Use this checklist when reviewing PRs manually.

## ✅ Code Review Checklist

### 1. Correctness

- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error cases are handled gracefully
- [ ] No logical errors or bugs
- [ ] Functions return correct types
- [ ] Async operations handled properly
- [ ] No race conditions

**Questions to Ask:**
- Does this code solve the problem completely?
- What happens if inputs are null/undefined/empty?
- Are all error cases covered?

### 2. Security

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Input is validated and sanitized
- [ ] Authentication checks in place
- [ ] Authorization properly enforced
- [ ] No sensitive data exposed
- [ ] No hardcoded secrets/credentials
- [ ] File uploads validated (type, size)
- [ ] User data protected by RLS policies

**Red Flags:**
```typescript
// ❌ BAD: Direct HTML injection
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ❌ BAD: eval usage
eval(userInput)

// ❌ BAD: Hardcoded credentials
const API_KEY = "sk-12345..."

// ❌ BAD: No auth check
export default async function ProtectedPage() {
  // Anyone can access this!
}

// ✅ GOOD: Server-side auth check
export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // ...
}
```

### 3. Performance

- [ ] No unnecessary re-renders
- [ ] Components memoized when appropriate
- [ ] Large lists virtualized
- [ ] Images optimized (next/image)
- [ ] Lazy loading used where appropriate
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Expensive operations cached
- [ ] Bundle size impact acceptable

**Performance Patterns:**

```typescript
// ❌ BAD: Unoptimized component
export default function ExpensiveComponent({ data }) {
  const processed = expensiveOperation(data); // Runs on every render
  return <div>{processed}</div>;
}

// ✅ GOOD: Memoized expensive operation
export default function ExpensiveComponent({ data }) {
  const processed = useMemo(
    () => expensiveOperation(data),
    [data]
  );
  return <div>{processed}</div>;
}

// ❌ BAD: Missing keys in map
items.map(item => <Item name={item.name} />)

// ✅ GOOD: Proper keys
items.map(item => <Item key={item.id} name={item.name} />)

// ❌ BAD: Regular img tag
<img src={event.cover_image} />

// ✅ GOOD: Next.js Image optimization
<Image src={event.cover_image} width={400} height={300} alt="Event" />
```

### 4. Readability & Style

- [ ] Code is self-explanatory
- [ ] Meaningful variable/function names
- [ ] Consistent naming conventions
- [ ] Functions are small and focused
- [ ] Comments explain "why" not "what"
- [ ] No magic numbers/strings
- [ ] Proper indentation and formatting
- [ ] TypeScript types are descriptive

**Style Guidelines:**

```typescript
// ❌ BAD: Unclear names
const x = await f(u);
if (x.d) return x.d[0].n;

// ✅ GOOD: Clear names
const userProfile = await fetchProfile(userId);
if (userProfile.data) return userProfile.data[0].name;

// ❌ BAD: Magic numbers
if (users.length > 50) { /* ... */ }

// ✅ GOOD: Named constants
const MAX_USERS_PER_PAGE = 50;
if (users.length > MAX_USERS_PER_PAGE) { /* ... */ }

// ❌ BAD: Giant function
function handleSubmit() {
  // 200 lines of code
}

// ✅ GOOD: Broken into smaller functions
function handleSubmit() {
  const validatedData = validateForm();
  if (!validatedData) return;

  await saveToDatabase(validatedData);
  showSuccessMessage();
  redirectToDashboard();
}
```

### 5. Design & Architecture

- [ ] Follows existing patterns
- [ ] DRY - no code duplication
- [ ] Separation of concerns
- [ ] Components are reusable
- [ ] Proper abstraction level
- [ ] No tight coupling
- [ ] Follows SOLID principles

**Design Patterns:**

```typescript
// ❌ BAD: Duplicated logic
function EventCard1({ event }) {
  const date = new Date(event.date).toLocaleDateString();
  return <div>{date}</div>;
}

function EventCard2({ event }) {
  const date = new Date(event.date).toLocaleDateString();
  return <div>{date}</div>;
}

// ✅ GOOD: Shared utility
function formatEventDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function EventCard({ event }) {
  const date = formatEventDate(event.date);
  return <div>{date}</div>;
}

// ❌ BAD: Mixing concerns
function EventPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => setEvents(d));
  }, []);

  return <div>{/* render */}</div>;
}

// ✅ GOOD: Separated concerns
function useEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => setEvents(d));
  }, []);

  return events;
}

function EventPage() {
  const events = useEvents();
  return <div>{/* render */}</div>;
}
```

### 6. TypeScript Usage

- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper type definitions
- [ ] No type assertions without reason
- [ ] Interfaces/types are reusable
- [ ] Generic types where appropriate
- [ ] Proper null/undefined handling

**TypeScript Best Practices:**

```typescript
// ❌ BAD: Using any
function processData(data: any) {
  return data.items.map((item: any) => item.name);
}

// ✅ GOOD: Proper types
interface DataResponse {
  items: Array<{ id: string; name: string }>;
}

function processData(data: DataResponse) {
  return data.items.map(item => item.name);
}

// ❌ BAD: Unnecessary type assertion
const user = getCurrentUser() as User;

// ✅ GOOD: Type guard or optional chaining
const user = getCurrentUser();
if (!user) return;

// ❌ BAD: Not handling null
function greetUser(user: User | null) {
  return `Hello ${user.name}`; // Runtime error if null
}

// ✅ GOOD: Proper null handling
function greetUser(user: User | null) {
  return user ? `Hello ${user.name}` : "Hello Guest";
}
```

### 7. Error Handling

- [ ] Errors are caught and handled
- [ ] User-friendly error messages
- [ ] Errors logged appropriately
- [ ] No silent failures
- [ ] Try-catch in async functions
- [ ] Loading states shown
- [ ] Fallback UI for errors

**Error Handling Patterns:**

```typescript
// ❌ BAD: Silent failure
async function loadData() {
  const data = await fetch('/api/data');
  setData(data);
}

// ✅ GOOD: Proper error handling
async function loadData() {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to load data');

    const data = await response.json();
    setData(data);
  } catch (err) {
    console.error('Load data error:', err);
    setError(err.message || 'Failed to load data');
  } finally {
    setLoading(false);
  }
}

// ❌ BAD: Generic error message
catch (err) {
  setError("Error");
}

// ✅ GOOD: Helpful error message
catch (err) {
  setError("Failed to save event. Please check your internet connection and try again.");
}
```

### 8. Testing Considerations

- [ ] Code is testable
- [ ] No tight coupling to implementation
- [ ] Dependencies can be mocked
- [ ] Edge cases considered
- [ ] Test coverage adequate

### 9. Accessibility

- [ ] Images have alt text
- [ ] Buttons have proper types
- [ ] Form inputs have labels
- [ ] Keyboard navigation works
- [ ] ARIA attributes used correctly
- [ ] Color contrast sufficient
- [ ] Focus states visible

**Accessibility Checks:**

```typescript
// ❌ BAD: Missing alt text
<Image src={event.cover_image} width={400} height={300} />

// ✅ GOOD: Descriptive alt text
<Image
  src={event.cover_image}
  width={400}
  height={300}
  alt={`Cover image for ${event.title}`}
/>

// ❌ BAD: Button without type
<button onClick={handleClick}>Submit</button>

// ✅ GOOD: Explicit button type
<button type="button" onClick={handleClick}>Submit</button>

// ❌ BAD: Input without label
<input type="text" placeholder="Name" />

// ✅ GOOD: Input with label
<label htmlFor="name">Name</label>
<input type="text" id="name" placeholder="Name" />
```

### 10. Comments & Documentation

- [ ] Complex logic is commented
- [ ] Comments explain "why" not "what"
- [ ] Public APIs documented
- [ ] TODO comments have tickets/owners
- [ ] No commented-out code
- [ ] README updated if needed

**Comment Guidelines:**

```typescript
// ❌ BAD: Obvious comment
// Set the name to user name
const name = user.name;

// ✅ GOOD: Explains why
// Use display name for UI, falling back to username if not set
const name = user.displayName || user.username;

// ❌ BAD: Commented-out code
// const oldFunction = () => { /* ... */ }

// ✅ GOOD: Remove dead code (git history preserves it)

// ❌ BAD: Vague TODO
// TODO: fix this

// ✅ GOOD: Actionable TODO
// TODO(username): Implement rate limiting before production deploy (#123)
```

## 🚫 Common Code Smells

### Red Flags to Watch For

1. **Giant Functions** - Functions over 50 lines
2. **Deep Nesting** - More than 3 levels of indentation
3. **Long Parameter Lists** - More than 4 parameters
4. **Duplicate Code** - Same code in multiple places
5. **Magic Numbers** - Unexplained constants
6. **God Objects** - Classes/components doing too much
7. **Feature Envy** - Method using another class's data more than its own
8. **Primitive Obsession** - Using primitives instead of objects

### Code Complexity Thresholds

- **Cyclomatic Complexity:** Keep under 10 per function
- **Function Length:** Keep under 50 lines
- **File Length:** Keep under 400 lines
- **Parameters:** Keep under 4 per function

## 📊 Using Automated Reports

### ESLint Report
Check for code quality issues and style violations.

### Type Check Report
Ensure no TypeScript errors or unsafe type usage.

### Complexity Report
Identify overly complex functions that need refactoring.

### Duplicate Code Report
Find and eliminate code duplication.

### Bundle Size Report
Monitor impact on application bundle size.

## 🎯 Review Focus by Change Type

### New Feature
- [ ] Follows existing patterns
- [ ] Doesn't break existing features
- [ ] Has proper error handling
- [ ] Performance impact acceptable
- [ ] Security implications considered

### Bug Fix
- [ ] Fixes the root cause, not symptoms
- [ ] Doesn't introduce new bugs
- [ ] Has test case for the bug
- [ ] Edge cases considered

### Refactoring
- [ ] Behavior remains unchanged
- [ ] Code is cleaner/simpler
- [ ] No new features added
- [ ] Tests still pass

### Performance Optimization
- [ ] Measurable improvement
- [ ] Doesn't sacrifice readability
- [ ] No correctness issues
- [ ] Properly benchmarked

## 💬 Giving Feedback

### Good Feedback Principles

**Be Specific:**
- ❌ "This code is confusing"
- ✅ "The `processData` function does too many things. Consider splitting into `validateData`, `transformData`, and `saveData`"

**Be Constructive:**
- ❌ "This is wrong"
- ✅ "This approach could lead to memory leaks. Consider using `useEffect` cleanup: `return () => clearInterval(timer)`"

**Provide Examples:**
```typescript
// Instead of saying "use better variable names"
// Show a concrete example:

// Current:
const d = new Date(e.dt);

// Suggested:
const eventDate = new Date(event.dateTime);
```

**Prioritize Issues:**
- 🔴 **Blocker:** Must fix (security, crashes, data loss)
- 🟡 **Important:** Should fix (performance, correctness)
- 🔵 **Minor:** Nice to fix (style, readability)
- 💡 **Suggestion:** Consider for future

## 🛠️ Tools & Commands

### Run Code Review Locally

```bash
# Full code review
npm run code:review

# Quick checks
npm run lint
npm run type-check

# Format code
npm run format

# Check formatting
npm run format:check
```

### VS Code Extensions (Recommended)

- **ESLint** - Real-time linting
- **Prettier** - Code formatting
- **Error Lens** - Inline error display
- **SonarLint** - Code quality and security

## 📚 Resources

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Next.js Best Practices](https://nextjs.org/docs/pages/building-your-application/deploying/production-checklist)

## 🔄 Review Workflow

1. **Automated Check** - GitHub Actions runs automatically
2. **Self-Review** - Author reviews their own code first
3. **Peer Review** - Another developer reviews the code
4. **Address Feedback** - Author makes requested changes
5. **Re-review** - Reviewer checks changes
6. **Approve & Merge** - Code is merged to main

## ⏱️ Response Times

- **First Review:** Within 24 hours
- **Follow-up:** Within 4 hours
- **Urgent Fixes:** Within 2 hours

## 📈 Metrics to Track

- Time to first review
- Number of review iterations
- Code coverage trends
- Bug escape rate (bugs found after merge)
- Technical debt accumulation
