## 2024-05-29 - [Sales Terminal & Numpad ARIA labels]
**Learning:** Icon-only buttons (like Trash/Delete) and non-descriptive text buttons (like "C" for clear) in the sales and numpad components lacked ARIA labels. The Spanish localization of the app ("Eliminar jugada", "Limpiar") should be reflected in the aria-labels to maintain consistency.
**Action:** Always check for icon-only buttons (`Trash2`, `<Delete />`) and single-letter buttons (`C`) and ensure they have descriptive `aria-label`s.
