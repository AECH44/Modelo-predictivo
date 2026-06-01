from docx import Document
import os

filepath = r"E:\Projects\proyecto1\Reunión 28-04-2026 (1).docx"

if os.path.exists(filepath):
    doc = Document(filepath)
    for p in doc.paragraphs:
        print(p.text)
else:
    # Try to find the file
    import glob
    matches = glob.glob(r"E:\Projects\proyecto1\*28*.docx")
    print(f"Files matching *28*: {matches}")

    matches2 = glob.glob(r"E:\Projects\proyecto1\*\*28*.docx")
    print(f"Files matching **/*28*: {matches2}")