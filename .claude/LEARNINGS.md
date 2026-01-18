# Technische Learnings

## ReportLab PDF Generation

### Hex colors in Paragraphs
ReportLab Paragraph font tags vereisen het `#` prefix voor hex kleuren:
```python
# Correct
'<font color="#1e3a5f">Text</font>'

# Fout - geeft "Invalid color value" error
'<font color="1e3a5f">Text</font>'
```

### setFillAlpha voor transparantie
Canvas ondersteunt alpha transparantie met `setFillAlpha()`:
```python
canvas.saveState()
canvas.setFillAlpha(0.04)  # 4% opacity voor subtiele watermark
canvas.drawImage(path, x, y, ...)
canvas.restoreState()
```

### Page callbacks
`doc.build()` accepteert `onFirstPage` en `onLaterPages` callbacks voor headers/footers op elke pagina:
```python
doc.build(story, onFirstPage=callback, onLaterPages=callback)
```
