import pytesseract
from PIL import Image
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

img = Image.open("image.png")

# Get detailed data including bounding boxes for each word
data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

# Group words that are on the same vertical level (same bubble)
words = []
for i in range(len(data['text'])):
    if data['text'][i].strip():  # ignore empty results
        words.append({
            'text': data['text'][i],
            'left': data['left'][i],
            'top': data['top'][i],
            'width': data['width'][i],
            'height': data['height'][i],
        })

words.sort(key=lambda w: (w['top'], w['left']))

tags = []
current_tag_words = [words[0]]

for word in words[1:]:
    prev = current_tag_words[-1]
    # If this word is on roughly the same vertical line, group it
    if abs(word['top'] - prev['top']) < 20:
        current_tag_words.append(word)
    else:
        tags.append(' '.join(w['text'] for w in current_tag_words))
        current_tag_words = [word]

tags.append(' '.join(w['text'] for w in current_tag_words))  # last tag

print(tags)