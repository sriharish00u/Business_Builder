# TODO: Wizard UX Improvements

## 1. Keyboard Shortcuts
- [ ] Add global keydown event listener in script.js
- [ ] Implement Enter key: Save answer if in input, or confirm yes/no if focused
- [ ] Implement Esc/Backspace: Go back to previous question (actual navigation)
- [ ] Implement Tab: Navigate between buttons (yes, no, save, back) - enhance existing tab behavior

## 2. Auto-save Indicator
- [ ] Add toast show/hide functions in script.js
- [ ] Modify saveProgress() to show "Progress saved" toast for 2-3 seconds
- [ ] Add styles for .toast in styles.css

## 3. Answer Preview
- [ ] Change backBtn behavior to show answer preview without changing cursor/input
- [ ] Add function to populate preview list with previous answers
- [ ] Add way to close preview (click outside or close button)
- [ ] Add styles for .answer-preview in styles.css

## Testing
- [ ] Test keyboard navigation and shortcuts
- [ ] Verify toast appears on save and auto-dismisses
- [ ] Confirm preview shows previous answers without losing current input
