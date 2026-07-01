// Form validation helpers. Each returns an error string, or "" if valid.
// Use them in screens: const err = validateEmail(email); if (err) setError(err);

export function validateEmail(value) {
  if (!value || !value.trim()) return "Email is required.";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  return ok ? "" : "Enter a valid email address.";
}

export function validateRequired(value, label = "This field") {
  return value && value.trim() ? "" : `${label} is required.`;
}

export function validatePassword(value) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export function validateMatch(a, b, label = "Passwords") {
  return a === b ? "" : `${label} do not match.`;
}