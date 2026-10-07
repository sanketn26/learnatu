---
title: Code in lessons
minutes: 3
---

Fence code with the language name. Any language Shiki knows works.

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

```js title="app.js"
const total = [1, 2, 3].reduce((a, b) => a + b, 0);
console.log(total);
```

```bash
npm run course:validate
```

```sql
SELECT course, COUNT(*) FROM progress GROUP BY course;
```

```go
func main() { fmt.Println("hi") }
```

```text
Plain text, no highlighting.
```

## One snippet, several languages

Give consecutive blocks a `tab="…"` and they become tabs:

```python tab="Python"
print("Hello")
```

```js tab="JavaScript"
console.log("Hello");
```

```go tab="Go"
fmt.Println("Hello")
```
